import { useEffect, useState } from "react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function App() {
  const [question, setQuestion] = useState("");
  const [subject, setSubject] = useState("General");
  const [answer, setAnswer] = useState("");
  const [questionLoading, setQuestionLoading] = useState(false);
  const [questionError, setQuestionError] = useState("");

  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [count, setCount] = useState(5);
  const [quiz, setQuiz] = useState(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState("");

  const [progress, setProgress] = useState(null);

  useEffect(() => {
    loadProgress();
  }, []);

  async function loadProgress() {
    try {
      const response = await fetch(`${API_URL}/api/progress`);

      if (!response.ok) {
        throw new Error("Unable to load progress.");
      }

      const data = await response.json();
      setProgress(data);
    } catch (error) {
      console.error(error);
    }
  }

  async function handleDoubtSubmit(event) {
    event.preventDefault();

    setQuestionError("");
    setAnswer("");

    if (question.trim().length < 3) {
      setQuestionError("Please enter a longer question.");
      return;
    }

    setQuestionLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/ai/doubt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          question,
          subject
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to solve the doubt.");
      }

      setAnswer(data.answer);
      await loadProgress();
    } catch (error) {
      setQuestionError(error.message);
    } finally {
      setQuestionLoading(false);
    }
  }

  async function handleQuizSubmit(event) {
    event.preventDefault();

    setQuizError("");
    setQuiz(null);

    if (topic.trim().length < 2) {
      setQuizError("Please enter a quiz topic.");
      return;
    }

    setQuizLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/ai/quiz`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          topic,
          difficulty,
          count: Number(count)
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to generate quiz.");
      }

      setQuiz(data);
      await loadProgress();
    } catch (error) {
      setQuizError(error.message);
    } finally {
      setQuizLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <p className="eyebrow">AI-powered learning</p>
        <h1>StudySphere</h1>
        <p className="hero-text">
          Ask questions, generate quizzes, and track your learning progress.
        </p>
      </header>

      <section className="stats-grid">
        <div className="stat-card">
          <strong>{progress?.totalSessions ?? 0}</strong>
          <span>Total sessions</span>
        </div>

        <div className="stat-card">
          <strong>{progress?.doubtCount ?? 0}</strong>
          <span>Doubts solved</span>
        </div>

        <div className="stat-card">
          <strong>{progress?.quizCount ?? 0}</strong>
          <span>Quiz sessions</span>
        </div>
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel-heading">
            <p className="eyebrow">Study assistant</p>
            <h2>Ask a doubt</h2>
          </div>

          <form onSubmit={handleDoubtSubmit}>
            <label htmlFor="subject">Subject</label>
            <input
              id="subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="e.g. Biology"
            />

            <label htmlFor="question">Your question</label>
            <textarea
              id="question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="What would you like to understand?"
              rows="6"
            />

            <button type="submit" disabled={questionLoading}>
              {questionLoading ? "Thinking..." : "Explain this"}
            </button>
          </form>

          {questionError && <p className="error">{questionError}</p>}

          {answer && (
            <div className="result-box">
              <h3>Answer</h3>
              <p className="answer-text">{answer}</p>
            </div>
          )}
        </article>

        <article className="panel">
          <div className="panel-heading">
            <p className="eyebrow">Practice mode</p>
            <h2>Generate a quiz</h2>
          </div>

          <form onSubmit={handleQuizSubmit}>
            <label htmlFor="topic">Topic</label>
            <input
              id="topic"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="e.g. JavaScript basics"
            />

            <label htmlFor="difficulty">Difficulty</label>
            <select
              id="difficulty"
              value={difficulty}
              onChange={(event) => setDifficulty(event.target.value)}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
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

            <button type="submit" disabled={quizLoading}>
              {quizLoading ? "Creating..." : "Generate quiz"}
            </button>
          </form>

          {quizError && <p className="error">{quizError}</p>}

          {quiz && (
            <div className="result-box">
              <h3>{quiz.title}</h3>

              {quiz.questions.map((item, index) => (
                <div className="quiz-question" key={`${item.question}-${index}`}>
                  <strong>
                    {index + 1}. {item.question}
                  </strong>

                  <ol type="A">
                    {item.options.map((option) => (
                      <li key={option}>{option}</li>
                    ))}
                  </ol>

                  <p className="explanation">
                    Answer: {item.options[item.answer]}
                    <br />
                    {item.explanation}
                  </p>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </main>
  );
}

export default App;