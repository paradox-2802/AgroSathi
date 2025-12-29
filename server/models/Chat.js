import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
  },
  { timestamps: true }
);

const ChatSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    chatId: { type: String, required: true },
    title: { type: String, default: "New Chat" },
    messages: { type: [MessageSchema], default: [] },
  },
  { timestamps: true }
);

ChatSchema.index({ userId: 1, chatId: 1 }, { unique: true });

export default mongoose.model("Chat", ChatSchema);
