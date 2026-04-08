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
            return res.status(500).json({message : "Invalid Email or Password"});
        }

        const isMatch = await bcrypt.compare(password , user.password);
        if(!isMatch) {
            return res.status(500).json({message : "Invalid Id and Password"});
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

module.exports = { registerUser, loginUser, getUserProfile };