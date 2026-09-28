import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./App.css";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://studysphere-ai-s6iv.onrender.com";

function MarkdownAnswer({ content }) {
  if (!content) {
    return null;
  }

  return (
    <div className="ai-answer">
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

  const [topic, setTopic] = useState("Python basics");
  const [difficulty, setDifficulty] = useState("Easy");
  const [count, setCount] = useState("5");
  const [quiz, setQuiz] = useState([]);
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

      if (!response.ok) {
        throw new Error(
          data?.details ||
            data?.message ||
            `Request failed with status ${response.status}`
        );
      }

      if (data?.success === false) {
        throw new Error(
          data?.details || data?.message || "The AI could not answer the question."
        );
      }

      const returnedAnswer =
        data?.answer ||
        data?.response ||
        data?.content ||
        data?.result ||
        "";

      if (!returnedAnswer) {
        throw new Error("The server returned an empty answer.");
      }

      setAnswer(String(returnedAnswer));
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

      if (!response.ok) {
        throw new Error(
          data?.details ||
            data?.message ||
            `Request failed with status ${response.status}`
        );
      }

      if (data?.success === false) {
        throw new Error(
          data?.details || data?.message || "The quiz could not be generated."
        );
      }

      const questions =
        data?.questions ||
        data?.quiz ||
        data?.data ||
        [];

      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error("The server returned no quiz questions.");
      }

      setQuiz(questions);
    } catch (error) {
      setQuizError(
        error?.message || "Unable to connect to the AI service."
      );
    } finally {
      setLoadingQuiz(false);
    }
  }

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
            <MarkdownAnswer content={answer} />
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

        <form className="form" onSubmit={generateQuiz}>
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
          <div className="quiz-list">
            {quiz.map((item, index) => {
              const questionText =
                item?.question || item?.prompt || `Question ${index + 1}`;

              const options = Array.isArray(item?.options)
                ? item.options
                : Array.isArray(item?.choices)
                  ? item.choices
                  : [];

              const correctAnswer =
                item?.answer ||
                item?.correctAnswer ||
                item?.correct_answer ||
                "";

              const explanation =
                item?.explanation || item?.reason || "";

              return (
                <article
                  className="quiz-question"
                  key={`${index}-${questionText}`}
                >
                  <h3>
                    {index + 1}. {questionText}
                  </h3>

                  {options.length > 0 && (
                    <div className="options">
                      {options.map((option, optionIndex) => (
                        <div
                          className="option"
                          key={`${optionIndex}-${String(option)}`}
                        >
                          <strong>
                            {String.fromCharCode(65 + optionIndex)}.
                          </strong>

                          <span>{String(option)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {correctAnswer && (
                    <p className="correct-answer">
                      <strong>Answer:</strong> {String(correctAnswer)}
                    </p>
                  )}

                  {explanation && (
                    <div className="explanation">
                      <MarkdownAnswer content={String(explanation)} />
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