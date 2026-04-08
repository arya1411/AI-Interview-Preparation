require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const { protect } = require("./middlewares/authMiddleware");
const sessionRoute = require('./routes/sessionRoutes');
const questionRoutes = require('./routes/questionRoutes');
const { generateInterviewQuestions, generateConceptExplanation } = require("./controllers/aiControllers");


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
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.use('/api/sessions' , sessionRoute);
app.use('/api/questions' , questionRoutes);

app.use("/api/ai/generate-questions" , protect , generateInterviewQuestions);
app.use("api/ai/generate-explanation" , protect , generateConceptExplanation);

app.use("/uploads" , express.static(path.join(__dirname , "uploads") , {}));

const PORT = process.env.PORT || 5000;

app.listen(PORT , () => console.log(`Server Running on Port ${PORT}`));
