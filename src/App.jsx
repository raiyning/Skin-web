import React, { useEffect, useRef, useState } from 'react';

function useReveal({ threshold = 0.2, once = false } = {}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setVisible(true);
            if (once) obs.unobserve(el);
          } else if (!once) {
            setVisible(false);
          }
        });
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold, once]);
  return { ref, visible };
}

function Reveal({ children, delay = 0, className = '', once = false }) {
  const { ref, visible } = useReveal({ once });
  return (
    <div
      ref={ref}
      className={`reveal ${visible ? 'is-visible' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function useScrollGradient() {
  useEffect(() => {
    const root = document.documentElement;
    let ticking = false;

    const compute = () => {
      const max = Math.max(1, root.scrollHeight - window.innerHeight);
      const p = Math.min(1, Math.max(0, window.scrollY / max));
      const t = p; // linear; tweak if you want easing

      const angle = 150 + t * 40; // 150deg → 190deg
      const h1 = 145 + Math.sin(t * Math.PI * 2) * 12; // soft mint drift
      const h2 = 215 + Math.cos(t * Math.PI * 2) * 12; // baby blue drift
      const h3 = 330 + Math.sin(t * Math.PI * 2 + Math.PI / 3) * 8; // blush drift

      root.style.setProperty('--grad-angle', angle.toFixed(2) + 'deg');
      root.style.setProperty('--h1', h1.toFixed(2));
      root.style.setProperty('--h2', h2.toFixed(2));
      root.style.setProperty('--h3', h3.toFixed(2));

      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(compute);
        ticking = true;
      }
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);
}

export default function App() {
  useScrollGradient();
  return (
    <div className="page">
      <div className="bg" aria-hidden="true">
        <div className="blob b1" />
        <div className="blob b2" />
        <div className="blob b3" />
      </div>
      <div className="container">
        <header className="header glass">
          <div className="brand">
            <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="Skin Tracker" className="logo" />
            <span className="name">Skin Tracker</span>
          </div>
          <nav className="nav">
            <a className="nav-link" href="#how">How it works</a>
            <a className="nav-link" href="#benefits">Benefits</a>
            <a className="nav-link" href="#privacy">Privacy</a>
          </nav>
        </header>

        <main>
          <section className="hero">
            <Reveal>
              <p className="eyebrow">Join the beta</p>
            </Reveal>
            <Reveal delay={60}>
              <h1 className="title">Your skincare, finally measurable</h1>
            </Reveal>
            <Reveal delay={120}>
              <p className="subtitle">Track habits, analyse ingredients, and see your skin progress with AI and expert support.</p>
            </Reveal>

            <Reveal delay={180}>
              <div className="cta-row">
                <form className="signup glass" onSubmit={(e) => e.preventDefault()}>
                  <input className="input" type="email" placeholder="Enter your email" aria-label="Email address" />
                  <button className="button" type="submit">Join Beta</button>
                </form>
              </div>
            </Reveal>

            <Reveal delay={240}>
              <ul className="badges">
                <li className="badge">Local-first</li>
                <li className="badge">Privacy-first</li>
                <li className="badge">iOS & Android</li>
              </ul>
            </Reveal>
          </section>

          <section id="how" className="section">
            <Reveal>
              <h2 className="section-title">How it works</h2>
            </Reveal>
            <div className="cards">
              <Reveal delay={60}>
                <div className="card glass">
                  <h3 className="card-title">Take the quiz</h3>
                  <p className="card-text">Get a quick skin profile to personalise recommendations and track what matters.</p>
                </div>
              </Reveal>
              <Reveal delay={120}>
                <div className="card glass">
                  <h3 className="card-title">Track your routine</h3>
                  <p className="card-text">Log habits and products with gentle reminders and streaks that motivate—no pressure.</p>
                </div>
              </Reveal>
              <Reveal delay={180}>
                <div className="card glass">
                  <h3 className="card-title">See insights</h3>
                  <p className="card-text">AI & expert-informed insights help you understand ingredients and progress over time.</p>
                </div>
              </Reveal>
            </div>
          </section>

          <section id="benefits" className="section">
            <Reveal>
              <h2 className="section-title">Core benefits</h2>
            </Reveal>
            <div className="tiles">
              <Reveal delay={60}><div className="tile glass"><h4>Habit streaks</h4><p>Build consistency with gentle nudges and streaks that stick.</p></div></Reveal>
              <Reveal delay={120}><div className="tile glass"><h4>Ingredient analysis</h4><p>Know what’s inside your products and how they suit you.</p></div></Reveal>
              <Reveal delay={180}><div className="tile glass"><h4>Progress graphs</h4><p>See trends over weeks and months to guide your routine.</p></div></Reveal>
              <Reveal delay={240}><div className="tile glass"><h4>Expert consultations</h4><p>Get guidance when you need it—supportive, not prescriptive.</p></div></Reveal>
            </div>
          </section>

          <section className="section">
            <div className="feature glass">
              <Reveal>
                <h3 className="feature-title">Understand your routine’s chemistry</h3>
              </Reveal>
              <Reveal delay={80}>
                <p className="feature-text">Skin Tracker analyses ingredient lists across your routine to highlight potential synergies and irritants. It’s assistive, explainable, and designed to support—not replace—expert advice.</p>
              </Reveal>
            </div>
          </section>

          <section id="privacy" className="section">
            <Reveal>
              <h2 className="section-title">Read your data</h2>
            </Reveal>
            <div className="bullets glass">
              <Reveal delay={60}><div className="bullet">OAuth 2.0 login</div></Reveal>
              <Reveal delay={100}><div className="bullet">AES-256 at rest</div></Reveal>
              <Reveal delay={140}><div className="bullet">GDPR/CCPA tools</div></Reveal>
              <Reveal delay={180}><div className="bullet">Local-first caching</div></Reveal>
            </div>
            <Reveal delay={240}>
              <p className="smallprint">AI suggestions are assistive and not a substitute for professional advice. Your data is encrypted and under your control. Export or delete anytime.</p>
            </Reveal>
          </section>

          <section className="cta-band glass">
            <Reveal>
              <h3 className="cta-title">See your skin progress</h3>
            </Reveal>
            <Reveal delay={60}>
              <form className="cta-form" onSubmit={(e) => e.preventDefault()}>
                <input className="input" type="email" placeholder="Email for early access" aria-label="Email address" />
                <button className="button" type="submit">Join Beta</button>
              </form>
            </Reveal>
          </section>
        </main>

        <footer className="footer">
          <span>© {new Date().getFullYear()} Skin Tracker</span>
          <span className="dot">•</span>
          <a href="#privacy" className="link">Privacy</a>
          <span className="dot">•</span>
          <span className="disclaimer">Skin Tracker provides educational insights and routine support. It does not diagnose, treat or prevent disease.</span>
        </footer>
      </div>
    </div>
  );
}
