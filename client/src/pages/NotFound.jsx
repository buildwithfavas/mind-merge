export default function NotFound() {
  return (
    <div className="min-h-[60vh] grid place-items-center">
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold">404 — Page not found</h1>
        <p className="opacity-80">The page you’re looking for doesn’t exist.</p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <a href="/" className="px-4 py-2 rounded-md bg-indigo-600 text-white">Go Home</a>
          <a href="/feed" className="px-4 py-2 rounded-md bg-zinc-800">Open App</a>
        </div>
      </div>
    </div>
  );
}
