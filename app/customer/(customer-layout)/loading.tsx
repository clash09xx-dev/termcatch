// Customer-panel skeleton — silver glass placeholders (same family as business)
const shell: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--hairline-soft)",
  boxShadow: "var(--e2)",
};

export default function Loading() {
  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <div className="h-6 w-48 rounded-lg tc-skeleton" />
        <div className="h-4 w-72 rounded-lg mt-2 tc-skeleton" />
      </div>
      <div className="h-10 w-56 rounded-xl tc-skeleton" />
      <div className="space-y-2.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 rounded-[20px] p-4 flex items-center gap-3" style={shell}>
            <div className="w-11 h-11 rounded-xl tc-skeleton flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/5 rounded tc-skeleton" />
              <div className="h-3 w-3/5 rounded tc-skeleton" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
