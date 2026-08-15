// Business panel skeleton — one shimmer system (.tc-skeleton), which goes
// still under prefers-reduced-motion.

const shell: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--hairline-soft)",
  boxShadow: "var(--e2)",
};

export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto space-y-5" aria-busy="true">
      <div>
        <div className="h-6 w-56 rounded-lg tc-skeleton" />
        <div className="h-4 w-40 rounded-lg mt-2 tc-skeleton" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-[20px] p-4 flex flex-col justify-between" style={shell}>
            <div className="h-3 w-20 rounded tc-skeleton" />
            <div className="h-6 w-16 rounded tc-skeleton" />
          </div>
        ))}
      </div>
      <div className="h-72 rounded-[20px] p-5 space-y-3" style={shell}>
        <div className="h-4 w-40 rounded tc-skeleton" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-11 rounded-xl tc-skeleton" />
        ))}
      </div>
    </div>
  );
}
