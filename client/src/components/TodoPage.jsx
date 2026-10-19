// Placeholder shown on pages that have not been built yet.
export default function TodoPage({ title, responsibility, children }) {
  return (
    <section>
      <h1 className="mb-4 text-2xl font-bold">{title}</h1>
      <p className="rounded-lg border border-dashed border-violet-600 bg-white px-4 py-3 text-violet-700">
        Not built yet – Responsibility {responsibility}.
      </p>
      {children}
    </section>
  );
}
