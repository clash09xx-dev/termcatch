// Shared business-panel skeleton — silver glass placeholders
const tone = { background: "rgba(203,213,225,0.30)" } as React.CSSProperties;
const toneSoft = { background: "rgba(203,213,225,0.20)" } as React.CSSProperties;
const shell: React.CSSProperties = {
  background: "rgba(255,255,255,0.72)",
  border: "1px solid rgba(203,213,225,0.40)",
  boxShadow: "0 0 0 0.5px rgba(203,213,225,0.25), 0 1px 2px rgba(0,0,0,0.02), 0 6px 20px rgba(100,116,139,0.06), inset 0 1px 0 rgba(255,255,255,0.92)",
};

export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto space-y-5 animate-pulse">
      <div>
        <div className="h-6 w-56 rounded-lg" style={tone} />
        <div className="h-4 w-40 rounded-lg mt-2" style={toneSoft} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-[20px]" style={shell} />
        ))}
      </div>
      <div className="h-72 rounded-[20px]" style={shell} />
    </div>
  );
}
