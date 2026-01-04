import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import multer from "multer";
import { Queue } from "bullmq";
import jwt from "jsonwebtoken";
import { HfInference } from "@huggingface/inference";

import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { QdrantVectorStore } from "@langchain/qdrant";

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import Chat from "./models/Chat.js";
import DiseaseDetection from "./models/DiseaseDetection.js";
import authRoutes from "./routes/auth.js";
import { authMiddleware } from "./middleware/auth.js";
import { adminMiddleware } from "./middleware/auth.js";

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI).catch(() => process.exit(1));

app.use("/auth", authRoutes);
app.get("/", (_, res) => res.json({ status: "OK" }));


app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const imageUploadDir = "uploads/images";
if (!fs.existsSync(imageUploadDir)) fs.mkdirSync(imageUploadDir, { recursive: true });

const pdfStorage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const pdfUpload = multer({
  storage: pdfStorage,
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      cb(new Error("Only PDF files allowed"));
    } else {
      cb(null, true);
    }
  },
});

const imageStorage = multer.diskStorage({
  destination: (_, __, cb) => {
    const dir = "uploads/images";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const imageUpload = multer({
  storage: imageStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedMimes.includes(file.mimetype)) {
      cb(new Error("Only JPEG, PNG, and WebP images allowed"));
    } else {
      cb(null, true);
    }
  },
});

const queue = new Queue("file-upload-queue", {
  connection: {
    host: process.env.REDIS_HOST || "localhost",
    port: Number(process.env.REDIS_PORT || 6379),
  },
});

const hfClient = new HfInference(process.env.HUGGINGFACE_API_KEY);

const embeddings = new HuggingFaceInferenceEmbeddings({
  apiKey: process.env.HUGGINGFACE_API_KEY,
  model: "sentence-transformers/all-MiniLM-L6-v2",
});

let vectorStore;
try {
  vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
    url: process.env.QDRANT_URL || "http://localhost:6333",
    collectionName: "langchainjs-testing",
  });
} catch (error) {
  vectorStore = new QdrantVectorStore(embeddings, {
    url: process.env.QDRANT_URL || "http://localhost:6333",
    collectionName: "langchainjs-testing",
  });
}

const retriever = vectorStore.asRetriever({ k: 4 });

async function rewriteQuestion(question, history) {
  const prompt = `
You rewrite follow-up questions into standalone agriculture questions.

Conversation:
${history}

Follow-up question:
${question}

Rewrite it as a complete standalone question.
- Mention crop explicitly
- Mention topic (fertilizer, pest, irrigation, etc)
- Do NOT answer
`;

  const res = await hfClient.chatCompletion({
    model: "meta-llama/Meta-Llama-3.1-8B-Instruct",
    messages: [{ role: "user", content: prompt }],
    temperature: 0,
    max_tokens: 80,
  });

  return res.choices[0].message.content.trim();
}

async function translateToEnglish(text) {
  try {
    const res = await fetch(`${process.env.LIBRETRANSLATE_URL || "http://localhost:5000"}/translate`, {
      method: "POST",
      body: JSON.stringify({
        q: text,
        source: "auto",
        target: "en",
        format: "text",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const data = await res.json();
    return data.translatedText || text;
  } catch (error) {
    return text;
  }
}


async function translateFromEnglish(text, targetLang) {
  if (!targetLang || targetLang === "English") return text;

  const langMap = {
    "Hindi": "hi",
    "Bengali": "bn",
    "Tamil": "ta",
    "Telugu": "te",
    "Marathi": "mr",
    "Kannada": "kn",
    "Malayalam": "ml",
    "Gujarati": "gu",
    "Punjabi": "pa",
    "Urdu": "ur"
  };

  const target = langMap[targetLang];
  if (!target) return text;

  try {
    const res = await fetch(`${process.env.LIBRETRANSLATE_URL || "http://localhost:5000"}/translate`, {
      method: "POST",
      body: JSON.stringify({
        q: text,
        source: "en",
        target: target,
        format: "text",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const data = await res.json();
    return data.translatedText || text;
  } catch (error) {
    return text;
  }
}

async function detectDisease(imagePath, message, language) {
  try {
    const imageBuffer = fs.readFileSync(imagePath);


    let prompt = `You are an expert plant pathologist and agriculture assistant. Analyze the image and user description to identify any diseases or issues. Provide:
1. Disease identification (if any)
2. Severity level
3. Treatment recommendations
4. Prevention measures

User query: ${message}`;

    if (language && language !== "English") {
      prompt += `\n\nRespond ONLY in ${language}.`;
    }


    const response = await hfClient.chatCompletion({
      model: "Qwen/Qwen2.5-VL-7B-Instruct",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBuffer.toString('base64')}`
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
    });

    return response.choices[0]?.message?.content || "Unable to analyze the image.";
  } catch (error) {
    console.error("Disease detection error:", error);
    throw error;
  }
}

app.post("/admin/login", (req, res) => {
  const { username, password } = req.body;

  if (
    username !== process.env.ADMIN_USERNAME ||
    password !== process.env.ADMIN_PASSWORD
  ) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign({ role: "admin" }, process.env.ADMIN_JWT_SECRET, {
    expiresIn: "12h",
  });

  res.json({ token });
});

app.post(
  "/upload/pdf",
  adminMiddleware,
  pdfUpload.single("pdf"),
  async (req, res) => {
    try {

      await queue.add("file-ready", {
        filename: req.file.originalname,
        path: req.file.path,
      });

      res.json({ message: "PDF uploaded" });
    } catch {
      res.status(500).json({ error: "Upload failed" });
    }
  }
);

app.post("/chat/create", authMiddleware, async (req, res) => {
  try {
    const { chatId, title } = req.body;
    const userId = req.user?.id;

    if (!chatId || !userId) {
      return res.status(400).json({ error: "Invalid request" });
    }

    const chat = await Chat.create({
      chatId,
      userId,
      title: title || "New Chat",
      messages: [],
    });

    res.json(chat);
  } catch {
    res.status(500).json({ error: "Failed to create chat" });
  }
});

app.delete("/chat/:chatId", authMiddleware, async (req, res) => {
  try {
    const result = await Chat.deleteOne({
      chatId: req.params.chatId,
      userId: req.user?.id,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: "Chat not found" });
    }

    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete chat" });
  }
});

app.get("/chat/list", authMiddleware, async (req, res) => {
  try {
    const [normalChats, diseaseChats] = await Promise.all([
      Chat.find(
        { userId: req.user?.id },
        { chatId: 1, title: 1, updatedAt: 1 }
      ).lean(),
      DiseaseDetection.find(
        { userId: req.user?.id },
        { chatId: 1, title: 1, updatedAt: 1 }
      ).lean()
    ]);

    const allChats = [
      ...normalChats.map(c => ({
        id: c.chatId,
        title: c.title || "New Chat",
        updatedAt: c.updatedAt,
        type: "normal"
      })),
      ...diseaseChats.map(c => ({
        id: c.chatId,
        title: c.title || "New Diagnosis",
        updatedAt: c.updatedAt,
        type: "disease"
      }))
    ].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    res.json(allChats);
  } catch {
    res.status(500).json({ error: "Failed to fetch chat list" });
  }
});

app.get("/chat/history/:chatId", authMiddleware, async (req, res) => {
  try {
    const chat = await Chat.findOne({
      chatId: req.params.chatId,
      userId: req.user?.id,
    });
    res.json(chat || { messages: [] });
  } catch {
    res.status(500).json({ error: "History failed" });
  }
});



app.post("/chat/disease/create", authMiddleware, async (req, res) => {
  try {
    const { chatId, title } = req.body;
    const userId = req.user?.id;

    if (!chatId || !userId) {
      return res.status(400).json({ error: "Invalid request" });
    }

    const chat = await DiseaseDetection.create({
      chatId,
      userId,
      title: title || "New Diagnosis",
      messages: [],
    });

    res.json(chat);
  } catch {
    res.status(500).json({ error: "Failed to create disease detection chat" });
  }
});

app.get("/chat/disease/list", authMiddleware, async (req, res) => {
  try {
    const chats = await DiseaseDetection.find(
      { userId: req.user?.id },
      { chatId: 1, title: 1, updatedAt: 1 }
    )
      .sort({ updatedAt: -1 })
      .lean();

    res.json(
      chats.map((c) => ({
        id: c.chatId,
        title: c.title || "New Diagnosis",
      }))
    );
  } catch {
    res.status(500).json({ error: "Failed to fetch disease list" });
  }
});

app.get("/chat/disease/history/:chatId", authMiddleware, async (req, res) => {
  try {
    const chat = await DiseaseDetection.findOne({
      chatId: req.params.chatId,
      userId: req.user?.id,
    });
    res.json(chat || { messages: [] });
  } catch {
    res.status(500).json({ error: "History failed" });
  }
});

app.delete("/chat/disease/:chatId", authMiddleware, async (req, res) => {
  try {
    const result = await DiseaseDetection.deleteOne({
      chatId: req.params.chatId,
      userId: req.user?.id,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: "Chat not found" });
    }

    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete chat" });
  }
});

app.post("/chat/disease-detect", authMiddleware, imageUpload.single("image"), async (req, res) => {
  try {
    const { message, chatId, language } = req.body;
    const userId = req.user?.id;
    const imagePath = req.file?.path;

    if (!message || !chatId || !userId || !imagePath) {

      if (imagePath && fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
      return res.status(400).json({ error: "Invalid request. Image and message are required." });
    }

    let chat = await DiseaseDetection.findOne({ chatId, userId });
    if (!chat) {
      if (imagePath && fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
      return res.status(404).json({ error: "Chat not found" });
    }

    if (chat.messages.length === 0 || chat.title === "New Diagnosis") {
      chat.title = message.length > 50 ? message.substring(0, 50) + "..." : message;
    }


    const imageUrl = `/uploads/images/${req.file.filename}`;

    chat.messages.push({
      role: "user",
      content: message,
      hasImage: true,
      imagePath: imageUrl,
      imageDescription: message
    });
    await chat.save();


    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");


    const fullAnswer = await detectDisease(imagePath, message, language);


    res.write(`data: ${JSON.stringify({ content: fullAnswer })}\n\n`);


    chat.messages.push({
      role: "assistant",
      content: fullAnswer,
    });
    await chat.save();

    res.write(
      `data: ${JSON.stringify({ title: chat.title, done: true })}\n\n`
    );
    res.end();

  } catch (error) {
    console.error("Disease detection failed:", error);

    if (!res.headersSent) {
      res.status(500).json({ error: "Disease detection failed" });
    } else {
      res.end();
    }
  }
});

app.post("/chat", authMiddleware, async (req, res) => {
  try {
    const { message, chatId, language } = req.body;
    const userId = req.user?.id;

    if (!message || !chatId || !userId) {
      return res.status(400).json({ error: "Invalid request" });
    }

    let chat = await Chat.findOne({ chatId, userId });
    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    if (chat.messages.length === 0 || chat.title === "New Chat") {
      chat.title =
        message.length > 50 ? message.substring(0, 50) + "..." : message;
    }

    chat.messages.push({ role: "user", content: message });
    await chat.save();

    const history = chat.messages
      .slice(-6)
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");

    let retrievalQuery = message;
    if (language && language !== "English") {
      try {
        retrievalQuery = await translateToEnglish(message);
      } catch {
        retrievalQuery = message;
      }
    }

    if (message.split(" ").length < 6) {
      try {
        retrievalQuery = await rewriteQuestion(message, history);
      } catch {
        retrievalQuery = message;
      }
    }

    const docs = await retriever.invoke(retrievalQuery);

    if (!docs.length) {
      let fallback = "I don't know based on the provided documents.";
      if (language && language !== "English") {
        fallback = await translateFromEnglish(fallback, language);
      }
      chat.messages.push({ role: "assistant", content: fallback });
      await chat.save();

      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      res.write(`data: ${JSON.stringify({ content: fallback })}\n\n`);
      res.write(
        `data: ${JSON.stringify({
          sources: [],
          title: chat.title,
          done: true,
        })}\n\n`
      );
      return res.end();
    }

    const context = docs
      .map((d, i) => `Source ${i + 1}:\n${d.pageContent}`)
      .join("\n\n");

    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = hfClient.chatCompletionStream({
      model: "Qwen/Qwen2.5-72B-Instruct",
      messages: [
        {
          role: "system",
          content: `You are KisanAI, an expert agricultural assistant helping farmers with evidence-based advice.

INSTRUCTIONS:
1. Answer ONLY using information from the Context below - never make up information
2. If the answer is not in the Context, respond: "I don't have information about this in my knowledge base. Please consult a local agricultural expert."
3. Provide practical, actionable advice in simple language
4. Structure your response clearly with:
   - Direct answer to the question
   - Step-by-step instructions when applicable
   - Specific quantities, timings, or measurements when available
   - Warnings or precautions if relevant
5. Reply in ${language || "English"}. Do NOT mix languages or output English if a different language is requested.

Context:
${context}`,
        },
        { role: "user", content: message },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    let fullAnswer = "";

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        fullAnswer += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    const sources = docs.map((d) => ({
      preview: d.pageContent.slice(0, 200),
      metadata: d.metadata,
    }));

    chat.messages.push({
      role: "assistant",
      content: fullAnswer || "I don't know based on the provided documents.",
      sources,
    });

    await chat.save();

    res.write(
      `data: ${JSON.stringify({ sources, title: chat.title, done: true })}\n\n`
    );
    res.end();
  } catch (error) {
    console.error("[Backend] Chat Error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Chat failed" });
    } else {
      res.end();
    }
  }
});

app.post(
  "/chat/image",
  authMiddleware,
  imageUpload.single("image"),
  async (req, res) => {
    try {
      const { chatId, message, language } = req.body;
      const userId = req.user?.id;

      if (!req.file || !chatId || !userId) {
        return res.status(400).json({ error: "Invalid request" });
      }

      let chat = await Chat.findOne({ chatId, userId });
      if (!chat) {
        return res.status(404).json({ error: "Chat not found" });
      }

      const imageUrl = `/uploads/images/${req.file.filename}`;

      if (chat.messages.length === 0 || chat.title === "New Chat") {
        chat.title = message || "Disease Detection";
      }

      chat.messages.push({
        role: "user",
        content: message || "What disease is this?",
        imageUrl,
      });
      await chat.save();

      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const prompt = `You are an expert agricultural disease detection assistant.
Analyze this plant/crop image and provide:
1. Disease identification (if any)
2. Severity level
3. Treatment recommendations
4. Prevention measures

Reply in ${language || "English"}. Be specific and practical.

User question: ${message || "What disease is this?"}`;

      const stream = hfClient.chatCompletionStream({
        model: "Qwen/Qwen2.5-72B-Instruct",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 600,
      });

      let fullAnswer = "";

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullAnswer += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      if (language && language !== "English") {
        try {
          fullAnswer = await translateFromEnglish(fullAnswer, language);
        } catch (error) {

        }
      }

      chat.messages.push({
        role: "assistant",
        content: fullAnswer || "Unable to analyze the image.",
        imageAnalysis: fullAnswer,
      });

      await chat.save();

      res.write(
        `data: ${JSON.stringify({
          imageUrl,
          title: chat.title,
          done: true,
        })}\n\n`
      );
      res.end();
    } catch (error) {
      res.status(500).json({ error: "Image analysis failed" });
    }
  }
);

app.get("/uploads/images/:filename", (req, res) => {
  const { filename } = req.params;
  const filepath = `${imageUploadDir}/${filename}`;

  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: "Image not found" });
  }

  res.sendFile(filepath, { root: "." });
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "File too large. Max size is 10MB for images, 200MB for PDFs." });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

const PORT = process.env.PORT || 8000;
app.listen(PORT);
