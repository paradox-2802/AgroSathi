import mongoose from "mongoose";

const noticeSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    summary: {
        type: String,
        required: true,
    },
    source_name: {
        type: String, // e.g., "The Hindu", "Krishi Jagran"
        required: true,
    },
    source_type: {
        type: String, // "GOVERNMENT" or "AGRI_NEWS"
        enum: ["GOVERNMENT", "AGRI_NEWS"],
        default: "AGRI_NEWS",
    },
    published_date: {
        type: Date,
        default: Date.now,
    },
    article_url: {
        type: String,
        required: true,
    },
    content_hash: {
        type: String,
        unique: true, // For deduplication
    },
});

export default mongoose.model("Notice", noticeSchema);
