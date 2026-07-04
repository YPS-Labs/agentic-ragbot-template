import React from 'react';
import ReactMarkdown from 'react-markdown';
import { FaRobot } from 'react-icons/fa';
import './MessageBubble.css';


/* INLINE SVGS TO GUARANTEE RENDERING */
const ThumbsUp = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feedback-action-icon">
    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3z"></path>
    <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
  </svg>
);

const ThumbsDown = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feedback-action-icon">
    <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3z"></path>
    <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path>
  </svg>
);

const Copy = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feedback-action-icon">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  </svg>
);

const Check = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feedback-action-icon">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

export default function MessageBubble({ id, type, text, feedback, onFeedbackChange, isTyping }) {

  const [copied, setCopied] = React.useState(false);

  // console.log("Bubble:", {
  //   text,
  //   isTyping,
  //   type
  // });

  const handleFeedback = (value) => {
    if (onFeedbackChange && id) {
      onFeedbackChange(id, value);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (

    <div className={`message-wrapper ${type}`}>
      {console.log("MessageBubble rendered")}
      {type === 'bot' && (
        <div className="message-avatar bot-avatar">
          <FaRobot className="bot-icon" />
        </div>
      )}

      <div className="message-content-wrapper">
        <div className={`message-bubble ${type} ${isTyping ? 'typing' : ''}`}>
          {type === 'bot' ? (
            <div className="markdown-content">
              <ReactMarkdown
                components={{
                  a: ({ node, ...props }) => (
                    <a {...props} target="_blank" rel="noopener noreferrer" className="markdown-link" />
                  ),
                  code: ({ node, inline, ...props }) => (
                    inline ?
                      <code className="inline-code" {...props} /> :
                      <code className="code-block" {...props} />
                  ),
                  ul: ({ node, ...props }) => <ul className="markdown-list" {...props} />,
                  ol: ({ node, ...props }) => <ol className="markdown-list ordered" {...props} />,
                  p: ({ node, ...props }) => <p className="markdown-paragraph" {...props} />
                }}
              >
                {text}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="message-text">{text}</p>
          )}
        </div>

        {/* Actions for bot messages */}
        {type === 'bot' && !isTyping && (
          <div className="message-actions">
            <button
              className={`feedback-action-btn ${feedback === 'liked' ? 'active liked' : ''}`}
              onClick={() => handleFeedback(feedback === 'liked' ? 'none' : 'liked')}
              aria-label="Like"
              title={id ? "Helpful response" : "Loading..."}
            >
              <ThumbsUp />
            </button>
            <button
              className={`feedback-action-btn ${feedback === 'disliked' ? 'active disliked' : ''}`}
              onClick={() => handleFeedback(feedback === 'disliked' ? 'none' : 'disliked')}
              aria-label="Dislike"
              title={id ? "Needs improvement" : "Loading..."}
            >
              <ThumbsDown />
            </button>
            <button
              className="feedback-action-btn copy-btn"
              onClick={handleCopy}
              title="Copy to clipboard"
            >
              {copied ? <Check /> : <Copy />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
