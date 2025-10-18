export function Card({ children, className = "" }) {
  return (
    <div className={`card bg-base-100 border shadow-md rounded-2xl ${className}`}>
      <div className="card-body">{children}</div>
    </div>
  );
}

export function SectionTitle({ children, right }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-xl font-bold">{children}</h2>
      {right}
    </div>
  );
}
