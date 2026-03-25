export default function RootLoadingPage() {
  return (
    <main className="loading-shell">
      <section className="loading-card">
        <p className="eyebrow">Opening Taps</p>
        <div className="center-stack">
          <div className="loading-line loading-line--short shimmer" />
          <div className="loading-line loading-line--medium shimmer" />
          <div className="loading-line loading-line--full shimmer" />
        </div>
        <div className="stat-grid">
          <div className="loading-stat shimmer" />
          <div className="loading-stat shimmer" />
        </div>
      </section>
    </main>
  );
}
