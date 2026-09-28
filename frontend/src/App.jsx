import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./App.css";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://studysphere-ai-s6iv.onrender.com";

function App() {
  const [question, setQuestion] = useState("");
  const [subject, setSubject] = useState("");
  const [answer, setAnswer] = useState("");
  const [loadingAnswer, setLoadingAnswer] = useState(false);
  const [answerError, setAnswerError] = useState("");

  const [topic, setTopic] = useState("Python basics");
  const [difficulty, setDifficulty] = useState("Easy");
  const [count, setCount] = useState(5);
  const [quiz, setQuiz] = useState([]);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [quizError, setQuizError] = useState("");

  async function askDoubt(event) {
    event.preventDefault();

    if (!question.trim()) {
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
          question: question.trim(),
          subject: subject.trim() || "General"
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.details || data.message || "Unable to generate AI answer"
        );
      }

      setAnswer(data.answer || "No answer was returned.");
    } catch (error) {
      setAnswerError(error.message || "Unable to generate AI answer");
    } finally {
      setLoadingAnswer(false);
    }
  }

  async function generateQuiz(event) {
    event.preventDefault();

    if (!topic.trim()) {
      setQuizError("Please enter a topic.");
      return;
    }

    setLoadingQuiz(true);
    setQuizError("");
    setQuiz([]);

    try {
      const response = await fetch(`${API_URL}/api/ai/quiz`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          topic: topic.trim(),
          difficulty,
          count: Number(count)
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.details || data.message || "Unable to generate quiz"
        );
      }

      setQuiz(Array.isArray(data.questions) ? data.questions : []);
    } catch (error) {
      setQuizError(error.message || "Unable to generate quiz");
    } finally {
      setLoadingQuiz(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">StudySphere</p>
          <h1>Study Assistant</h1>
          <p className="subtitle">
            Ask questions, understand concepts, and practice with AI.
          </p>
        </div>
      </header>

      <section className="card">
        <div className="card-heading">
          <div>
            <p className="section-label">AI tutor</p>
            <h2>Ask a doubt</h2>
          </div>
        </div>

        <form onSubmit={askDoubt} className="form">
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
            rows="5"
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
            <div className="ai-answer">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {answer}
              </ReactMarkdown>
            </div>
          </article>
        )}
      </section>

      <section className="card">
        <div className="card-heading">
          <div>
            <p className="section-label">Practice mode</p>
            <h2>Generate a quiz</h2>
          </div>
        </div>

        <form onSubmit={generateQuiz} className="form">
          <label htmlFor="topic">Topic</label>
          <input
            id="topic"
            type="text"
            placeholder="For example: Python basics"
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

          <label htmlFor="count">Questions</label>
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
          <div className="quiz-list">
            {quiz.map((item, index) => (
              <article className="quiz-question" key={`${index}-${item.question}`}>
                <h3>
                  {index + 1}. {item.question}
                </h3>

                <div className="options">
                  {Array.isArray(item.options) &&
                    item.options.map((option, optionIndex) => (
                      <div className="option" key={`${optionIndex}-${option}`}>
                        <strong>{String.fromCharCode(65 + optionIndex)}.</strong>
                        <span>{option}</span>
                      </div>
                    ))}
                </div>

                <p className="correct-answer">
                  <strong>Answer:</strong> {item.answer}
                </p>

                {item.explanation && (
                  <div className="explanation">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {item.explanation}
                    </ReactMarkdown>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default App;