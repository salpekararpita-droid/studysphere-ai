import express from "express";
import { generateQuiz, solveDoubt } from "../ai.js";
import prisma from "../prisma.js";

const router = express.Router();

router.post("/doubt", async (req, res) => {
  try {
    const { question, subject } = req.body;

    if (typeof question !== "string" || question.trim().length < 3) {
      return res.status(400).json({
        message: "Please enter a question with at least 3 characters."
      });
    }

    const cleanQuestion = question.trim();
    const cleanSubject =
      typeof subject === "string" && subject.trim()
        ? subject.trim()
        : "General";

    const answer = await solveDoubt({
      question: cleanQuestion,
      subject: cleanSubject
    });

    await prisma.studySession.create({
      data: {
        type: "doubt",
        topic: cleanSubject
      }
    });

    return res.json({
      answer
    });
  } catch (error) {
    console.error("Doubt error:", error);

   return res.status(500).json({
  message: "Unable to solve the doubt.",
  error: error.message
});
  }
});

router.post("/quiz", async (req, res) => {
  try {
    const { topic, count, difficulty } = req.body;

    if (typeof topic !== "string" || topic.trim().length < 2) {
      return res.status(400).json({
        message: "Please enter a topic with at least 2 characters."
      });
    }

    const cleanTopic = topic.trim();
    const cleanDifficulty =
      difficulty === "easy" ||
      difficulty === "medium" ||
      difficulty === "hard"
        ? difficulty
        : "medium";

    const cleanCount = Math.min(
      Math.max(Number(count) || 5, 1),
      10
    );

    const quiz = await generateQuiz({
      topic: cleanTopic,
      count: cleanCount,
      difficulty: cleanDifficulty
    });

    await prisma.studySession.create({
      data: {
        type: "quiz",
        topic: cleanTopic
      }
    });

    return res.json(quiz);
  } catch (error) {
    console.error("Quiz error:", error);

   return res.status(500).json({
  message: "Unable to generate the quiz.",
  error: error.message
});
  }
});

export default router;