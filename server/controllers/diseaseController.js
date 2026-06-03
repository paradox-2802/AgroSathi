/**
 * Disease Detection Controller
 * Handles plant disease detection chats and image analysis
 */

import fs from "fs";
import DiseaseDetection from "../models/DiseaseDetection.js";
import { detectDisease } from "../services/visionService.js";
import { setSSEHeaders, sendError } from "../utils/response.js";

export const createDiseaseChat = async (req, res) => {
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
};

export const listDiseaseChats = async (req, res) => {
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
};

export const getDiseaseHistory = async (req, res) => {
    try {
        const chat = await DiseaseDetection.findOne({
            chatId: req.params.chatId,
            userId: req.user?.id,
        });
        res.json(chat || { messages: [] });
    } catch {
        res.status(500).json({ error: "History failed" });
    }
};

export const deleteDiseaseChat = async (req, res) => {
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
};

export const handleDiseaseDetection = async (req, res) => {
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
            imageDescription: message,
        });
        await chat.save();

        setSSEHeaders(res);

        const fullAnswer = await detectDisease(imagePath, message, language);

        res.write(`data: ${JSON.stringify({ content: fullAnswer })}\n\n`);

        chat.messages.push({
            role: "assistant",
            content: fullAnswer,
        });
        await chat.save();

        res.write(`data: ${JSON.stringify({ title: chat.title, done: true })}\n\n`);
        res.end();
    } catch {
        sendError(res, 500, "Disease detection failed");
    }
};
