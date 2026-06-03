/**
 * Admin Controller
 * Handles administrative authentication
 */

import jwt from "jsonwebtoken";

export const adminLogin = (req, res) => {
    const { username, password } = req.body;

    if (
        username !== process.env.ADMIN_USERNAME ||
        password !== process.env.ADMIN_PASSWORD
    ) {
        return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ role: "admin" }, process.env.ADMIN_JWT_SECRET, {
        expiresIn: "12h",
    });

    res.json({ token });
};
