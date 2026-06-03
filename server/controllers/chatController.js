/**
 * Chat Controller
 * Handles main chat sessions with RAG (Retrieval-Augmented Generation)
 */

import Chat from "../models/Chat.js";
import DiseaseDetection from "../models/DiseaseDetection.js";
import { retriever, hfClient } from "../config/ai.js";
import { translateToEnglish, translateFromEnglish } from "../services/translationService.js";
import { rewriteQuestion } from "../services/aiService.js";
import { setSSEHeaders, sendError } from "../utils/response.js";

export const createChat = async (req, res) => {
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
};

export const deleteChat = async (req, res) => {
    try {
        let result = await Chat.deleteOne({
            chatId: req.params.chatId,
            userId: req.user?.id,
        });

        if (result.deletedCount === 0) {
            result = await DiseaseDetection.deleteOne({
                chatId: req.params.chatId,
                userId: req.user?.id,
            });
        }

        if (result.deletedCount === 0) {
            return res.status(404).json({ success: false, error: "Chat not found" });
        }

        res.json({ success: true });
    } catch {
        res.status(500).json({ success: false, error: "Failed to delete chat" });
    }
};

export const listChats = async (req, res) => {
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
};

export const getChatHistory = async (req, res) => {
    try {
        const chat = await Chat.findOne({
            chatId: req.params.chatId,
            userId: req.user?.id,
        });
        res.json(chat || { messages: [] });
    } catch {
        res.status(500).json({ error: "History failed" });
    }
};

export const handleChat = async (req, res) => {
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

            setSSEHeaders(res);

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

        setSSEHeaders(res);

        const stream = hfClient.chatCompletionStream({
            model: "Qwen/Qwen2.5-72B-Instruct",
            messages: [
                {
                    role: "system",
                    content: `You are Bhoomi, an expert agricultural assistant helping farmers with evidence-based advice.

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
        sendError(res, 500, "Chat failed");
    }
};
