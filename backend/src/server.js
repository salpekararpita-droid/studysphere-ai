import "dotenv/config";
import express from "express";
import cors from "cors";
import Groq from "groq-sdk";

const app = express();

const PORT = process.env.PORT || 10000;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

const groq = GROQ_API_KEY
  ? new Groq({
      apiKey: GROQ_API_KEY
    })
  : null;

app.use(
  cors({
    origin: true,
    credentials: true
  })
);

app.use(express.json({ limit: "1mb" }));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "StudySphere backend is running"
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "StudySphere backend is healthy"
  });
});

function requireGroq(res) {
  if (!groq) {
    res.status(500).json({
      success: false,
      message: "Groq AI is not configured.",
      details: "Add GROQ_API_KEY to your environment variables."
    });

    return false;
  }

  return true;
}

function getCompletionText(completion) {
  return completion?.choices?.[0]?.message?.content || "";
}

function cleanQuizQuestions(questions) {
  if (!Array.isArray(questions)) {
    return [];
  }

  return questions
    .map((item) => {
      const options = Array.isArray(item?.options)
        ? item.options.map((option) => String(option).trim())
        : [];

      return {
        question: String(item?.question ?? "").trim(),
        options,
        answer: String(item?.answer ?? "").trim(),
        explanation: String(item?.explanation ?? "").trim()
      };
    })
    .filter(
      (item) =>
        item.question &&
        item.options.length === 4 &&
        item.options.every(Boolean) &&
        item.answer &&
        item.options.includes(item.answer) &&
        item.explanation
    );
}

app.post("/api/ai/doubt", async (req, res) => {
  try {
    if (!requireGroq(res)) return;

    const question = String(req.body?.question ?? "").trim();
    const subject = String(req.body?.subject ?? "General").trim();

    if (!question) {
      return res.status(400).json({
        success: false,
        message: "Question is required."
      });
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            "You are a helpful study tutor. Explain concepts clearly using simple language. Use Markdown formatting when useful."
        },
        {
          role: "user",
          content: `Subject: ${subject}\n\nStudent question:\n${question}`
        }
      ]
    });

    const answer = getCompletionText(completion).trim();

    if (!answer) {
      throw new Error("Groq returned an empty answer.");
    }

    return res.json({
      success: true,
      answer
    });
  } catch (error) {
    console.error("Doubt endpoint error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to generate an answer.",
      details: error?.message || "Unknown Groq error"
    });
  }
});

app.post("/api/ai/quiz", async (req, res) => {
  try {
    if (!requireGroq(res)) return;

    const topic = String(req.body?.topic ?? "").trim();
    const difficulty = String(
      req.body?.difficulty ?? "Easy"
    ).trim();

    const requestedCount = Number(req.body?.count ?? 5);

    const count = Math.min(
      Math.max(
        Number.isFinite(requestedCount) ? requestedCount : 5,
        1
      ),
      10
    );

    if (!topic) {
      return res.status(400).json({
        success: false,
        message: "Quiz topic is required."
      });
    }

    const quizPrompt = `
Create a multiple-choice quiz.

Topic: ${topic}
Difficulty: ${difficulty}
Number of questions: ${count}

Return ONLY valid JSON in exactly this structure:

{
  "success": true,
  "questions": [
    {
      "question": "What is 2 + 2?",
      "options": ["3", "4", "5", "6"],
      "answer": "4",
      "explanation": "Adding 2 and 2 gives 4."
    }
  ]
}

Rules:
- Return exactly ${count} questions.
- Each question must have exactly four different options.
- The answer must exactly match the complete text of one option.
- Do not use only A, B, C, or D as the answer.
- Add a short explanation for every question.
- Return no Markdown.
- Return no code fences.
- Return no text before or after the JSON.
`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      response_format: {
        type: "json_object"
      },
      messages: [
        {
          role: "system",
          content:
            "You create educational quizzes. Always return valid JSON only."
        },
        {
          role: "user",
          content: quizPrompt
        }
      ]
    });

    const content = getCompletionText(completion).trim();

    if (!content) {
      throw new Error("Groq returned an empty quiz response.");
    }

    const parsed = JSON.parse(content);
    const questions = cleanQuizQuestions(parsed?.questions);

    if (questions.length === 0) {
      throw new Error("Groq returned no valid quiz questions.");
    }

    return res.json({
      success: true,
      questions
    });
  } catch (error) {
    console.error("Quiz endpoint error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to generate quiz.",
      details: error?.message || "Unknown Groq error"
    });
  }
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found."
  });
});

app.use((error, req, res, next) => {
  console.error("Server error:", error);

  res.status(500).json({
    success: false,
    message: "Internal server error."
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`StudySphere backend running on port ${PORT}`);
});