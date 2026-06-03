/**
 * AI Configuration
 * Sets up Hugging Face embeddings, Qdrant vector store, and Gemini client
 */

import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { QdrantVectorStore } from "@langchain/qdrant";
import { HfInference } from "@huggingface/inference";
import { GoogleGenAI } from "@google/genai";

export const hfClient = new HfInference(process.env.HUGGINGFACE_API_KEY);

export const geminiClient = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

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

export { vectorStore };
export const retriever = vectorStore.asRetriever({ k: 4 });
