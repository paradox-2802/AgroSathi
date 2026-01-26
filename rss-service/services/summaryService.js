import { hfClient } from "../config/ai.js";

/**
 * Generates a concise, farmer-friendly summary using Qwen 2.5.
 * @param {string} title - Article title.
 * @param {string} content - Article content/snippet.
 * @returns {Promise<string>} Generated summary.
 */
export async function summarizeText(title, content) {
    const prompt = `
You are an agricultural assistant. Summarize the following news/scheme for a farmer.
Keep it factual, concise, and in English. Do not add information. Do not hallucinate.

Title: ${title}
Content: ${content}

Summary (focused on benefits/impact for farmers):
`;

    try {
        const response = await hfClient.chatCompletion({
            model: "Qwen/Qwen2.5-72B-Instruct",
            messages: [
                { role: "system", content: "You are a helpful agricultural assistant. Output only the summary." },
                { role: "user", content: prompt },
            ],
            temperature: 0.3,
            max_tokens: 150,
        });

        return response.choices[0].message.content.trim();
    } catch (error) {
        console.error("Error generating summary:", error);
        return "Summary unavailable.";
    }
}
