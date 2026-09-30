import "dotenv/config";
import express from "express";
import cors from "cors";
import Groq from "groq-sdk";
import { createClient } from "@supabase/supabase-js";

const app = express();

const PORT = Number(process.env.PORT || 10000);

const FRONTEND_URL =
  process.env.FRONTEND_URL || "*";

app.use(
  cors({
    origin: FRONTEND_URL
  })
);

app.use(express.json({ limit: "1mb" }));

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

console.log({
  supabaseUrl: process.env.SUPABASE_URL,
  hasSupabaseSecretKey: Boolean(
    process.env.SUPABASE_SECRET_KEY
  )
}); 
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  }
);

function cleanText(value, fallback = "") {
  return String(value ?? fallback).trim();
}

function isValidSessionId(sessionId) {
  return (
    typeof sessionId === "string" &&
    sessionId.length >= 10 &&
    sessionId.length <= 200
  );
}

function getCompletionText(completion) {
  return (
    completion?.choices?.[0]?.message?.content || ""
  ).trim();
}

function extractJson(text) {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  return JSON.parse(cleaned);
}

function validateQuiz(questions) {
  if (!Array.isArray(questions)) {
    throw new Error("Quiz questions must be an array.");
  }

  if (questions.length === 0) {
    throw new Error("The quiz contains no questions.");
  }

  return questions.map((item, index) => {
    const question = cleanText(item?.question);
    const options = Array.isArray(item?.options)
      ? item.options.map((option) =>
          cleanText(option)
        )
      : [];
    const answer = cleanText(item?.answer);
    const explanation = cleanText(
      item?.explanation
    );

    if (!question) {
      throw new Error(
        `Question ${index + 1} is empty.`
      );
    }

    if (options.length < 2) {
      throw new Error(
        `Question ${index + 1} needs at least two options.`
      );
    }

    if (!answer) {
      throw new Error(
        `Question ${index + 1} has no answer.`
      );
    }

    if (!explanation) {
      throw new Error(
        `Question ${index + 1} has no explanation.`
      );
    }

    if (!options.includes(answer)) {
      throw new Error(
        `Question ${index + 1} answer is not in its options.`
      );
    }

    return {
      question,
      options,
      answer,
      explanation
    };
  });
}

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "StudySphere backend is running."
  });
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "StudySphere backend is healthy.",
    supabaseConfigured: Boolean(
      process.env.SUPABASE_URL &&
        process.env.SUPABASE_SECRET_KEY
    ),
    groqConfigured: Boolean(
      process.env.GROQ_API_KEY
    )
  });
});

app.post("/api/ai/doubt", async (req, res) => {
  try {
    const question = cleanText(req.body?.question);
    const subject = cleanText(
      req.body?.subject,
      "General"
    );
    const sessionId = cleanText(
      req.body?.sessionId
    );

    if (!question) {
      return res.status(400).json({
        success: false,
        message: "Question is required."
      });
    }

    if (question.length > 2000) {
      return res.status(400).json({
        success: false,
        message:
          "Question must be 2000 characters or fewer."
      });
    }

    if (!isValidSessionId(sessionId)) {
      return res.status(400).json({
        success: false,
        message: "Valid session ID is required."
      });
    }

    const completion =
      await groq.chat.completions.create({
        model: "openai/gpt-oss-120b",
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content:
              "You are a helpful academic study tutor. Explain concepts clearly and use Markdown headings, lists, examples, and simple language when appropriate."
          },
          {
            role: "user",
            content: `Subject: ${subject}

Student question:
${question}`
          }
        ]
      });

    const answer = getCompletionText(completion);

    if (!answer) {
      return res.status(502).json({
        success: false,
        message: "The AI returned an empty answer."
      });
    }

    const { error: saveError } = await supabase
      .from("doubts")
      .insert({
        session_id: sessionId,
        subject,
        question,
        answer
      });

    if (saveError) {
      console.error(
        "Failed to save doubt:",
        saveError
      );

      return res.status(500).json({
        success: false,
        message:
          "The answer was generated but could not be saved."
      });
    }

    return res.json({
      success: true,
      answer
    });
  } catch (error) {
    console.error("Doubt route error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to generate the answer."
    });
  }
});

app.post("/api/ai/quiz", async (req, res) => {
  try {
    const topic = cleanText(req.body?.topic);
    const difficulty = cleanText(
      req.body?.difficulty,
      "Easy"
    );
    const sessionId = cleanText(
      req.body?.sessionId
    );

    const requestedCount = Number(req.body?.count);

    const count =
      Number.isInteger(requestedCount) &&
      requestedCount >= 1 &&
      requestedCount <= 20
        ? requestedCount
        : 5;

    if (!topic) {
      return res.status(400).json({
        success: false,
        message: "Quiz topic is required."
      });
    }

    if (topic.length > 300) {
      return res.status(400).json({
        success: false,
        message:
          "Topic must be 300 characters or fewer."
      });
    }

    if (!isValidSessionId(sessionId)) {
      return res.status(400).json({
        success: false,
        message: "Valid session ID is required."
      });
    }

    const completion =
      await groq.chat.completions.create({
        model: "openai/gpt-oss-120b",
        temperature: 0.2,
        response_format: {
          type: "json_object"
        },
        messages: [
          {
            role: "system",
            content:
              "You create accurate educational multiple-choice quizzes. Return only valid JSON."
          },
          {
            role: "user",
            content: `Create exactly ${count} multiple-choice questions.

Topic: ${topic}
Difficulty: ${difficulty}

Return this exact JSON structure:
{
  "questions": [
    {
      "question": "Question text",
      "options": [
        "Option 1",
        "Option 2",
        "Option 3",
        "Option 4"
      ],
      "answer": "The exact correct option",
      "explanation": "A short explanation"
    }
  ]
}

Rules:
- Return exactly ${count} questions.
- Each question must have four options.
- The answer must exactly match one option.
- Do not include Markdown.
- Return only JSON.`
          }
        ]
      });

    const rawQuiz = getCompletionText(completion);
    const parsedQuiz = extractJson(rawQuiz);
    const questions = validateQuiz(
      parsedQuiz.questions
    );

    const { data: savedQuiz, error: quizError } =
      await supabase
        .from("quizzes")
        .insert({
          session_id: sessionId,
          topic,
          difficulty,
          total_questions: questions.length,
          score: null
        })
        .select()
        .single();

    if (quizError) {
      throw quizError;
    }

    const questionRows = questions.map((item) => ({
      quiz_id: savedQuiz.id,
      question: item.question,
      options: item.options,
      answer: item.answer,
      explanation: item.explanation
    }));

    const {
      data: savedQuestions,
      error: questionsError
    } = await supabase
      .from("quiz_questions")
      .insert(questionRows)
      .select();

    if (questionsError) {
      throw questionsError;
    }

    const questionsForClient = questions.map(
      (item, index) => ({
        id: savedQuestions?.[index]?.id || null,
        question: item.question,
        options: item.options,
        answer: item.answer,
        explanation: item.explanation
      })
    );

    return res.json({
      success: true,
      quizId: savedQuiz.id,
      questions: questionsForClient
    });
  } catch (error) {
    console.error("Quiz route error:", error);

    return res.status(500).json({
      success: false,
      message:
        "Unable to generate and save the quiz.",
      details:
        process.env.NODE_ENV === "development"
          ? error?.message
          : undefined
    });
  }
});

app.post(
  "/api/ai/quiz/:quizId/result",
  async (req, res) => {
    try {
      const quizId = cleanText(
        req.params?.quizId
      );
      const sessionId = cleanText(
        req.body?.sessionId
      );

      const score = Number(req.body?.score);
      const totalQuestions = Number(
        req.body?.totalQuestions
      );

      const answers = Array.isArray(
        req.body?.answers
      )
        ? req.body.answers
        : [];

      if (!quizId || !isValidSessionId(sessionId)) {
        return res.status(400).json({
          success: false,
          message: "Quiz ID and session ID are required."
        });
      }

      if (
        !Number.isInteger(score) ||
        !Number.isInteger(totalQuestions) ||
        score < 0 ||
        totalQuestions < 1 ||
        score > totalQuestions
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid score information."
        });
      }

      const { data: quiz, error: quizFindError } =
        await supabase
          .from("quizzes")
          .select("id, session_id")
          .eq("id", quizId)
          .eq("session_id", sessionId)
          .single();

      if (quizFindError || !quiz) {
        return res.status(404).json({
          success: false,
          message: "Quiz was not found."
        });
      }

      const { error: updateQuizError } =
        await supabase
          .from("quizzes")
          .update({
            score,
            total_questions: totalQuestions
          })
          .eq("id", quizId)
          .eq("session_id", sessionId);

      if (updateQuizError) {
        throw updateQuizError;
      }

      for (const item of answers) {
        if (!item?.questionId) {
          continue;
        }

        await supabase
          .from("quiz_questions")
          .update({
            selected_answer:
              cleanText(item.selectedAnswer) ||
              null,
            is_correct:
              item.isCorrect === true
          })
          .eq("id", item.questionId)
          .eq("quiz_id", quizId);
      }

      return res.json({
        success: true,
        message: "Quiz result saved."
      });
    } catch (error) {
      console.error(
        "Save quiz result error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Unable to save quiz result."
      });
    }
  }
);

app.get("/api/history/doubts", async (req, res) => {
  try {
    const sessionId = cleanText(
      req.query?.sessionId
    );

    if (!isValidSessionId(sessionId)) {
      return res.status(400).json({
        success: false,
        message: "Valid session ID is required."
      });
    }

    const { data, error } = await supabase
      .from("doubts")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", {
        ascending: false
      });

    if (error) {
      throw error;
    }

    return res.json({
      success: true,
      doubts: data || []
    });
  } catch (error) {
    console.error(
      "Doubt history route error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to load previous doubts."
    });
  }
});

app.get("/api/history/quizzes", async (req, res) => {
  try {
    const sessionId = cleanText(
      req.query?.sessionId
    );

    if (!isValidSessionId(sessionId)) {
      return res.status(400).json({
        success: false,
        message: "Valid session ID is required."
      });
    }

    const { data, error } = await supabase
      .from("quizzes")
      .select(`
        id,
        topic,
        difficulty,
        score,
        total_questions,
        created_at,
        quiz_questions (
          id,
          question,
          options,
          answer,
          explanation,
          selected_answer,
          is_correct
        )
      `)
      .eq("session_id", sessionId)
      .order("created_at", {
        ascending: false
      });

    if (error) {
      throw error;
    }

    return res.json({
      success: true,
      quizzes: data || []
    });
  } catch (error) {
    console.error(
      "Quiz history route error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to load previous quizzes."
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
  console.error("Unhandled server error:", error);

  res.status(500).json({
    success: false,
    message: "Internal server error."
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `StudySphere backend running on port ${PORT}`
  );
});