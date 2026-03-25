export function StaleCheckBanner(props: { title?: string; message?: string }) {
  return (
    <section className="stale-banner">
      <strong>{props.title ?? "Bill updated"}</strong>
      <p className="stat-detail" style={{ margin: 0 }}>
        {props.message ?? "Someone at the table or in the POS changed the bill. Review the latest total before you keep paying."}
      </p>
    </section>
  );
}
