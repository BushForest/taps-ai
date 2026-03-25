export function FeatureDisabled({ name }: { name: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 240,
        gap: 12,
        padding: "32px 24px",
        textAlign: "center",
      }}
    >
      <span style={{ fontSize: 32, lineHeight: 1 }}>🚫</span>
      <p
        style={{
          margin: 0,
          fontSize: 15,
          color: "var(--muted)",
          maxWidth: 280,
          lineHeight: 1.5,
        }}
      >
        {name ? `${name} is not currently available.` : "This feature is not currently available."} Please ask your
        server.
      </p>
    </div>
  );
}
