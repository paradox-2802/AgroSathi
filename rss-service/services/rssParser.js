import Parser from "rss-parser";

const parser = new Parser({
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
});

/**
 * Parses an RSS feed and returns clean items.
 * @param {string} url - RSS feed URL
 * @returns {Promise<Array>} List of items
 */
export async function parseFeed(url) {
    try {
        const feed = await parser.parseURL(url);
        return feed.items.map(item => ({
            title: item.title,
            link: item.link,
            content: item.contentSnippet || item.content || item.summary || "",
            pubDate: item.pubDate,
            source: feed.title || "Unknown Source"
        }));
    } catch (error) {
        console.error(`Error parsing feed ${url}:`, error.message);
        return [];
    }
}
