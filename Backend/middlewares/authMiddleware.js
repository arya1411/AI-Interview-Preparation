const jwt = require("jsonwebtoken");
const User = require("../models/User");




const Protect = async(req , res , next) =>{
    try {
        let token = req.headers.authorization ;


        if(token && token.startsWith("Bearer")) {
            token = token.split(" ")[1];
            const decoded = jwt.verify(token , process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select("-password");
            next();
        } else {
            res.status(401).json({message : "Not Authorized , no Token"});
        }
    } catch(error){
        res.status(401).json({message : "Token Failed"})
    }
}



module.exports = {protect} ;
