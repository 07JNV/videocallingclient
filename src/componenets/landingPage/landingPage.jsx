import React from "react";
import { useNavigate } from "react-router-dom";
import "./landingPage.css";

export default function SplineEmbed() {
  const navigate = useNavigate();
  return (
    <div className="spline-container">
      <iframe
        src="https://my.spline.design/roomrelaxingcopy-2d746c9f956e0984b7f1105eff9593e7/"
        className="spline-iframe"
        title="Spline Design"
      ></iframe>

      <div className="overlay-container">
        <h3>About Our App</h3>
        <p>
          Explore our advanced video calling app, featuring screen sharing,
          recording, and real-time collaboration. Designed for seamless
          communication, perfect for work and personal use.
        </p>

        <button className="overlay-button" onClick={() => navigate("/voip")}>
          Get Started
        </button>
      </div>
    </div>
  );
}
