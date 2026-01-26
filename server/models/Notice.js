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
        type: String,
        required: true,
    },
    source_type: {
        type: String,
        enum: ["GOVERNMENT", "AGRI_NEWS"],
        required: true,
    },
    published_date: {
        type: Date,
        required: true,
    },
    article_url: {
        type: String,
        required: true,
    },
    content_hash: {
        type: String,
        required: true,
        unique: true,
    },
    created_at: {
        type: Date,
        default: Date.now,
    },
});

// Index for efficient sorting and querying
noticeSchema.index({ published_date: -1 });

export default mongoose.model("Notice", noticeSchema);
