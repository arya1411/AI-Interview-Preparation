const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");


const generateToken = (userId) => {
    return jwt.sign({id : userId} , process.env.JWT_SECRET , {expiresIn : "7d"});

};

const registerUser = async(req , res) => {
    try {
        if (!req.body || typeof req.body !== "object") {
            return res.status(400).json({
                message: "Invalid request body",
                error: "Send JSON with Content-Type: application/json",
            });
        }

        const {name , email , password , profileImageUrl } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: "Name, email, and password are required" });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }

        const userExists = await User.findOne({email});

        if(userExists){
            return res.status(400).json({message : "User already exists"});
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password , salt);


        const user = await User.create({
            name, 
            email,
            password : hashedPassword,
            profileImageUrl,
        });

        res.status(201).json({
            _id : user._id,
            name : user.name,
            email : user.email,
            profileImageUrl : user.profileImageUrl,
            token : generateToken(user._id) , 
        });
    } catch(error){
        res.status(500).json({message : "Server Error" , error : error.message});
    }
};



const loginUser = async (req , res) => {
    try {
        if (!req.body || typeof req.body !== "object") {
            return res.status(400).json({
                message: "Invalid request body",
                error: "Send JSON with Content-Type: application/json",
            });
        }

        const {email , password } = req.body;

        const user = await User.findOne({email});
        if(!user){
            return res.status(401).json({message : "Invalid Email or Password"});
        }

        const isMatch = await bcrypt.compare(password , user.password);
        if(!isMatch) {
            return res.status(401).json({message : "Invalid Email or Password"});
        }


        res.json({
            _id : user._id,
            name : user.name,
            email : user.email,
            profileImageUrl : user.profileImageUrl,
            token : generateToken(user._id),
        });
    } catch(error){
        res.status(500).json({message :"Server Error" , error : error.message});
    }

};

const getUserProfile = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({
            _id: req.user._id,
            name: req.user.name,
            email: req.user.email,
            profileImageUrl: req.user.profileImageUrl,
        });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

const googleAuth = async (req, res) => {
    try {
        const { idToken } = req.body;

        if (!idToken) {
            return res.status(400).json({ message: "Firebase ID token is required" });
        }

        // Verify the token with Firebase Admin
        const admin = require("../config/firebase");
        if (!admin) {
            return res.status(503).json({ message: "Google auth is not configured yet" });
        }
        const decoded = await admin.auth().verifyIdToken(idToken);

        const { uid, email, name, picture } = decoded;

        if (!email) {
            return res.status(400).json({ message: "No email associated with this Google account" });
        }

        // Find existing user by email or googleId, or create a new one
        let user = await User.findOne({ $or: [{ email }, { googleId: uid }] });

        if (user) {
            // Link googleId if this email already exists from email/password signup
            if (!user.googleId) {
                user.googleId = uid;
                if (!user.profileImageUrl && picture) user.profileImageUrl = picture;
                await user.save();
            }
        } else {
            // Brand new user via Google
            user = await User.create({
                name: name || email.split("@")[0],
                email,
                googleId: uid,
                profileImageUrl: picture || null,
                password: null,
            });
        }

        res.status(200).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            profileImageUrl: user.profileImageUrl,
            token: generateToken(user._id),
        });

    } catch (error) {
        console.error("Google auth error:", error.message);
        res.status(401).json({ message: "Invalid or expired Google token", error: error.message });
    }
};

module.exports = { registerUser, loginUser, getUserProfile, googleAuth };