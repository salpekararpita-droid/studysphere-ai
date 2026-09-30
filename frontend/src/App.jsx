import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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

function MarkdownContent({ content }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]}>
      {content || ""}
    </ReactMarkdown>
  );
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleString();
}

function App() {
  const [sessionId] = useState(getSessionId);

  const [question, setQuestion] = useState("");
  const [subject, setSubject] = useState("");
  const [answer, setAnswer] = useState("");
  const [doubtError, setDoubtError] = useState("");
  const [loadingAnswer, setLoadingAnswer] =
    useState(false);

  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] =
    useState("Easy");
  const [count, setCount] = useState(5);

  const [quiz, setQuiz] = useState([]);
  const [quizId, setQuizId] = useState("");
  const [selectedAnswers, setSelectedAnswers] =
    useState({});
  const [checkedAnswers, setCheckedAnswers] =
    useState({});
  const [quizError, setQuizError] = useState("");
  const [loadingQuiz, setLoadingQuiz] =
    useState(false);

  const [previousDoubts, setPreviousDoubts] =
    useState([]);
  const [previousQuizzes, setPreviousQuizzes] =
    useState([]);
  const [historyTab, setHistoryTab] =
    useState("doubts");
  const [historyError, setHistoryError] =
    useState("");
  const [historyLoading, setHistoryLoading] =
    useState(false);

  async function askDoubt(event) {
    event.preventDefault();

    const cleanQuestion = question.trim();
    const cleanSubject =
      subject.trim() || "General";

    if (!cleanQuestion) {
      setDoubtError("Please enter a question.");
      return;
    }

    setLoadingAnswer(true);
    setDoubtError("");
    setAnswer("");

    try {
      const response = await fetch(
        `${API_URL}/api/ai/doubt`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            question: cleanQuestion,
            subject: cleanSubject,
            sessionId
          })
        }
      );

      const data = await response.json();

      if (!response.ok || data?.success === false) {
        throw new Error(
          data?.message ||
            "Unable to generate an answer."
        );
      }

      setAnswer(data.answer || "");
    } catch (error) {
      setDoubtError(
        error?.message ||
          "Unable to connect to the backend."
      );
    } finally {
      setLoadingAnswer(false);
    }
  }

  async function generateQuiz(event) {
    event.preventDefault();

    const cleanTopic = topic.trim();

    if (!cleanTopic) {
      setQuizError("Please enter a quiz topic.");
      return;
    }

    setLoadingQuiz(true);
    setQuizError("");
    setQuiz([]);
    setQuizId("");
    setSelectedAnswers({});
    setCheckedAnswers({});

    try {
      const response = await fetch(
        `${API_URL}/api/ai/quiz`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            topic: cleanTopic,
            difficulty,
            count: Number(count),
            sessionId
          })
        }
      );

      const data = await response.json();

      if (!response.ok || data?.success === false) {
        throw new Error(
          data?.message ||
            "Unable to generate the quiz."
        );
      }

      setQuizId(data.quizId || "");
      setQuiz(data.questions || []);
    } catch (error) {
      setQuizError(
        error?.message ||
          "Unable to connect to the backend."
      );
    } finally {
      setLoadingQuiz(false);
    }
  }

  function selectAnswer(questionIndex, option) {
    if (checkedAnswers[questionIndex]) {
      return;
    }

    setSelectedAnswers((previous) => ({
      ...previous,
      [questionIndex]: option
    }));
  }

  function checkAnswer(questionIndex) {
    setCheckedAnswers((previous) => ({
      ...previous,
      [questionIndex]: true
    }));
  }

  function isCorrect(questionIndex) {
    return (
      selectedAnswers[questionIndex] ===
      quiz[questionIndex]?.answer
    );
  }

  const checkedCount =
    Object.keys(checkedAnswers).length;

  const score = quiz.reduce(
    (total, item, index) => {
      if (
        checkedAnswers[index] &&
        selectedAnswers[index] === item.answer
      ) {
        return total + 1;
      }

      return total;
    },
    0
  );

  async function saveQuizResult() {
    if (
      !quizId ||
      quiz.length === 0 ||
      checkedCount !== quiz.length
    ) {
      return;
    }

    try {
      const answers = quiz.map((item, index) => ({
        questionId: item.id,
        selectedAnswer:
          selectedAnswers[index] || "",
        isCorrect:
          selectedAnswers[index] === item.answer
      }));

      await fetch(
        `${API_URL}/api/ai/quiz/${quizId}/result`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            sessionId,
            score,
            totalQuestions: quiz.length,
            answers
          })
        }
      );
    } catch (error) {
      console.error(
        "Unable to save quiz result:",
        error
      );
    }
  }

  async function loadDoubtHistory() {
    setHistoryTab("doubts");
    setHistoryLoading(true);
    setHistoryError("");

    try {
      const response = await fetch(
        `${API_URL}/api/history/doubts?sessionId=${encodeURIComponent(
          sessionId
        )}`
      );

      const data = await response.json();

      if (!response.ok || data?.success === false) {
        throw new Error(
          data?.message ||
            "Unable to load previous doubts."
        );
      }

      setPreviousDoubts(data.doubts || []);
    } catch (error) {
      setHistoryError(
        error?.message ||
          "Unable to load previous doubts."
      );
    } finally {
      setHistoryLoading(false);
    }
  }

  async function loadQuizHistory() {
    setHistoryTab("quizzes");
    setHistoryLoading(true);
    setHistoryError("");

    try {
      const response = await fetch(
        `${API_URL}/api/history/quizzes?sessionId=${encodeURIComponent(
          sessionId
        )}`
      );

      const data = await response.json();

      if (!response.ok || data?.success === false) {
        throw new Error(
          data?.message ||
            "Unable to load previous quizzes."
        );
      }

      setPreviousQuizzes(data.quizzes || []);
    } catch (error) {
      setHistoryError(
        error?.message ||
          "Unable to load previous quizzes."
      );
    } finally {
      setHistoryLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <p className="eyebrow">AI learning companion</p>
        <h1>StudySphere AI</h1>
        <p className="hero-text">
          Ask questions, generate quizzes, and review
          your learning history.
        </p>
      </header>

      <section className="card">
        <div className="card-heading">
          <div>
            <p className="section-label">
              Ask your tutor
            </p>
            <h2>Clear your doubts</h2>
          </div>
        </div>

        <form onSubmit={askDoubt}>
          <label htmlFor="subject">
            Subject
          </label>

          <input
            id="subject"
            value={subject}
            onChange={(event) =>
              setSubject(event.target.value)
            }
            placeholder="For example: Biology"
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
            placeholder="Ask an academic question..."
            rows={5}
          />

          <button
            type="submit"
            disabled={loadingAnswer}
          >
            {loadingAnswer
              ? "Generating..."
              : "Ask AI"}
          </button>
        </form>

        {doubtError && (
          <div className="error-box">
            {doubtError}
          </div>
        )}

        {answer && (
          <article className="answer-box">
            <p className="section-label">
              AI explanation
            </p>

            <MarkdownContent content={answer} />
          </article>
        )}
      </section>

      <section className="card">
        <div className="card-heading">
          <div>
            <p className="section-label">
              Practice
            </p>
            <h2>Generate a quiz</h2>
          </div>
        </div>

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
            placeholder="For example: JavaScript basics"
          />

          <div className="form-grid">
            <div>
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
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            <div>
              <label htmlFor="count">
                Questions
              </label>

              <select
                id="count"
                value={count}
                onChange={(event) =>
                  setCount(Number(event.target.value))
                }
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={20}>20</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loadingQuiz}
          >
            {loadingQuiz
              ? "Generating..."
              : "Generate quiz"}
          </button>
        </form>

        {quizError && (
          <div className="error-box">
            {quizError}
          </div>
        )}

        {quiz.length > 0 && (
          <div className="quiz-list">
            {quiz.map((item, index) => {
              const hasBeenChecked =
                Boolean(checkedAnswers[index]);

              return (
                <article
                  className="quiz-question"
                  key={item.id || index}
                >
                  <p className="question-number">
                    Question {index + 1}
                  </p>

                  <h3>{item.question}</h3>

                  <div className="options">
                    {item.options.map((option) => {
                      const isSelected =
                        selectedAnswers[index] ===
                        option;

                      return (
                        <label
                          className={
                            isSelected
                              ? "option selected"
                              : "option"
                          }
                          key={option}
                        >
                          <input
                            type="radio"
                            name={`question-${index}`}
                            value={option}
                            checked={isSelected}
                            disabled={hasBeenChecked}
                            onChange={() =>
                              selectAnswer(
                                index,
                                option
                              )
                            }
                          />

                          <span>{option}</span>
                        </label>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    disabled={
                      !selectedAnswers[index] ||
                      hasBeenChecked
                    }
                    onClick={() =>
                      checkAnswer(index)
                    }
                  >
                    {hasBeenChecked
                      ? "Answer checked"
                      : "Check answer"}
                  </button>

                  {hasBeenChecked && (
                    <div
                      className={
                        isCorrect(index)
                          ? "result correct"
                          : "result incorrect"
                      }
                    >
                      <strong>
                        {isCorrect(index)
                          ? "Correct!"
                          : "Wrong answer"}
                      </strong>

                      <p>
                        Correct answer:{" "}
                        {item.answer}
                      </p>

                      <p>{item.explanation}</p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {quiz.length > 0 && (
          <div className="score-box">
            <p>
              Checked: {checkedCount} /{" "}
              {quiz.length}
            </p>

            <p>
              Current score: {score} /{" "}
              {quiz.length}
            </p>

            {checkedCount === quiz.length && (
              <>
                <p>
                  Percentage:{" "}
                  {Math.round(
                    (score / quiz.length) * 100
                  )}
                  %
                </p>

                <button
                  type="button"
                  onClick={saveQuizResult}
                >
                  Save final result
                </button>
              </>
            )}
          </div>
        )}
      </section>

      <section className="card history-card">
        <div className="card-heading">
          <div>
            <p className="section-label">
              Database history
            </p>
            <h2>Previous activity</h2>
          </div>
        </div>

        <div className="history-tabs">
          <button
            type="button"
            className={
              historyTab === "doubts"
                ? "history-tab active"
                : "history-tab"
            }
            onClick={loadDoubtHistory}
          >
            Previous doubts
          </button>

          <button
            type="button"
            className={
              historyTab === "quizzes"
                ? "history-tab active"
                : "history-tab"
            }
            onClick={loadQuizHistory}
          >
            Previous quizzes
          </button>
        </div>

        {historyLoading && (
          <p className="history-message">
            Loading history...
          </p>
        )}

        {historyError && (
          <div className="error-box">
            {historyError}
          </div>
        )}

        {!historyLoading &&
          historyTab === "doubts" &&
          previousDoubts.length === 0 && (
            <p className="history-message">
              No previous doubts found.
            </p>
          )}

        {historyTab === "doubts" &&
          previousDoubts.length > 0 && (
            <div className="history-list">
              {previousDoubts.map((item) => (
                <article
                  className="history-item"
                  key={item.id}
                >
                  <p className="history-meta">
                    {item.subject} ·{" "}
                    {formatDate(item.created_at)}
                  </p>

                  <h3>{item.question}</h3>

                  <details>
                    <summary>View answer</summary>

                    <div className="history-answer">
                      <MarkdownContent
                        content={item.answer}
                      />
                    </div>
                  </details>
                </article>
              ))}
            </div>
          )}

        {!historyLoading &&
          historyTab === "quizzes" &&
          previousQuizzes.length === 0 && (
            <p className="history-message">
              No previous quizzes found.
            </p>
          )}

        {historyTab === "quizzes" &&
          previousQuizzes.length > 0 && (
            <div className="history-list">
              {previousQuizzes.map((item) => (
                <article
                  className="history-item"
                  key={item.id}
                >
                  <p className="history-meta">
                    {item.difficulty} ·{" "}
                    {formatDate(item.created_at)}
                  </p>

                  <h3>{item.topic}</h3>

                  <p>
                    Score:{" "}
                    {item.score === null
                      ? "Not completed"
                      : `${item.score} / ${item.total_questions}`}
                  </p>

                  <details>
                    <summary>
                      Review quiz
                    </summary>

                    <div className="review-questions">
                      {item.quiz_questions?.map(
                        (questionItem) => (
                          <div
                            className="review-question"
                            key={questionItem.id}
                          >
                            <strong>
                              {questionItem.question}
                            </strong>

                            <p>
                              Correct answer:{" "}
                              {questionItem.answer}
                            </p>

                            <p>
                              {
                                questionItem.explanation
                              }
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  </details>
                </article>
              ))}
            </div>
          )}
      </section>
    </main>
  );
}

export default App;