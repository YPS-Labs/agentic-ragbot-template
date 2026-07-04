import student1 from "../assets/student1.png";
import student2 from "../assets/student2.png";

import React from "react";
import "./Dashboard.css";

import logoLeft from "../assets/logo-left.png";      
import logoRight from "../assets/logo-right.png";    

export default function Dashboard() {
  const team = [
    { 
      name: "POOJA POTE",
      role: "Frontend + Data Engineer ",
      mail: "poojapote2003@gmail.com",
      github: "https://github.com/Pooja-Pote18",
      img: student1
    },
  {
  name: "SHANTANU VHANMORE",
  role: "AI Engineer",
  mail: "shantanuvhanmore@gmail.com",
  github: "https://github.com/shantanuvhanmore",
  //linkedin: "https://www.linkedin.com/in/shantanuvhanmore/",
  img: student2
},
    { 
      name: "YASIR SHAIKH",
      role: "Backend Developer",
      mail: "yasirshaikhpune@gmail.com",
      github: "https://github.com/YasirShaikh786",
      img: ""
    }
  ];

  return (
    <div className="dashboard-container">

      {/* TOP SECTION: TWO LOGOS + TITLE */}
      <div className="header-section">

        <img 
          src={logoLeft} 
          className="logo-img"
          style={{ width: "150px", height: "150px" }}
          alt="College Logo Left" 
        />

        <div className="title-block">
          <h1 className="main-title">
            NMIET Agentic RAG-Based Chatbot
          </h1>
          <p className="college-text">
            <b>Department of Computer Engineering</b>
          </p>
        </div>

        <img 
          src={logoRight} 
          className="logo-img"
          style={{ width: "150px", height: "150px" }}
          alt="College Logo Right" 
        />
      </div>

      {/* TEAM SECTION */}
      <h2 className="section-heading">Project Developers</h2>

      <div className="team-grid">
        {team.map((member, i) => (
          <div key={i} className="team-card fade-in">

            <div className="photo-placeholder">
              {/* Show "Add Photo" if no image */}
              {!member.img && <span>Add Photo</span>}

              <img
                src={member.img}
                alt={member.name}
                style={{
                  display: member.img ? "block" : "none",
                  width: "110%",
                  height: "220px",
                  objectFit: "cover",
                  borderRadius: "18px",
                  marginBottom: "10px"
                }}
              />
            </div>

            <h3>{member.name}</h3>

            <p><strong>Role:</strong> {member.role}</p>

            {/* Email */}
            <p>
              <strong>Email:</strong>
              <br />
              <a 
                href={`mailto:${member.mail}`} 
                style={{ color: "#007bff", textDecoration: "none" }}
              >
                {member.mail}
              </a>
            </p>

            {/* GitHub */}
            <p>
              <strong>GitHub:</strong>
              <br />
              <a 
                href={member.github}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#007bff", textDecoration: "none" }}
              >
                Visit Profile
              </a>
            </p>

          </div>
        ))}
      </div>

      {/* BOTTOM DESCRIPTION */}
      <div
        style={{
          marginTop: "25px",
          padding: "15px",
          background: "#f8fafc",
          borderRadius: "10px",
          border: "1px solid #e2e8f0",
        }}
      >
        <p style={{ color: "#475569", lineHeight: "1.5" }}>
          This dashboard represents the core structure of the Agentic RAG-Based Chatbot system. It includes developer information, institutional details,
          and system overview. The project integrates multi-department knowledge handling, parallel RAG pipelines, and an agentic orchestrator for intelligent response generation.
        </p>
      </div>

    </div>
  );
}
