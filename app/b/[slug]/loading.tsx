// Route-level loading skeleton — silver glass placeholders mirroring the
// profile layout so navigation into a salon feels instant.

const shimmer = "tc-skeleton";

const cardShell: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--hairline-soft)",
  boxShadow: "var(--e2)",
};

export default function Loading() {
  return (
    <div
      className="min-h-screen"
      style={{ background: "linear-gradient(165deg, #F4F7FB 0%, #F8FAFC 50%, #EEF4FB 100%)" }}
    >
      {/* Cover */}
      <div className="pt-16">
        <div className={`h-[140px] sm:h-[160px] w-full ${shimmer}`} style={{ background: "linear-gradient(140deg, #E2E8F0 0%, #F1F5F9 45%, #DBE4EF 100%)" }} />
      </div>

      {/* Header */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="relative -mt-10 flex items-end gap-4 sm:gap-5 pb-6" style={{ borderBottom: "1px solid var(--hairline-soft)" }}>
          <div className={`w-20 h-20 rounded-2xl flex-shrink-0 ${shimmer}`} style={cardShell} />
          <div className="flex-1 pb-1 space-y-2.5">
            <div className={`h-5 w-24 rounded-lg ${shimmer}`} />
            <div className={`h-7 w-56 rounded-lg ${shimmer}`} />
            <div className={`h-4 w-40 rounded-lg ${shimmer}`} />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex gap-8 items-start">
          <div className="flex-1 min-w-0 space-y-8">
            <div className={`h-5 w-20 rounded-lg ${shimmer}`} />
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-2xl p-5 flex items-start justify-between gap-4" style={cardShell}>
                <div className="flex-1 space-y-2.5">
                  <div className={`h-4 w-2/5 rounded ${shimmer}`} />
                  <div className={`h-3 w-3/5 rounded ${shimmer}`} />
                  <div className={`h-3 w-16 rounded ${shimmer}`} />
                </div>
                <div className="flex flex-col items-end gap-2.5">
                  <div className={`h-5 w-16 rounded ${shimmer}`} />
                  <div className={`h-8 w-20 rounded-xl ${shimmer}`} />
                </div>
              </div>
            ))}
          </div>

          <div className="hidden lg:block w-[360px] flex-shrink-0">
            <div className="rounded-2xl p-5 space-y-4" style={cardShell}>
              <div className={`h-5 w-40 rounded ${shimmer}`} />
              <div className={`h-10 w-full rounded-xl ${shimmer}`} />
              <div className={`h-20 w-full rounded-xl ${shimmer}`} />
              <div className={`h-11 w-full rounded-xl ${shimmer}`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
