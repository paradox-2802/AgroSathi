/**
 * Upload Controller
 * Handles PDF file uploads and queue processing
 */

import { uploadQueue } from "../config/queue.js";

export const uploadPDF = async (req, res) => {
    try {
        await uploadQueue.add("file-ready", {
            filename: req.file.originalname,
            path: req.file.path,
        });

        res.json({ message: "PDF uploaded" });
    } catch {
        res.status(500).json({ error: "Upload failed" });
    }
};
