const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "..", "uploads");

const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		try {
			if (!fs.existsSync(uploadDir)) {
				fs.mkdirSync(uploadDir, { recursive: true });
			}
			cb(null, uploadDir);
		} catch (error) {
			cb(error);
		}
	},
	filename: (req, file, cb) => {
		cb(null, `${Date.now()}${path.extname(file.originalname)}`);
	},
});

const fileFilter = (req, file, cb) => {
	if (file.mimetype.startsWith("image/")) {
		cb(null, true);
	} else {
		cb(new Error("Only image files are allowed"), false);
	}
};

const upload = multer({ storage, fileFilter });

module.exports = upload;
