export default function OfflinePage() {
  return (
    <main className="shell">
      <header className="app-header">
        <div className="brand">
          <div className="brand-mark">SV</div>
          <div className="brand-copy">
            <strong>Offline base</strong>
            <span>Milestone 1 behavior</span>
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="eyebrow">Offline support</div>
        <h1>Core navigation stays available.</h1>
        <p>
          This first milestone only establishes the shell, but it already includes a basic
          offline route and service worker registration so the app can keep loading its shell
          without depending on any external service.
        </p>
      </section>

      <section className="grid">
        <article className="card">
          <h2>Available now</h2>
          <ul>
            <li>App shell rendering</li>
            <li>Static route navigation</li>
            <li>Manifest metadata for installable-web-app groundwork</li>
          </ul>
        </article>
        <article className="card">
          <h2>Planned for later milestones</h2>
          <ul>
            <li>Offline CRUD using IndexedDB</li>
            <li>Offline keyword search</li>
            <li>AI-search fallback messaging when the Pi is unreachable</li>
          </ul>
        </article>
      </section>
    </main>
  );
}
