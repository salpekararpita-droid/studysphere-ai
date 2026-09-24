import "dotenv/config";
import express from "express";
import cors from "cors";
import aiRoutes from "./routes/ai.routes.js";
import progressRoutes from "./routes/progress.routes.js";

const app = express();
const port = Number(process.env.PORT) || 5000;

app.use(
  cors({
    origin: [
      "http://localhost:5174",
      "http://127.0.0.1:5174"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type"]
  })
);

app.use(express.json({ limit: "1mb" }));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to StudySphere API"
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "StudySphere API is running"
  });
});

app.use("/api/ai", aiRoutes);
app.use("/api/progress", progressRoutes);

app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
    path: req.originalUrl
  });
});

app.use((error, req, res, next) => {
  console.error("Server error:", error);

  res.status(500).json({
    message: "Internal server error"
  });
});

app.listen(port, () => {
  console.log(`StudySphere backend running on port ${port}`);
  console.log(`Health URL: http://localhost:${port}/api/health`);
});