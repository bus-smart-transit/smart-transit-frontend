import React, { useState } from 'react';

export default function LoginPage({ onLoginSuccess }) {
  const [chauffeurId, setChauffeurId] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();

    const correctID = "CFR-2026-001";
    const correctPassword = "123";

    if (chauffeurId === correctID && password === correctPassword) {
      alert("Login Successful!");
      if (onLoginSuccess) {
        onLoginSuccess(); // Lilipat papuntang Start Shift Page!
      }
    } else {
      alert("Chauffeur ID or Password Incorrect!\n\nTest Account:\nID: CFR-2026-001\nPassword: 123");
    }
  };

  return (
    <div className="login-card">
      <div className="left-panel">
        <div className="brand-text">
          <h1>Bus Operator</h1>
          <h2>FLEET MANAGEMENT:<br />CHAUFFEUR PORTAL</h2>
        </div>
        <div className="bus-icon">
          <i className="fa-solid fa-bus"></i>
        </div>
      </div>

      <div className="right-panel">
        <h2>Sign In</h2>
        <p className="subtitle">Please enter the credentials provided by your Bus Operator administrator.</p>

        <form id="loginForm" onSubmit={handleLogin}>
          <div className="input-group">
            <label htmlFor="chauffeur-id">Chauffeur ID</label>
            <input 
              type="text" 
              id="chauffeur-id" 
              placeholder="e.g. CFR-2026-001" 
              value={chauffeurId}
              onChange={(e) => setChauffeurId(e.target.value)}
              required 
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input 
              type="password" 
              id="password" 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>

          <button type="submit" className="btn-signin">SIGN IN</button>
        </form>

        <div className="footer-links">
          <p>Forgot your operator-issued credentials?</p>
          <a href="#">Contact Dispatcher</a>
        </div>
      </div>
    </div>
  );
}