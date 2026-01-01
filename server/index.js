import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import multer from "multer";
import { Queue } from "bullmq";
import OpenAI from "openai";
import jwt from "jsonwebtoken";

import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { QdrantVectorStore } from "@langchain/qdrant";

import Chat from "./models/Chat.js";
import authRoutes from "./routes/auth.js";
import { authMiddleware } from "./middleware/auth.js";
import { adminMiddleware } from "./middleware/auth.js";

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI).catch(() => process.exit(1));

app.use("/auth", authRoutes);
app.get("/", (_, res) => res.json({ status: "OK" }));

const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      cb(new Error("Only PDF files allowed"));
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

const a4fClient = new OpenAI({
  apiKey: process.env.A4F_API_KEY,
  baseURL: "https://api.a4f.co/v1",
});

const embeddings = new HuggingFaceInferenceEmbeddings({
  apiKey: process.env.HUGGINGFACE_API_KEY,
  model: "sentence-transformers/all-MiniLM-L6-v2",
});

const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
  url: process.env.QDRANT_URL || "http://localhost:6333",
  collectionName: "langchainjs-testing",
});

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

  const res = await a4fClient.chat.completions.create({
    model: "provider-6/llama-3.1-8b-instant",
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
  upload.single("pdf"),
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
    const chats = await Chat.find(
      { userId: req.user?.id },
      { chatId: 1, title: 1, updatedAt: 1 }
    )
      .sort({ updatedAt: -1 })
      .lean();

    res.json(
      chats.map((c) => ({
        id: c.chatId,
        title: c.title || "New Chat",
      }))
    );
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

    const stream = await a4fClient.chat.completions.create({
      model: "provider-5/gemma-3-27b-it-fast",
      messages: [
        {
          role: "system",
          content: `You are an Agriculture Assistant.
Answer ONLY from the context below.
If not found, simply state that you don't know based on the provided documents in ${language || "English"}.

Reply in ${language || "English"}. Do NOT output English if the target language is different.

Context:
${context}`,
        },
        { role: "user", content: message },
      ],
      temperature: 0.3,
      max_tokens: 500,
      stream: true,
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
  } catch {
    res.status(500).json({ error: "Chat failed" });
  }
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "PDF too large. Max size is 200MB." });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

const PORT = process.env.PORT || 8000;
app.listen(PORT);
