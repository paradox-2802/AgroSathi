/**
 * RSS Feed Executor
 * Processes whitelisted RSS feeds, generates AI summaries, and stores notices in MongoDB
 * Runs every 12 hours via scheduled job in index.js
 */

import crypto from "crypto";
import Notice from "../models/Notice.js";
import { parseFeed } from "../services/rssParser.js";
import { summarizeText } from "../services/summaryService.js";

// Whitelisted RSS feeds for agricultural news and government schemes
const WHITELISTED_FEEDS = [
    { url: "https://www.pib.gov.in/RssMain.aspx?ModId=6&Lang=2&utm&reg=3", type: "GOVERNMENT" }, // Press Information Bureau
    { url: "https://www.agrifarming.in/feed?utm", type: "AGRI_NEWS" }, // Agri Farming News
    { url: "https://www.mykisandost.com/feed/?utm_source=perplexity", type: "AGRI_NEWS" } // MyKisanDost
];

/**
 * Generates unique hash for deduplication
 * @param {string} title - Article title
 * @param {string} url - Article URL
 * @returns {string} SHA-256 hash
 */
function generateHash(title, url) {
    return crypto.createHash("sha256").update(`${title}${url}`).digest("hex");
}

/**
 * Main RSS processing function
 * Fetches feeds, generates summaries, and stores new notices
 * @returns {Promise<number>} Count of newly added notices
 */
export async function processFeeds() {
    console.log("🔄 Starting RSS Feed Processing...");
    let newCount = 0;

    // Process each whitelisted feed
    for (const source of WHITELISTED_FEEDS) {
        console.log(`📡 Fetching ${source.url}...`);
        try {
            const items = await parseFeed(source.url);
            console.log(`📰 Found ${items.length} items from ${source.url}`);

            // Process each article in the feed
            for (const item of items) {
                try {
                    // Skip invalid items
                    if (!item.title || !item.link) continue;

                    // Check for duplicates using content hash
                    const hash = generateHash(item.title, item.link);
                    const exists = await Notice.findOne({ content_hash: hash });
                    if (exists) {
                        process.stdout.write("."); // Progress indicator for skipped items
                        continue;
                    }

                    console.log(`\n🤖 Processing: ${item.title}`);

                    // Generate AI summary for farmer-friendly content
                    let summary = await summarizeText(item.title, item.content);

                    // Fallback to raw content if AI summary fails
                    if (!summary || summary === "Summary unavailable." || summary.length < 10) {
                        summary = item.content || "Click to read full details.";
                        // Strip HTML tags and truncate
                        summary = summary.replace(/<[^>]*>/g, '').slice(0, 300) + (summary.length > 300 ? "..." : "");
                    }

                    // Store notice in database
                    await Notice.create({
                        title: item.title,
                        summary: summary,
                        source_name: item.source,
                        source_type: source.type,
                        published_date: item.pubDate ? new Date(item.pubDate) : new Date(),
                        article_url: item.link,
                        content_hash: hash,
                    });

                    newCount++;

                    // Rate limiting: 1 second delay between AI requests
                    await new Promise(r => setTimeout(r, 1000));
                } catch (innerErr) {
                    console.error(`\n❌ Failed to process item ${item.title}:`, innerErr.message);
                }
            }
        } catch (err) {
            console.error(`❌ Failed to fetch/parse ${source.url}:`, err.message);
        }
    }

    console.log(`\n✅ RSS Processing Complete. Added ${newCount} new notices.`);
    return newCount;
}
