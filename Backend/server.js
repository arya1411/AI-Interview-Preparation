require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/db");



const app = express();



app.use(
    cors({
        origin : "*",
        methods :["GET" , "POST" , "PUT" , "DELETE"],
        allowedHeaders : ["Content-Type" , "Authorization"],
    })
);

connectDB();


app.use(express.json());


app.use("/uploads" , express.static(path.join(__dirname , "uploads") , {}));

const PORT = process.env.PORT || 5000;

app.listen(PORT , () => console.log(`Server Running on Port ${PORT}`));
