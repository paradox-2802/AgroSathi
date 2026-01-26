import dotenv from "dotenv";
dotenv.config();
import connectDB from "../config/db.js";
import Notice from "../models/Notice.js";

await connectDB();
const count = await Notice.countDocuments();
console.log(`Total Notices in DB: ${count}`);
process.exit(0);
