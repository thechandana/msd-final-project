import React, { useState } from "react";
import "./index.css";

function App() {
  const [resume, setResume] = useState("");
  const [jobDesc, setJobDesc] = useState("");
  const [highlightedResume, setHighlightedResume] = useState("");

  // Handle file upload (.txt only)
  const handleFileUpload = (event, type) => {
    const file = event.target.files[0];
    if (file && file.type === "text/plain") {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (type === "resume") {
          setResume(e.target.result);
        } else {
          setJobDesc(e.target.result);
        }
      };
      reader.readAsText(file);
    } else {
      alert("Please upload a .txt file only");
    }
  };

  // Highlight keywords from Job Description in Resume
  const handleSubmit = () => {
    if (!resume || !jobDesc) {
      alert("Please upload or paste both Resume and Job Description.");
      return;
    }
    // Extract keywords (unique, >3 chars, not common words)
    const keywords = Array.from(
      new Set(
        jobDesc
          .split(/\W+/)
          .map((w) => w.toLowerCase())
          .filter(
            (w) =>
              w.length > 3 &&
              !["with", "have", "this", "that", "your", "from", "when", "were", "will", "would", "these", "such", "about"].includes(w)
          )
      )
    );
    // Regex replace with <mark>
    let updatedResume = resume.replace(
      new RegExp(`\\b(${keywords.join("|")})\\b`, "gi"),
      (match) => `<mark>${match}</mark>`
    );
    setHighlightedResume(updatedResume);
  };

  return (
    <div className="container">
      <h1 className="title">📄 Resume Highlighter</h1>
      {/* Resume Section */}
      <div className="section">
        <h2>Upload / Paste Resume</h2>
        <textarea
          value={resume}
          onChange={(e) => setResume(e.target.value)}
          placeholder="Paste your resume text here..."
        />
        <input
          type="file"
          accept=".txt"
          onChange={(e) => handleFileUpload(e, "resume")}
        />
      </div>

      {/* Job Description Section */}
      <div className="section">
        <h2>Upload / Paste Job Description</h2>
        <textarea
          value={jobDesc}
          onChange={(e) => setJobDesc(e.target.value)}
          placeholder="Paste job description here..."
        />
        <input
          type="file"
          accept=".txt"
          onChange={(e) => handleFileUpload(e, "jd")}
        />
      </div>

      {/* Submit Button */}
      <button className="btn" onClick={handleSubmit}>
        Highlight Resume
      </button>

      {/* Output Section */}
      {highlightedResume && (
        <div className="section output">
          <h2>Highlighted Resume</h2>
          <div
            className="highlight-box"
            dangerouslySetInnerHTML={{ __html: highlightedResume }}
          />
        </div>
      )}
    </div>
  );
}

export default App;
