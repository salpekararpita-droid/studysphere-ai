import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();

app.get("/api/version", (req, res) => {
  res.json({
    version: "quiz-route-version-2",
    file: "backend/src/server.js"
  });
});

const PORT = process.env.PORT || 3000;

const allowedOrigins = [
  "https://studysphere-ai-salpe.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000"
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked origin: ${origin}`));
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  })
);

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "StudySphere backend is running"
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "StudySphere API is running"
  });
});

app.get("/api/progress", (req, res) => {
  res.json({
    totalSessions: 0,
    quizCount: 0,
    doubtCount: 0,
    topics: [],
    recentSessions: []
  });
});

app.post("/api/ai/doubt", async (req, res) => {
  try {
    const { question, subject } = req.body;

    if (!question) {
      return res.status(400).json({
        success: false,
        message: "Question is required"
      });
    }

    return res.json({
      success: true,
      answer: `Received your ${subject || "General"} question: ${question}`
    });
  } catch (error) {
    console.error("Doubt error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to process doubt"
    });
  }
});

app.post("/api/ai/quiz", async (req, res) => {
  try {
    const {
      topic,
      subject,
      difficulty = "medium",
      count = 5
    } = req.body;

    const quizTopic = topic || subject || "General Knowledge";
    const questionCount = Math.min(Math.max(Number(count) || 5, 1), 20);

    const questions = Array.from(
      { length: questionCount },
      (_, index) => ({
        id: index + 1,
        question: `Practice question ${index + 1} about ${quizTopic}`,
        options: [
          "Option A",
          "Option B",
          "Option C",
          "Option D"
        ],
        answer: "Option A",
        correctAnswer: "Option A",
        explanation: `This is a practice question about ${quizTopic}.`,
        difficulty
      })
    );

    return res.json({
      success: true,
      topic: quizTopic,
      difficulty,
      questions
    });
  } catch (error) {
    console.error("Quiz error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to generate quiz"
    });
  }
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

app.use((error, req, res, next) => {
  console.error("Server error:", error.message);

  if (error.message.startsWith("CORS blocked origin:")) {
    return res.status(403).json({
      success: false,
      message: error.message
    });
  }

  return res.status(500).json({
    success: false,
    message: "Internal server error"
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`StudySphere backend running on port ${PORT}`);
});