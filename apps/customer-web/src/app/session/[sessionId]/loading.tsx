export default function SessionLoadingPage() {
  return (
    <main className="loading-shell">
      <section className="loading-card">
        <p className="eyebrow">Finding Your Table</p>
        <h1 className="guest-title" style={{ fontSize: "2rem", margin: 0 }}>
          Pulling the latest bill
        </h1>
        <p className="guest-subtitle">Connecting to the session, checking the bill, and getting you to payment-ready state.</p>
        <div className="stat-grid">
          <div className="loading-stat shimmer" />
          <div className="loading-stat shimmer" />
          <div className="loading-stat shimmer" />
          <div className="loading-stat shimmer" />
        </div>
      </section>
    </main>
  );
}
