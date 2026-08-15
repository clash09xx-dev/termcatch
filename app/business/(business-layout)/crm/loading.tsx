// CRM skeleton — a list of client rows, at the row height they will occupy.

const shell: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--hairline-soft)",
  boxShadow: "var(--e2)",
};

export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto space-y-5" aria-busy="true">
      <div>
        <div className="h-6 w-40 rounded-lg tc-skeleton" />
        <div className="h-4 w-64 rounded-lg mt-2 tc-skeleton" />
      </div>
      <div className="h-11 rounded-xl tc-skeleton" />
      <div className="rounded-[20px] p-3 space-y-2" style={shell}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-1 py-2">
            <div className="w-9 h-9 rounded-full tc-skeleton flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-1/3 rounded tc-skeleton" />
              <div className="h-3 w-1/4 rounded tc-skeleton" />
            </div>
            <div className="h-3.5 w-14 rounded tc-skeleton" />
          </div>
        ))}
      </div>
    </div>
  );
}
