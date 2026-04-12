require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const axios = require("axios");
const cron = require("node-cron");
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

app.get("/ping", (req, res) => {
    res.status(200).send("Server is alive");
});

app.post("/api/ai/generate-questions" , protect , aiBurstLimiter, aiDailyLimiter, generateInterviewQuestions);
app.post("/api/ai/generate-explanation" , protect , aiBurstLimiter, aiDailyLimiter, generateConceptExplanation);

app.use("/uploads" , express.static(path.join(__dirname , "uploads") , {}));

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await connectDB();
        app.listen(PORT , () => {
            console.log(`Server Running on Port ${PORT}`);

            const SERVER_URL = process.env.SERVER_URL; 
            if (SERVER_URL) {
                cron.schedule("*/14 * * * *", async () => {
                    try {
                        console.log("Pinging server to keep it awake...");
                        await axios.get(`${SERVER_URL}/ping`);
                    } catch (error) {
                        console.error("Self-ping failed:", error.message);
                    }
                });
            } else {
                console.warn("SERVER_URL not defined. Self-ping skipped.");
            }
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};

startServer();
