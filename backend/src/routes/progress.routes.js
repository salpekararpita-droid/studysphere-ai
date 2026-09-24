import express from "express";
import prisma from "../prisma.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const sessions = await prisma.studySession.findMany({
      orderBy: {
        createdAt: "desc"
      },
      take: 50
    });

    const totalSessions = await prisma.studySession.count();

    const quizCount = await prisma.studySession.count({
      where: {
        type: {
          in: ["quiz", "quiz-result"]
        }
      }
    });

    const doubtCount = await prisma.studySession.count({
      where: {
        type: "doubt"
      }
    });

    const topicCounts = {};

    for (const session of sessions) {
      topicCounts[session.topic] =
        (topicCounts[session.topic] || 0) + 1;
    }

    const topics = Object.entries(topicCounts)
      .map(([topic, count]) => ({
        topic,
        count
      }))
      .sort((a, b) => b.count - a.count);

    return res.json({
      totalSessions,
      quizCount,
      doubtCount,
      topics,
      recentSessions: sessions
    });
  } catch (error) {
    console.error("Progress error:", error);

    return res.status(500).json({
      message: "Unable to load progress."
    });
  }
});

router.post("/quiz-result", async (req, res) => {
  try {
    const { topic, score } = req.body;

    const cleanTopic =
      typeof topic === "string" && topic.trim()
        ? topic.trim()
        : "General";

    const cleanScore = Math.max(Number(score) || 0, 0);

    const result = await prisma.studySession.create({
      data: {
        type: "quiz-result",
        topic: cleanTopic,
        score: cleanScore
      }
    });

    return res.status(201).json(result);
  } catch (error) {
    console.error("Quiz result error:", error);

    return res.status(500).json({
      message: "Unable to save quiz result."
    });
  }
});

export default router;