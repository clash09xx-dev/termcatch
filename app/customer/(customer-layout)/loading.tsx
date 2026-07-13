// Customer-panel skeleton — silver glass placeholders (same family as business)
const tone = { background: "rgba(203,213,225,0.30)" } as React.CSSProperties;
const toneSoft = { background: "rgba(203,213,225,0.20)" } as React.CSSProperties;
const shell: React.CSSProperties = {
  background: "rgba(255,255,255,0.72)",
  border: "1px solid rgba(203,213,225,0.40)",
  boxShadow: "0 0 0 0.5px rgba(203,213,225,0.25), 0 1px 2px rgba(0,0,0,0.02), 0 6px 20px rgba(100,116,139,0.06), inset 0 1px 0 rgba(255,255,255,0.92)",
};

export default function Loading() {
  return (
    <div className="space-y-5 max-w-3xl animate-pulse">
      <div>
        <div className="h-6 w-48 rounded-lg" style={tone} />
        <div className="h-4 w-72 rounded-lg mt-2" style={toneSoft} />
      </div>
      <div className="h-10 w-56 rounded-xl" style={toneSoft} />
      <div className="space-y-2.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 rounded-[20px]" style={shell} />
        ))}
      </div>
    </div>
  );
}
