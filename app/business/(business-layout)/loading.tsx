export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-6 w-56 bg-gray-200 rounded-lg" />
        <div className="h-4 w-40 bg-gray-100 rounded-lg mt-2" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 bg-white border border-gray-100 rounded-2xl" />
        ))}
      </div>
      <div className="h-72 bg-white border border-gray-100 rounded-2xl" />
    </div>
  );
}
