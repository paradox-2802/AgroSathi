/**
 * Translation Service
 * Provides text translation using LibreTranslate API
 * Supports automatic language detection and Indian regional languages
 */

/**
 * Translates text from any language to English
 * Uses auto-detection for source language
 * @param {string} text - Text to translate
 * @returns {Promise<string>} Translated English text or original on error
 */
export async function translateToEnglish(text) {
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
    } catch {
        return text;
    }
}

/**
 * Translates English text to specified Indian regional language
 * Maps language names to ISO codes (e.g., "Hindi" -> "hi")
 * @param {string} text - English text to translate
 * @param {string} targetLang - Target language name (e.g., "Hindi", "Tamil")
 * @returns {Promise<string>} Translated text or original if language not supported
 */
export async function translateFromEnglish(text, targetLang) {
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
    } catch {
        return text;
    }
}
