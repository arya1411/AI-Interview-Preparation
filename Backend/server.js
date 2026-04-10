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
const {
    apiLimiter,
    loginLimiter,
    registerLimiter,
    aiBurstLimiter,
    aiDailyLimiter,
} = require("./middlewares/rateLimiters");


const app = express();

app.set("trust proxy", 1);

const corsOptions = {
    // Reflect request origin to avoid wildcard-related browser edge cases on preflight.
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", apiLimiter);
app.use("/api/auth/login", loginLimiter);
app.use("/api/auth/register", registerLimiter);

app.use("/api/auth", authRoutes);
app.use('/api/sessions' , sessionRoute);
app.use('/api/questions' , questionRoutes);

app.post("/api/ai/generate-questions" , protect , aiBurstLimiter, aiDailyLimiter, generateInterviewQuestions);
app.post("/api/ai/generate-explanation" , protect , aiBurstLimiter, aiDailyLimiter, generateConceptExplanation);

app.use("/uploads" , express.static(path.join(__dirname , "uploads") , {}));

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await connectDB();
        app.listen(PORT , () => console.log(`Server Running on Port ${PORT}`));
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};

startServer();
