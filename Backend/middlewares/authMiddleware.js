const jwt = require("jsonwebtoken");
const User = require("../models/User");




const protect = async(req , res , next) =>{
    try {
        let token = req.headers.authorization ;

        if(token && token.startsWith("Bearer")) {
            token = token.split(" ")[1];
            const decoded = jwt.verify(token , process.env.JWT_SECRET);
            const user = await User.findByPk(decoded.id, { attributes: { exclude: ['password'] } });

            if (!user) {
                return res.status(401).json({ message: "User not found or deleted" });
            }

            req.user = user;
            next();
        } else {
            return res.status(401).json({message : "Not Authorized , no Token"});
        }
    } catch(error){
        return res.status(401).json({message : "Token Failed"})
    }
}



module.exports = { protect };
