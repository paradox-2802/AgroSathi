/**
 * Vision Service
 * Provides plant disease detection using Gemini 2.5 Flash
 */

import fs from "fs";
import { geminiClient } from "../config/ai.js";

/**
 * Helper function to determine MIME type from file path
 * @param {string} filePath
 * @returns {string} MIME type
 */
function getMimeType(filePath) {
    const ext = filePath.split('.').pop().toLowerCase();
    switch (ext) {
        case 'png':
            return 'image/png';
        case 'gif':
            return 'image/gif';
        case 'webp':
            return 'image/webp';
        case 'jpg':
        case 'jpeg':
        default:
            return 'image/jpeg';
    }
}

/**
 * Analyzes plant image to detect diseases and provide recommendations
 * Uses Google Gemini 2.5 Flash with base64-encoded image
 * @param {string} imagePath - Path to the uploaded plant image
 * @param {string} message - User's description or question about the plant
 * @param {string} language - Target language for the response
 * @returns {Promise<string>} Disease analysis and treatment recommendations
 * @throws {Error} If image reading or model inference fails
 */
export async function detectDisease(imagePath, message, language) {
    const imageBuffer = fs.readFileSync(imagePath);
    const mimeType = getMimeType(imagePath);

    let prompt = `You are an expert plant pathologist and agriculture assistant. Analyze the image and user description to identify any diseases or issues. Provide:
1. Disease identification (if any)
2. Severity level
3. Treatment recommendations
4. Prevention measures

User query: ${message}`;

    if (language && language !== "English") {
        prompt += `\n\nRespond ONLY in ${language}.`;
    }

    const response = await geminiClient.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
            {
                role: 'user',
                parts: [
                    { text: prompt },
                    {
                        inlineData: {
                            mimeType: mimeType,
                            data: imageBuffer.toString('base64')
                        }
                    }
                ]
            }
        ]
    });

    return response.text || "Unable to analyze the image.";
}
