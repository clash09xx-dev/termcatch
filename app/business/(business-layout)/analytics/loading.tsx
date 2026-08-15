// Analytics skeleton — stat strip then chart, matching the real layout so the
// numbers land where the placeholders were.

const shell: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--hairline-soft)",
  boxShadow: "var(--e2)",
};

export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto space-y-5" aria-busy="true">
      <div>
        <div className="h-6 w-36 rounded-lg tc-skeleton" />
        <div className="h-4 w-56 rounded-lg mt-2 tc-skeleton" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-[20px] p-4 flex flex-col justify-between" style={shell}>
            <div className="h-3 w-20 rounded tc-skeleton" />
            <div className="h-6 w-16 rounded tc-skeleton" />
          </div>
        ))}
      </div>
      <div className="rounded-[20px] p-5 space-y-4" style={shell}>
        <div className="h-4 w-32 rounded tc-skeleton" />
        <div className="h-52 rounded-xl tc-skeleton" />
      </div>
      <div className="grid lg:grid-cols-2 gap-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-[20px] p-5 space-y-3" style={shell}>
            <div className="h-4 w-28 rounded tc-skeleton" />
            <div className="h-32 rounded-xl tc-skeleton" />
          </div>
        ))}
      </div>
    </div>
  );
}
