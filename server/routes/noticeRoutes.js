import express from "express";
import { getNotices } from "../controllers/noticeController.js";

const router = express.Router();

router.get("/", getNotices);

export default router;
