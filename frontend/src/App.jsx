import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./App.css";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://studysphere-ai-s6iv.onrender.com";

function MarkdownContent({ content }) {
  if (!content) return null;

  return (
    <div className="markdown-content">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {String(content)}
      </ReactMarkdown>
    </div>
  );
}

function App() {
  const [question, setQuestion] = useState("");
  const [subject, setSubject] = useState("");
  const [answer, setAnswer] = useState("");
  const [answerError, setAnswerError] = useState("");
  const [loadingAnswer, setLoadingAnswer] = useState(false);

  const [topic, setTopic] = useState(" ");
  const [difficulty, setDifficulty] = useState("Easy");
  const [count, setCount] = useState("5");

  const [quiz, setQuiz] = useState([]);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [checkedAnswers, setCheckedAnswers] = useState({});
  const [quizError, setQuizError] = useState("");
  const [loadingQuiz, setLoadingQuiz] = useState(false);

  async function askDoubt(event) {
    event.preventDefault();

    const cleanQuestion = question.trim();
    const cleanSubject = subject.trim() || "General";

    if (!cleanQuestion) {
      setAnswerError("Please enter a question.");
      return;
    }

    setLoadingAnswer(true);
    setAnswerError("");
    setAnswer("");

    try {
      const response = await fetch(`${API_URL}/api/ai/doubt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          question: cleanQuestion,
          subject: cleanSubject
        })
      });

      const data = await response.json();

      if (!response.ok || data?.success === false) {
        throw new Error(
          data?.details ||
            data?.message ||
            `Request failed with status ${response.status}`
        );
      }

      if (!data?.answer) {
        throw new Error("The server returned an empty answer.");
      }

      setAnswer(String(data.answer));
    } catch (error) {
      setAnswerError(
        error?.message || "Unable to connect to the AI service."
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
    setSelectedAnswers({});
    setCheckedAnswers({});

    try {
      const response = await fetch(`${API_URL}/api/ai/quiz`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          topic: cleanTopic,
          difficulty,
          count: Number(count)
        })
      });

      const data = await response.json();

      if (!response.ok || data?.success === false) {
        throw new Error(
          data?.details ||
            data?.message ||
            `Request failed with status ${response.status}`
        );
      }

      if (!Array.isArray(data?.questions) || data.questions.length === 0) {
        throw new Error("The server returned no quiz questions.");
      }

      setQuiz(data.questions);
    } catch (error) {
      setQuizError(
        error?.message || "Unable to connect to the AI service."
      );
    } finally {
      setLoadingQuiz(false);
    }
  }

  function selectAnswer(questionIndex, option) {
    if (checkedAnswers[questionIndex]) return;

    setSelectedAnswers((previous) => ({
      ...previous,
      [questionIndex]: option
    }));
  }

  function checkAnswer(questionIndex) {
    if (!selectedAnswers[questionIndex]) return;

    setCheckedAnswers((previous) => ({
      ...previous,
      [questionIndex]: true
    }));
  }

  function isCorrect(questionIndex) {
    return (
      selectedAnswers[questionIndex] === quiz[questionIndex]?.answer
    );
  }

  const checkedCount = Object.keys(checkedAnswers).length;

  const score = quiz.reduce((total, item, index) => {
    return total + (isCorrect(index) ? 1 : 0);
  }, 0);

  return (
    <main className="app-shell">
      <header className="app-header">
        <p className="eyebrow">StudySphere</p>
        <h1>Study Assistant</h1>
        <p className="subtitle">
          Ask questions, understand concepts, and practice with AI.
        </p>
      </header>

      <section className="card">
        <div className="card-heading">
          <div>
            <p className="section-label">AI tutor</p>
            <h2>Ask a doubt</h2>
          </div>
        </div>

        <form className="form" onSubmit={askDoubt}>
          <label htmlFor="subject">Subject</label>

          <input
            id="subject"
            type="text"
            placeholder="For example: Science"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
          />

          <label htmlFor="question">Your question</label>

          <textarea
            id="question"
            rows="6"
            placeholder="Explain this..."
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
          />

          <button type="submit" disabled={loadingAnswer}>
            {loadingAnswer ? "Generating answer..." : "Ask AI"}
          </button>
        </form>

        {answerError && (
          <div className="error-box" role="alert">
            {answerError}
          </div>
        )}

        {answer && (
          <article className="answer-box">
            <h3>AI answer</h3>
            <MarkdownContent content={answer} />
          </article>
        )}
      </section>

      <section className="card">
        <div className="card-heading">
          <div>
            <p className="section-label">Practice mode</p>
            <h2>Take a quiz</h2>
          </div>
        </div>

        <form className="form" onSubmit={generateQuiz}>
          <label htmlFor="topic">Topic</label>

          <input
            id="topic"
            type="text"
            placeholder="Enter a topic for the quiz"
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
          />

          <label htmlFor="difficulty">Difficulty</label>

          <select
            id="difficulty"
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value)}
          >
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>

          <label htmlFor="count">Number of questions</label>

          <select
            id="count"
            value={count}
            onChange={(event) => setCount(event.target.value)}
          >
            <option value="3">3</option>
            <option value="5">5</option>
            <option value="10">10</option>
          </select>

          <button type="submit" disabled={loadingQuiz}>
            {loadingQuiz ? "Generating quiz..." : "Generate quiz"}
          </button>
        </form>

        {quizError && (
          <div className="error-box" role="alert">
            {quizError}
          </div>
        )}

        {quiz.length > 0 && (
          <div className="quiz-summary">
            <span>
              Checked: {checkedCount} / {quiz.length}
            </span>

            {checkedCount === quiz.length && (
              <strong>
                Score: {score} / {quiz.length}
              </strong>
            )}
          </div>
        )}

        {quiz.length > 0 && (
          <div className="quiz-list">
            {quiz.map((item, index) => {
              const selectedAnswer = selectedAnswers[index];
              const isChecked = checkedAnswers[index];
              const correct = isCorrect(index);

              return (
                <article
                  className={`quiz-question ${
                    isChecked
                      ? correct
                        ? "question-correct"
                        : "question-wrong"
                      : ""
                  }`}
                  key={`${index}-${item.question}`}
                >
                  <h3>
                    {index + 1}. {item.question}
                  </h3>

                  <div className="quiz-options">
                    {item.options.map((option, optionIndex) => {
                      const isSelected = selectedAnswer === option;

                      return (
                        <label
                          className={`quiz-option ${
                            isSelected ? "selected" : ""
                          }`}
                          key={`${index}-${optionIndex}-${option}`}
                        >
                          <input
                            type="radio"
                            name={`question-${index}`}
                            value={option}
                            checked={isSelected}
                            disabled={isChecked}
                            onChange={() =>
                              selectAnswer(index, option)
                            }
                          />

                          <span className="option-letter">
                            {String.fromCharCode(65 + optionIndex)}.
                          </span>

                          <span>{option}</span>
                        </label>
                      );
                    })}
                  </div>

                  {!isChecked && (
                    <button
                      type="button"
                      className="check-button"
                      disabled={!selectedAnswer}
                      onClick={() => checkAnswer(index)}
                    >
                      Check answer
                    </button>
                  )}

                  {isChecked && (
                    <div
                      className={`result-box ${
                        correct ? "result-correct" : "result-wrong"
                      }`}
                    >
                      <strong>
                        {correct ? "Correct!" : "Wrong answer"}
                      </strong>

                      {!correct && (
                        <p>
                          Correct answer:{" "}
                          <strong>{item.answer}</strong>
                        </p>
                      )}

                      <div className="explanation">
                        <MarkdownContent content={item.explanation} />
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

export default App;