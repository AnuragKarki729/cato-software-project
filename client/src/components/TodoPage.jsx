import { Link } from "react-router-dom";

// Placeholder shown on pages that have not been built yet.
//   owners: [{ responsibility, name, id }]
//   links:  [[path, label], ...]; the first one is the main button
export default function TodoPage({ title, owners = [], location, links = [] }) {
  return (
    <section className="card space-y-4">
      <h1>{title}</h1>
      {owners.length === 0 && <p className="text-ink-soft">Shared page, no responsibility owner</p>}
      {owners.map((o) => (
        <p key={o.responsibility} className="text-ink-soft">
          {o.responsibility} · {o.name} · {o.id}
        </p>
      ))}
      <p className="text-sm text-ink-muted"><code>{location}</code></p>
      <div className="flex flex-wrap gap-3">
        {links.map(([to, label], i) => (
          <Link key={to + label} to={to} className={i === 0 ? "btn-primary" : "btn-secondary"}>{label}</Link>
        ))}
      </div>
    </section>
  );
}
