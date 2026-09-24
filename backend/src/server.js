import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();
const allowedOrigins = [
  "https://studysphere-ai-salpe.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000"
];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  })
);

app.use(express.json());

const PORT = process.env.PORT || 3000;
const FRONTEND_URL = "https://studysphere-ai-salpe.vercel.app";

const allowedOrigins = [
  FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:3000"
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allows requests from Postman, curl, and server-to-server clients
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked origin: ${origin}`));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
};

// CORS must be before your routes
app.use(cors(corsOptions));

app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "StudySphere API is running"
  });
});

// Progress endpoint
app.get("/api/progress", (req, res) => {
  res.status(200).json({
    totalSessions: 0,
    quizCount: 0,
    doubtCount: 0,
    topics: [],
    recentSessions: []
  });
});

// Temporary doubt endpoint test
app.post("/api/ai/doubt", async (req, res) => {
  try {
    const { question, subject } = req.body;

    if (!question) {
      return res.status(400).json({
        success: false,
        message: "Question is required"
      });
    }

    res.status(200).json({
      success: true,
      answer: `Received your ${subject || ""} question: ${question}`
    });
  } catch (error) {
    console.error("Doubt endpoint error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to process the question"
    });
  }
});

// Unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error("Server error:", error.message);

  if (error.message.startsWith("CORS blocked origin:")) {
    return res.status(403).json({
      success: false,
      message: error.message
    });
  }

  res.status(500).json({
    success: false,
    message: "Internal server error"
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`StudySphere backend running on port ${PORT}`);
});