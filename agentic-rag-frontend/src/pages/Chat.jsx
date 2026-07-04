import React, { useState, useEffect } from 'react';
import MessageBubble from '../components/MessageBubble';

export default function Chat() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { sender: 'user', text: 'How to apply for scholarship?' },
    { sender: 'bot', text: 'You can apply through the Scholarship Portal.\n\nRequired documents: Aadhar, Income Certificate, Transcripts.' }
  ]);
  
  const [loading, setLoading] = useState(false);
  const [typingText, setTypingText] = useState("");  // ⬅ animation text
  const [showFeedback, setShowFeedback] = useState(false);

  // ★ Function to type text like ChatGPT
  const typeText = (fullText) => {
    setTypingText("");
    let idx = 0;

    const interval = setInterval(() => {
      setTypingText(prev => prev + fullText[idx]);
      idx++;

      if (idx === fullText.length) {
        clearInterval(interval);

        // Push final completed message
        setMessages(prev => [...prev, { sender: "bot", text: fullText }]);

        // Show like/dislike for this message
        setShowFeedback(true);
        setTypingText(""); 
      }
    }, 20);  
  };

  const send = async () => {
    if (!input.trim()) return;

    // Add user message
    setMessages(prev => [...prev, { sender: 'user', text: input }]);
    
    const q = input;
    setInput('');
    setLoading(true);
    setShowFeedback(false);  

    try {
      const res = await fetch("http://127.0.0.1:8000/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q })
      });

      const data = await res.json();

      // START typing animation
      typeText(data.answer);

    } catch (e) {
      typeText("Backend error.");
    }

    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      
      {/* CHAT WINDOW */}
      <div className="chatWindow">
        {messages.map((m, i) => <MessageBubble key={i} {...m} />)}

        {/* Animated typing bubble */}
        {typingText && (
          <div className="msgBot typing-bubble">
            {typingText}
            <span className="cursor">▌</span>
          </div>
        )}

        {loading && <div className="msgBot">Thinking...</div>}
      </div>

      {/* FEEDBACK (Appears ONLY at the end of bot message) */}
{showFeedback && (
  <div className="feedback" style={{ alignSelf: "flex-start", marginTop: "8px" }}>
    <span style={{ marginRight: "10px", color: "#555" }}>Was this helpful?</span>
    <button className="like-btn">👍</button>
    <button className="dislike-btn">👎</button>
  </div>
)}


      {/* INPUT BAR */}
      <div className="inputBar">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask something..."
          onKeyDown={(e) => e.key === 'Enter' && send()}
        />
        <button onClick={send}>Send</button>
      </div>
    </div>
  );
}
