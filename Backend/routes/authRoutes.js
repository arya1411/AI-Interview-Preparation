const express = require("express");

const {registerUser , loginUser , getUserProfile } = require("../controllers/authController");
const {protect} = require("../middlewares/authMiddleware");


const router = express.Router();


router.post("/register" ,registerUser);
router.post("/login" , loginUser);
router.post("/profile" , protect , getUserProfile);


module.exports = router;