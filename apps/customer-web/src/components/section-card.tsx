import type { ReactNode } from "react";

export function SectionCard(props: {
  title?: string;
  eyebrow?: string;
  children: ReactNode;
  tone?: "default" | "warn" | "success";
}) {
  const toneClass =
    props.tone === "warn"
      ? "section-card section-card--warn"
      : props.tone === "success"
        ? "section-card section-card--success"
        : "section-card";

  return (
    <section className={toneClass}>
      {props.eyebrow || props.title ? (
        <div className="section-card__header">
          {props.eyebrow ? <p className="eyebrow">{props.eyebrow}</p> : null}
          {props.title ? <h2 className="section-card__title">{props.title}</h2> : null}
        </div>
      ) : null}
      <div className="section-card__body">{props.children}</div>
    </section>
  );
}
