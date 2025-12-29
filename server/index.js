import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import multer from "multer";
import { Queue } from "bullmq";
import OpenAI from "openai";

import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { QdrantVectorStore } from "@langchain/qdrant";

import Chat from "./models/Chat.js";
import authRoutes from "./routes/auth.js";
import { authMiddleware } from "./middleware/auth.js";

const app = express();
app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(() => process.exit(1));

app.use("/auth", authRoutes);

const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({ storage });

const queue = new Queue("file-upload-queue", {
  connection: {
    host: process.env.REDIS_HOST || "localhost",
    port: Number(process.env.REDIS_PORT || 6379),
  },
});

const llm = new OpenAI({
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
  const res = await llm.chat.completions.create({
    model: "provider-8/gemini-2.0-flash",
    messages: [
      {
        role: "user",
        content: `Conversation:\n${history}\n\nFollow-up:\n${question}\n\nRewrite as standalone agriculture question.`,
      },
    ],
    temperature: 0,
    max_tokens: 80,
  });
  return res.choices[0].message.content.trim();
}

app.post("/chat/create", authMiddleware, async (req, res) => {
  const { chatId } = req.body;
  const userId = req.user.id;
  const chat = await Chat.create({ chatId, userId, messages: [] });
  res.json(chat);
});

app.delete("/chat/:chatId", authMiddleware, async (req, res) => {
  await Chat.deleteOne({
    chatId: req.params.chatId,
    userId: req.user.id,
  });
  res.json({ success: true });
});

app.get("/chat/history/:chatId", authMiddleware, async (req, res) => {
  const chat = await Chat.findOne({
    chatId: req.params.chatId,
    userId: req.user.id,
  });
  if (!chat) return res.status(404).json({});
  res.json(chat);
});

app.post("/chat", authMiddleware, async (req, res) => {
  const { message, chatId } = req.body;
  const userId = req.user.id;

  const chat = await Chat.findOne({ chatId, userId });
  if (!chat) return res.status(404).json({ error: "Chat not found" });

  chat.messages.push({ role: "user", content: message });
  await chat.save();

  const history = chat.messages
    .slice(-6)
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  let query = message;
  if (message.split(" ").length < 6) {
    query = await rewriteQuestion(message, history);
  }

  const docs = await retriever.invoke(query);

  if (!docs.length) {
    const fallback = "I don't know based on the provided documents.";
    chat.messages.push({ role: "assistant", content: fallback });
    await chat.save();
    return res.json({ message: fallback });
  }

  const context = docs.map((d) => d.pageContent).join("\n\n");

  const ai = await llm.chat.completions.create({
    model: "provider-8/gemini-2.0-flash",
    messages: [
      {
        role: "system",
        content: `Answer ONLY from context:\n${context}`,
      },
      { role: "user", content: message },
    ],
    temperature: 0.3,
    max_tokens: 500,
  });

  const answer = ai.choices[0].message.content;

  chat.messages.push({ role: "assistant", content: answer });
  await chat.save();

  res.json({ message: answer });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
