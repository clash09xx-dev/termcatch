export default function Loading() {
  return (
    <div className="space-y-6 max-w-3xl animate-pulse">
      <div>
        <div className="h-6 w-48 bg-gray-200 rounded-lg" />
        <div className="h-4 w-72 bg-gray-100 rounded-lg mt-2" />
      </div>
      <div className="h-10 w-56 bg-gray-100 rounded-xl" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 bg-white border border-gray-100 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
