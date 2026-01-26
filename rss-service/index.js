/**
 * RSS Service - Background Worker
 * Fetches agricultural news and government schemes every 12 hours
 * Generates AI summaries and stores in MongoDB for the Notices feature
 */

import dotenv from "dotenv";
dotenv.config();

import connectDB from "./config/db.js";
import { processFeeds } from "./jobs/rssExecutor.js";

console.log("🚀 AgroSathi RSS Service Starting...");

// Connect to MongoDB
await connectDB();

// Run every 12 hours
const INTERVAL = 12 * 60 * 60 * 1000;

/**
 * Main execution function
 * Processes all whitelisted RSS feeds
 */
async function run() {
    try {
        await processFeeds();
    } catch (error) {
        console.error("❌ Critical Error in RSS Loop:", error);
    }
}

// Run immediately on startup
run();

// Schedule periodic execution
setInterval(run, INTERVAL);
console.log(`✅ Scheduler active. Running every ${INTERVAL / 3600000} hours.`);
