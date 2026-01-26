import dotenv from "dotenv";
dotenv.config();
import connectDB from "../config/db.js";
import Notice from "../models/Notice.js";

await connectDB();
const schemes = await Notice.countDocuments({ source_type: "GOVERNMENT" });
const news = await Notice.countDocuments({ source_type: "AGRI_NEWS" });

console.log(`\n📊 Data Status:`);
console.log(`🏛️ Schemes: ${schemes}`);
console.log(`📰 News:    ${news}`);
process.exit(0);
