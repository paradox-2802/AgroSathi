export const detectLanguage = (text) => {
    if (!text) return "en-IN";

    const ranges = {
        "hi-IN": /[\u0900-\u097F]/,
        "bn-IN": /[\u0980-\u09FF]/,
        "pa-IN": /[\u0A00-\u0A7F]/,
        "gu-IN": /[\u0A80-\u0AFF]/,
        "ta-IN": /[\u0B80-\u0BFF]/,
        "te-IN": /[\u0C00-\u0C7F]/,
        "kn-IN": /[\u0C80-\u0CFF]/,
        "ml-IN": /[\u0D00-\u0D7F]/,
    };

    for (const [lang, regex] of Object.entries(ranges)) {
        if (regex.test(text)) {
            return lang;
        }
    }

    return "en-IN";
};

export const stopSpeaking = () => {
    if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
    }
};

export const cleanText = (text) => {
    if (!text) return "";
    return text
        .replace(/\*/g, "")
        .replace(/#/g, "")
        .replace(/`/g, "")
        .replace(/\[.*?\]/g, "")
        .replace(/\[(.*?)\]\(.*?\)/g, "$1")
        .trim();
};

export const speak = (text, onEnd) => {
    if (!("speechSynthesis" in window)) {
        return;
    }

    stopSpeaking();

    if (!text) return;

    const cleanedText = cleanText(text);
    const lang = detectLanguage(cleanedText);
    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utterance.lang = lang;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
        (v) => v.lang === lang && (v.name.includes("Google") || v.name.includes("Microsoft"))
    ) || voices.find((v) => v.lang === lang);

    if (preferredVoice) {
        utterance.voice = preferredVoice;
    }

    utterance.onend = () => {
        if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
        if (onEnd) onEnd();
    };

    window.speechSynthesis.speak(utterance);
};
