import Notice from "../models/Notice.js";

/**
 * Get paginated notices
 * @route GET /api/notices
 */
export async function getNotices(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const type = req.query.type;

        const query = {};
        if (type) query.source_type = type;

        const notices = await Notice.find(query)
            .sort({ published_date: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        const total = await Notice.countDocuments(query);

        res.json({
            notices,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
        });
    } catch {
        res.status(500).json({ error: "Failed to fetch notices" });
    }
}
