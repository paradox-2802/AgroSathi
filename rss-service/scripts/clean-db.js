import dotenv from "dotenv";
dotenv.config();
import connectDB from "../config/db.js";
import Notice from "../models/Notice.js";

await connectDB();
const res = await Notice.deleteMany({});
console.log(`Deleted ${res.deletedCount} notices. Ready to re-fetch with new logic.`);
process.exit(0);
