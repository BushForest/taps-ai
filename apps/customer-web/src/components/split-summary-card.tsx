export function SplitSummaryCard(props: {
  label: string;
  amountCents: number;
  detail: string;
}) {
  return (
    <article
      style={{
        border: "1px solid #d8d0c2",
        borderRadius: 18,
        padding: 16,
        background: "#fffdfa"
      }}
    >
      <p style={{ margin: 0, fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase", color: "#7d6d4b" }}>
        {props.label}
      </p>
      <h3 style={{ margin: "8px 0" }}>${(props.amountCents / 100).toFixed(2)}</h3>
      <p style={{ margin: 0, color: "#5d5548" }}>{props.detail}</p>
    </article>
  );
}
