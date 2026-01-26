import { HfInference } from "@huggingface/inference";
import dotenv from "dotenv";
dotenv.config();

export const hfClient = new HfInference(process.env.HUGGINGFACE_API_KEY);
