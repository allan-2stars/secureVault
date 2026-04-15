import Link from "next/link";

import { ConnectionStatus } from "@/components/connection-status";

const milestoneCards = [
  {
    title: "Privacy-first foundation",
    body: "The shell is designed around the architecture docs: local-first UX, no secret exposure, and AI kept optional from the start."
  },
  {
    title: "Offline-aware by default",
    body: "A lightweight service worker and manifest establish the baseline for offline navigation before storage and crypto land in Milestone 2."
  }
];

const nextMilestones = [
  "IndexedDB adapter for local storage",
  "Master-password unlock flow",
  "AES-GCM field encryption in the browser",
  "Record CRUD and local keyword search"
];

export default function HomePage() {
  return (
    <main className="shell">
      <header className="app-header">
        <div className="brand">
          <div className="brand-mark">SV</div>
          <div className="brand-copy">
            <strong>SecureVault AI</strong>
            <span>Milestone 1: App shell and offline base</span>
          </div>
        </div>
        <ConnectionStatus />
      </header>

      <section className="hero">
        <div className="eyebrow">Local-first secure vault</div>
        <h1>Keep secrets local. Search safely.</h1>
        <p>
          This shell establishes the first milestone for a privacy-first vault. Secret
          fields stay in the browser, semantic search is treated as an optional add-on, and
          the product remains useful offline even when AI services are unavailable.
        </p>
        <div className="hero-actions">
          <Link className="button button-primary" href="/offline">
            View offline behavior
          </Link>
          <a className="button button-secondary" href="#roadmap">
            Read roadmap
          </a>
        </div>
        <div className="status-bar">
          <div className="status-pill">
            <strong>Storage</strong>
            IndexedDB planned for Milestone 2
          </div>
          <div className="status-pill">
            <strong>AI</strong>
            Disabled until safe index pipeline is added
          </div>
          <div className="status-pill">
            <strong>Secrets</strong>
            No secret data handled in Milestone 1
          </div>
        </div>
      </section>

      <p className="section-title">What this milestone delivers</p>
      <section className="grid grid-two">
        {milestoneCards.map((card) => (
          <article className="card" key={card.title}>
            <h2>{card.title}</h2>
            <p>{card.body}</p>
          </article>
        ))}
      </section>

      <p className="section-title" id="roadmap">
        Next up
      </p>
      <section className="grid grid-two">
        <article className="card">
          <h3>Upcoming implementation</h3>
          <ul>
            {nextMilestones.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
        <article className="card">
          <h3>Guardrails already applied</h3>
          <ul>
            <li>No network use is required for the current shell.</li>
            <li>The UI explicitly separates local behavior from future AI features.</li>
            <li>The app remains useful if a future Chroma endpoint is unavailable.</li>
          </ul>
        </article>
      </section>

      <p className="footer-note">
        The next milestone will add browser-side crypto and local persistence without
        changing the privacy guarantees defined in the project docs.
      </p>
    </main>
  );
}
