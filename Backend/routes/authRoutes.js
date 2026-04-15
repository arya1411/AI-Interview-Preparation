const express = require("express");

const {registerUser , loginUser , getUserProfile } = require("../controllers/authController");
const {protect} = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadMiddleware");


const router = express.Router();


router.post("/register" ,registerUser);
router.post("/login" , loginUser);
router.get("/profile" , protect , getUserProfile);

router.post("/upload-image", (req, res) => {
    upload.single("image")(req, res, (error) => {
        if (error) {
            return res.status(400).json({ message: error.message || "Image upload failed" });
        }

        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
        return res.status(200).json({ imageurl: imageUrl, imageUrl });
    });
});

module.exports = router;