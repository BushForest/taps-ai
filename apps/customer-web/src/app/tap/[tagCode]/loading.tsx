export default function TapLoadingPage() {
  return (
    <main className="loading-shell">
      <section className="loading-card">
        <p className="eyebrow">Table Tap</p>
        <h1 className="guest-title" style={{ fontSize: "2rem", margin: 0 }}>
          Opening your bill
        </h1>
        <p className="guest-subtitle">Matching the NFC tag, checking the table, and pulling the current balance.</p>
        <div className="loading-line loading-line--full shimmer" />
        <div className="loading-line loading-line--medium shimmer" />
        <div className="loading-line loading-line--short shimmer" />
      </section>
    </main>
  );
}
