import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import { Worker } from "bullmq";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { QdrantVectorStore } from "@langchain/qdrant";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const REDIS_CONNECTION = {
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT || 6379),
};

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
} catch {
  vectorStore = new QdrantVectorStore(embeddings, {
    url: process.env.QDRANT_URL || "http://localhost:6333",
    collectionName: "langchainjs-testing",
  });
}

const fileWorker = new Worker(
  "file-upload-queue",
  async (job) => {
    const { path, filename, userId } = job.data || {};
    if (!path || !fs.existsSync(path)) throw new Error("Invalid or missing PDF path");

    const fileBuffer = fs.readFileSync(path);
    const loader = new PDFLoader(new Blob([fileBuffer]), { splitPages: true });
    const docs = await loader.load();

    const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
    const splitDocs = await splitter.splitDocuments(docs);

    const enrichedDocs = splitDocs.map((doc) => ({
      ...doc,
      metadata: {
        ...doc.metadata,
        filename: filename || "unknown.pdf",
        userId: userId || "public",
        source: "pdf",
      },
    }));

    const batchSize = 50;
    try {
      for (let i = 0; i < enrichedDocs.length; i += batchSize) {
        await vectorStore.addDocuments(enrichedDocs.slice(i, i + batchSize));
      }
    } catch (e) {
      console.error(`[Worker] Qdrant Error:`, e);
      throw e;
    }

    try { fs.unlinkSync(path); } catch { }
    return { chunks: enrichedDocs.length, filename };
  },
  { concurrency: 2, connection: REDIS_CONNECTION }
);

process.on("SIGINT", async () => {
  await fileWorker.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await fileWorker.close();
  process.exit(0);
});
