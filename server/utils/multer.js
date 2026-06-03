import multer from "multer";
import fs from "fs";

const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const imageUploadDir = "uploads/images";
if (!fs.existsSync(imageUploadDir)) fs.mkdirSync(imageUploadDir, { recursive: true });

const pdfStorage = multer.diskStorage({
    destination: (_, __, cb) => cb(null, uploadDir),
    filename: (_, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

export const pdfUpload = multer({
    storage: pdfStorage,
    limits: { fileSize: 200 * 1024 * 1024 },
    fileFilter: (_, file, cb) => {
        if (file.mimetype !== "application/pdf") {
            cb(new Error("Only PDF files allowed"));
        } else {
            cb(null, true);
        }
    },
});

const imageStorage = multer.diskStorage({
    destination: (_, __, cb) => {
        const dir = "uploads/images";
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (_, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

export const imageUpload = multer({
    storage: imageStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_, file, cb) => {
        const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
        if (!allowedMimes.includes(file.mimetype)) {
            cb(new Error("Only JPEG, PNG, and WebP images allowed"));
        } else {
            cb(null, true);
        }
    },
});

export { imageUploadDir };
