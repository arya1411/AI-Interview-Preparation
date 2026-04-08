const mongoose = require("mongoose");


const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL, {});
        console.log("MongoDB Connected");
    } catch (err){
        console.error("Error in connecting to mongodb" , err);
        process.exit(1);
    }
};


module.exports = connectDB;