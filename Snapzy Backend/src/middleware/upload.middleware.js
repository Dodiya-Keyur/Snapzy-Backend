const multer = require("multer");

// Configure multer memory storage and file type validation for image uploads
const upload = multer({
    // Store uploaded files in memory as buffer
    storage: multer.memoryStorage(),
    // Enforce 5MB maximum file size limit
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    // Filter to ensure only image mime types are processed
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith("image/")) {
            return cb(new Error("Only image files are allowed"));
        }

        cb(null, true);
    }
});

module.exports = upload;