// Calendar skeleton — shaped like the grid it replaces, so the page does not
// reflow when the real thing arrives.

const shell: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--hairline-soft)",
  boxShadow: "var(--e2)",
};

export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto space-y-4" aria-busy="true">
      <div className="flex items-center justify-between gap-3">
        <div className="h-6 w-44 rounded-lg tc-skeleton" />
        <div className="flex gap-2">
          <div className="h-9 w-9 rounded-lg tc-skeleton" />
          <div className="h-9 w-20 rounded-lg tc-skeleton" />
          <div className="h-9 w-9 rounded-lg tc-skeleton" />
        </div>
      </div>
      <div className="rounded-[20px] overflow-hidden" style={shell}>
        <div className="grid grid-cols-7 gap-px p-px">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-9 tc-skeleton" />
          ))}
        </div>
        <div className="p-3 space-y-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-12 rounded-lg tc-skeleton" />
          ))}
        </div>
      </div>
    </div>
  );
}
