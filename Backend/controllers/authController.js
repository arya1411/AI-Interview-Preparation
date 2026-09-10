const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Op } = require('sequelize');
const User = require("../models/User");


const generateToken = (userId) => {
    return jwt.sign({id : userId} , process.env.JWT_SECRET , {expiresIn : "7d"});

};

// Validation helpers
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const validatePassword = (password) => {
    const errors = [];
    
    if (password.length < 8) {
        errors.push('Password must be at least 8 characters');
    }
    if (password.length > 128) {
        errors.push('Password must not exceed 128 characters');
    }
    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
        errors.push('Password must contain at least one special character');
    }
    
    return errors;
};

const sanitizeInput = (input) => {
    if (typeof input !== 'string') return input;
    return input.trim().replace(/[<>"'&]/g, '');
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

        // Sanitize inputs
        const sanitizedName = sanitizeInput(name);
        const sanitizedEmail = sanitizeInput(email?.toLowerCase());

        if (!sanitizedName || sanitizedName.length < 2) {
            return res.status(400).json({ message: "Name must be at least 2 characters" });
        }
        if (sanitizedName.length > 50) {
            return res.status(400).json({ message: "Name must not exceed 50 characters" });
        }

        if (!sanitizedEmail || !validateEmail(sanitizedEmail)) {
            return res.status(400).json({ message: "Please provide a valid email address" });
        }

        if (!password) {
            return res.status(400).json({ message: "Password is required" });
        }

        const passwordErrors = validatePassword(password);
        if (passwordErrors.length > 0) {
            return res.status(400).json({ 
                message: "Password validation failed", 
                errors: passwordErrors 
            });
        }

        // Check for common weak passwords
        const commonPasswords = ['password', '12345678', 'qwerty', 'abc123', 'letmein', 'admin', 'welcome'];
        if (commonPasswords.includes(password.toLowerCase())) {
            return res.status(400).json({ message: "Password is too common. Please choose a stronger password." });
        }

        const userExists = await User.findOne({where: {email: sanitizedEmail}});

        if(userExists){
            return res.status(400).json({message : "User already exists with this email"});
        }

        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password , salt);

        const user = await User.create({
            name: sanitizedName, 
            email: sanitizedEmail,
            password : hashedPassword,
            profileImageUrl,
        });

        res.status(201).json({
            _id : user.id,
            name : user.name,
            email : user.email,
            profileImageUrl : user.profileImageUrl,
            token : generateToken(user.id) ,
            id: user.id,
        });
    } catch(error){
        console.error('Registration error:', error);
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

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const sanitizedEmail = sanitizeInput(email?.toLowerCase());

        if (!validateEmail(sanitizedEmail)) {
            return res.status(400).json({ message: "Please provide a valid email address" });
        }

        const user = await User.findOne({where: {email: sanitizedEmail}});
        if(!user){
            return res.status(401).json({message : "Invalid Email or Password"});
        }

        if (!user.password) {
            return res.status(401).json({message : "Please use the sign-up method you originally registered with"});
        }

        const isMatch = await bcrypt.compare(password , user.password);
        if(!isMatch) {
            return res.status(401).json({message : "Invalid Email or Password"});
        }

        res.json({
            _id : user.id,
            name : user.name,
            email : user.email,
            profileImageUrl : user.profileImageUrl,
            token : generateToken(user.id),
            id: user.id,
        });
    } catch(error){
        console.error('Login error:', error);
        res.status(500).json({message :"Server Error" , error : error.message});
    }
};

const getUserProfile = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({
            _id: req.user.id,
            name: req.user.name,
            email: req.user.email,
            profileImageUrl: req.user.profileImageUrl,
        });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

module.exports = { registerUser, loginUser, getUserProfile };