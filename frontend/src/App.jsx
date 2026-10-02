import {
  useEffect,
  useState
} from "react";

import { supabase } from "./supabaseClient";

import "./App.css";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:10000";

function getSessionId() {
  let sessionId = localStorage.getItem(
    "studysphere_session_id"
  );

  if (!sessionId) {
    sessionId = crypto.randomUUID();

    localStorage.setItem(
      "studysphere_session_id",
      sessionId
    );
  }

  return sessionId;
}

function getErrorMessage(error) {
  return (
    error?.message ||
    "Something went wrong. Please try again."
  );
}

function AuthForm({
  onAuthenticated
}) {
  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [isSignup, setIsSignup] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      if (!email || !password) {
        throw new Error(
          "Email and password are required."
        );
      }

      if (password.length < 6) {
        throw new Error(
          "Password must contain at least 6 characters."
        );
      }

      const result = isSignup
        ? await supabase.auth.signUp({
            email,
            password
          })
        : await supabase.auth.signInWithPassword({
            email,
            password
          });

      if (result.error) {
        throw result.error;
      }

      if (isSignup) {
        if (!result.data.session) {
          setMessage(
            "Account created. Check your email to confirm your account, then log in."
          );
          return;
        }

        if (result.data.user) {
          onAuthenticated(result.data.user);
        }

        return;
      }

      if (!result.data.user) {
        throw new Error(
          "Login succeeded, but no user was returned."
        );
      }

      onAuthenticated(result.data.user);
    } catch (error) {
      console.error(
        "Authentication error:",
        error
      );

      setMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>StudySphere</h1>

        <p>
          {isSignup
            ? "Create your learning account."
            : "Log in to continue learning."}
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="email">
            Email
          </label>

          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
            required
          />

          <label htmlFor="password">
            Password
          </label>

          <input
            id="password"
            type="password"
            autoComplete={
              isSignup
                ? "new-password"
                : "current-password"
            }
            placeholder="At least 6 characters"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            minLength={6}
            required
          />

          <button
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : isSignup
                ? "Create account"
                : "Log in"}
          </button>
        </form>

        {message && (
          <p className="status-message">
            {message}
          </p>
        )}

        <button
          type="button"
          className="link-button"
          onClick={() => {
            setIsSignup((value) => !value);
            setMessage("");
          }}
        >
          {isSignup
            ? "Already have an account? Log in"
            : "New user? Create an account"}
        </button>
      </section>
    </main>
  );
}

function App() {
  const [user, setUser] =
    useState(null);

  const [authLoading, setAuthLoading] =
    useState(true);

  const [subject, setSubject] =
    useState("");

  const [question, setQuestion] =
    useState("");

  const [answer, setAnswer] =
    useState("");

  const [doubtLoading, setDoubtLoading] =
    useState(false);

  const [topic, setTopic] =
    useState("");

  const [difficulty, setDifficulty] =
    useState("Easy");

  const [count, setCount] =
    useState(5);

  const [quiz, setQuiz] =
    useState(null);

  const [quizId, setQuizId] =
    useState(null);

  const [quizLoading, setQuizLoading] =
    useState(false);

  const [currentQuestion, setCurrentQuestion] =
    useState(0);

  const [selectedAnswer, setSelectedAnswer] =
    useState("");

  const [quizAnswers, setQuizAnswers] =
    useState([]);

  const [quizFinished, setQuizFinished] =
    useState(false);

  const [historyDoubts, setHistoryDoubts] =
    useState([]);

  const [historyQuizzes, setHistoryQuizzes] =
    useState([]);

  const [historyLoading, setHistoryLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const sessionId = getSessionId();

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const {
        data,
        error
      } = await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      if (error) {
        console.error(
          "Session error:",
          error
        );
      }

      setUser(data.session?.user || null);
      setAuthLoading(false);
    }

    loadSession();

    const {
      data: subscriptionData
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
      }
    );

    return () => {
      mounted = false;

      subscriptionData.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user) {
      loadHistory();
    }
  }, [user]);

  async function getAccessToken() {
    const {
      data,
      error
    } = await supabase.auth.getSession();

    if (error) {
      throw error;
    }

    const accessToken =
      data.session?.access_token;

    if (!accessToken) {
      throw new Error(
        "Your login session has expired. Please log in again."
      );
    }

    return accessToken;
  }

  async function apiRequest(
    endpoint,
    options = {}
  ) {
    const accessToken =
      await getAccessToken();

    const response = await fetch(
      `${API_URL}${endpoint}`,
      {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          ...(options.headers || {})
        }
      }
    );

    let responseBody = null;

    try {
      responseBody =
        await response.json();
    } catch {
      responseBody = null;
    }

    if (!response.ok) {
      throw new Error(
        responseBody?.message ||
          responseBody?.details ||
          `Request failed with status ${response.status}.`
      );
    }

    return responseBody;
  }

  async function handleLogout() {
    const { error } =
      await supabase.auth.signOut();

    if (error) {
      setMessage(error.message);
      return;
    }

    setUser(null);
    setQuiz(null);
    setAnswer("");
    setHistoryDoubts([]);
    setHistoryQuizzes([]);
  }

  async function solveDoubt(event) {
    event.preventDefault();

    if (!question.trim()) {
      setMessage("Please enter a question.");
      return;
    }

    setDoubtLoading(true);
    setAnswer("");
    setMessage("");

    try {
      const data = await apiRequest(
        "/api/ai/doubt",
        {
          method: "POST",
          body: JSON.stringify({
            question: question.trim(),
            subject:
              subject.trim() || "General",
            sessionId
          })
        }
      );

      setAnswer(data.answer || "");
      await loadHistory();
    } catch (error) {
      console.error(
        "Doubt request error:",
        error
      );

      setMessage(getErrorMessage(error));
    } finally {
      setDoubtLoading(false);
    }
  }

  async function generateQuiz(event) {
    event.preventDefault();

    if (!topic.trim()) {
      setMessage("Please enter a quiz topic.");
      return;
    }

    setQuizLoading(true);
    setMessage("");
    setQuiz(null);
    setQuizId(null);
    setCurrentQuestion(0);
    setSelectedAnswer("");
    setQuizAnswers([]);
    setQuizFinished(false);

    try {
      const data = await apiRequest(
        "/api/ai/quiz",
        {
          method: "POST",
          body: JSON.stringify({
            topic: topic.trim(),
            difficulty,
            count: Number(count),
            sessionId
          })
        }
      );

      setQuizId(data.quizId);
      setQuiz({
        topic: topic.trim(),
        difficulty,
        questions: data.questions || []
      });

      await loadHistory();
    } catch (error) {
      console.error(
        "Quiz request error:",
        error
      );

      setMessage(getErrorMessage(error));
    } finally {
      setQuizLoading(false);
    }
  }

  function checkAnswer() {
    if (!quiz?.questions?.length) {
      return;
    }

    if (!selectedAnswer) {
      setMessage(
        "Please select an answer first."
      );
      return;
    }

    setMessage("");

    const current =
      quiz.questions[currentQuestion];

    const isCorrect =
      selectedAnswer === current.answer;

    const answerRecord = {
      questionId: current.id,
      selectedAnswer,
      isCorrect
    };

    setQuizAnswers((previous) => [
      ...previous,
      answerRecord
    ]);
  }

  async function nextQuestion() {
    if (!quiz?.questions?.length) {
      return;
    }

    const alreadyAnswered =
      quizAnswers.some(
        (item) =>
          item.questionId ===
          quiz.questions[currentQuestion].id
      );

    if (!alreadyAnswered) {
      checkAnswer();
      return;
    }

    if (
      currentQuestion <
      quiz.questions.length - 1
    ) {
      setCurrentQuestion(
        (value) => value + 1
      );
      setSelectedAnswer("");
      setMessage("");
      return;
    }

    await finishQuiz();
  }

  async function finishQuiz() {
    if (!quiz || !quizId) {
      return;
    }

    const finalAnswers = [
      ...quizAnswers
    ];

    const currentQuestionData =
      quiz.questions[currentQuestion];

    if (
      currentQuestionData &&
      selectedAnswer &&
      !finalAnswers.some(
        (item) =>
          item.questionId ===
          currentQuestionData.id
      )
    ) {
      finalAnswers.push({
        questionId: currentQuestionData.id,
        selectedAnswer,
        isCorrect:
          selectedAnswer ===
          currentQuestionData.answer
      });
    }

    const score = finalAnswers.filter(
      (item) => item.isCorrect
    ).length;

    try {
      await apiRequest(
        `/api/ai/quiz/${quizId}/result`,
        {
          method: "POST",
          body: JSON.stringify({
            sessionId,
            score,
            totalQuestions:
              quiz.questions.length,
            answers: finalAnswers
          })
        }
      );

      setQuizAnswers(finalAnswers);
      setQuizFinished(true);
      await loadHistory();
    } catch (error) {
      console.error(
        "Quiz result error:",
        error
      );

      setMessage(getErrorMessage(error));
    }
  }

  async function loadHistory() {
    setHistoryLoading(true);

    try {
      const [
        doubtsData,
        quizzesData
      ] = await Promise.all([
        apiRequest(
          `/api/history/doubts?sessionId=${encodeURIComponent(
            sessionId
          )}`,
          {
            method: "GET"
          }
        ),
        apiRequest(
          `/api/history/quizzes?sessionId=${encodeURIComponent(
            sessionId
          )}`,
          {
            method: "GET"
          }
        )
      ]);

      setHistoryDoubts(
        doubtsData.doubts || []
      );

      setHistoryQuizzes(
        quizzesData.quizzes || []
      );
    } catch (error) {
      console.error(
        "History loading error:",
        error
      );

      setMessage(getErrorMessage(error));
    } finally {
      setHistoryLoading(false);
    }
  }

  if (authLoading) {
    return (
      <main className="loading-page">
        <p>Loading...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <AuthForm
        onAuthenticated={setUser}
      />
    );
  }

  const current =
    quiz?.questions?.[currentQuestion];

  const score = quizAnswers.filter(
    (item) => item.isCorrect
  ).length;

  return (
    <main className="app-page">
      <header className="app-header">
        <div>
          <h1>StudySphere</h1>
          <p>
            AI-powered learning assistant
          </p>
        </div>

        <div className="user-controls">
          <span>{user.email}</span>

          <button
            type="button"
            onClick={handleLogout}
          >
            Log out
          </button>
        </div>
      </header>

      <section className="hero-section">
        <h2>Learn smarter with AI</h2>

        <p>
          Ask questions, generate quizzes,
          and track your learning progress.
        </p>
      </section>

      {message && (
        <div className="status-message">
          {message}
        </div>
      )}

      <section className="dashboard-grid">
        <article className="card">
          <h2>Ask a doubt</h2>

          <form onSubmit={solveDoubt}>
            <label htmlFor="subject">
              Subject
            </label>

            <input
              id="subject"
              value={subject}
              onChange={(event) =>
                setSubject(event.target.value)
              }
              placeholder="Mathematics"
            />

            <label htmlFor="question">
              Your question
            </label>

            <textarea
              id="question"
              value={question}
              onChange={(event) =>
                setQuestion(event.target.value)
              }
              placeholder="Explain this..."
              rows={5}
              required
            />

            <button
              type="submit"
              disabled={doubtLoading}
            >
              {doubtLoading
                ? "Thinking..."
                : "Ask AI"}
            </button>
          </form>

          {answer && (
            <div className="answer-box">
              <h3>Answer</h3>
              <div className="markdown-answer">
                {answer}
              </div>
            </div>
          )}
        </article>

        <article className="card">
          <h2>Generate a quiz</h2>

          <form onSubmit={generateQuiz}>
            <label htmlFor="topic">
              Topic
            </label>

            <input
              id="topic"
              value={topic}
              onChange={(event) =>
                setTopic(event.target.value)
              }
              placeholder="Photosynthesis"
              required
            />

            <label htmlFor="difficulty">
              Difficulty
            </label>

            <select
              id="difficulty"
              value={difficulty}
              onChange={(event) =>
                setDifficulty(event.target.value)
              }
            >
              <option value="Easy">
                Easy
              </option>
              <option value="Medium">
                Medium
              </option>
              <option value="Hard">
                Hard
              </option>
            </select>

            <label htmlFor="count">
              Questions
            </label>

            <select
              id="count"
              value={count}
              onChange={(event) =>
                setCount(event.target.value)
              }
            >
              <option value="3">3</option>
              <option value="5">5</option>
              <option value="10">10</option>
            </select>

            <button
              type="submit"
              disabled={quizLoading}
            >
              {quizLoading
                ? "Generating..."
                : "Generate quiz"}
            </button>
          </form>
        </article>
      </section>

      {quiz && current && (
        <section className="card quiz-card">
          <h2>
            {quiz.topic} · {quiz.difficulty}
          </h2>

          {!quizFinished ? (
            <>
              <p>
                Question {currentQuestion + 1} of{" "}
                {quiz.questions.length}
              </p>

              <h3>{current.question}</h3>

              <div className="options-list">
                {current.options.map(
                  (option) => (
                    <label
                      key={option}
                      className="option-item"
                    >
                      <input
                        type="radio"
                        name={`question-${currentQuestion}`}
                        value={option}
                        checked={
                          selectedAnswer ===
                          option
                        }
                        onChange={(event) =>
                          setSelectedAnswer(
                            event.target.value
                          )
                        }
                      />

                      <span>{option}</span>
                    </label>
                  )
                )}
              </div>

              <div className="quiz-actions">
                <button
                  type="button"
                  onClick={checkAnswer}
                  disabled={!selectedAnswer}
                >
                  Check answer
                </button>

                <button
                  type="button"
                  onClick={nextQuestion}
                  disabled={
                    !selectedAnswer
                  }
                >
                  {currentQuestion ===
                  quiz.questions.length - 1
                    ? "Finish quiz"
                    : "Next question"}
                </button>
              </div>

              <p>
                {current.explanation}
              </p>
            </>
          ) : (
            <div className="quiz-result">
              <h3>Quiz complete</h3>

              <p>
                Score: {score} /{" "}
                {quiz.questions.length}
              </p>

              <button
                type="button"
                onClick={() => {
                  setQuiz(null);
                  setQuizId(null);
                  setQuizAnswers([]);
                  setCurrentQuestion(0);
                  setSelectedAnswer("");
                  setQuizFinished(false);
                }}
              >
                Start another quiz
              </button>
            </div>
          )}
        </section>
      )}

      <section className="history-grid">
        <article className="card">
          <div className="section-heading">
            <h2>Previous doubts</h2>

            <button
              type="button"
              onClick={loadHistory}
              disabled={historyLoading}
            >
              Refresh
            </button>
          </div>

          {historyDoubts.length === 0 ? (
            <p>No saved doubts yet.</p>
          ) : (
            historyDoubts.map((item) => (
              <div
                className="history-item"
                key={item.id}
              >
                <strong>
                  {item.subject}
                </strong>

                <p>{item.question}</p>

                <small>
                  {item.created_at
                    ? new Date(
                        item.created_at
                      ).toLocaleString()
                    : ""}
                </small>
              </div>
            ))
          )}
        </article>

        <article className="card">
          <div className="section-heading">
            <h2>Previous quizzes</h2>

            <button
              type="button"
              onClick={loadHistory}
              disabled={historyLoading}
            >
              Refresh
            </button>
          </div>

          {historyQuizzes.length === 0 ? (
            <p>No saved quizzes yet.</p>
          ) : (
            historyQuizzes.map((item) => (
              <div
                className="history-item"
                key={item.id}
              >
                <strong>
                  {item.topic}
                </strong>

                <p>
                  Difficulty:{" "}
                  {item.difficulty}
                </p>

                <p>
                  Score:{" "}
                  {item.score ?? "Not completed"} /{" "}
                  {item.total_questions}
                </p>

                <small>
                  {item.created_at
                    ? new Date(
                        item.created_at
                      ).toLocaleString()
                    : ""}
                </small>
              </div>
            ))
          )}
        </article>
      </section>
    </main>
  );
}

export default App;