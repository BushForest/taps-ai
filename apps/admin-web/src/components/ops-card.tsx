import type { ReactNode } from "react";

export function OpsCard(props: {
  title?: string;
  eyebrow?: string;
  children: ReactNode;
  accent?: "default" | "warning" | "critical" | "success";
}) {
  const className =
    props.accent === "critical"
      ? "ops-card ops-card--critical"
      : props.accent === "warning"
        ? "ops-card ops-card--warning"
        : props.accent === "success"
          ? "ops-card ops-card--success"
          : "ops-card";

  return (
    <section className={className}>
      {props.eyebrow || props.title ? (
        <div className="ops-card__header">
          {props.eyebrow ? <p className="ops-card__eyebrow">{props.eyebrow}</p> : null}
          {props.title ? <h2 className="ops-card__title">{props.title}</h2> : null}
        </div>
      ) : null}
      <div className="ops-card__body">{props.children}</div>
    </section>
  );
}
