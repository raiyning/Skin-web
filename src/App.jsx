import React from 'react';

export default function App() {
  return (
    <div className="page">
      <div className="bg" aria-hidden="true" />
      <div className="container">
        <header className="header">
          <div className="brand">
            <img src="/logo.svg" alt="Brand" className="logo" />
            <span className="name">Skin</span>
          </div>
        </header>

        <main className="hero">
          <p className="eyebrow">A fresh glow is coming</p>
          <h1 className="title">We’re launching soon</h1>
          <p className="subtitle">Be the first to know when we drop. No spam, ever.</p>

          <form className="signup" onSubmit={(e) => e.preventDefault()}>
            <input
              className="input"
              type="email"
              placeholder="Enter your email"
              aria-label="Email address"
            />
            <button className="button" type="submit">Notify me</button>
          </form>

          <p className="disclaimer">By subscribing you agree to our updates. Unsubscribe anytime.</p>
        </main>

        <footer className="footer">
          <span>© {new Date().getFullYear()} Skin</span>
          <a href="#" className="link">Privacy</a>
        </footer>
      </div>
    </div>
  );
}

