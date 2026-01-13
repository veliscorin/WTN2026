export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center space-y-4">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-black"></div>
      <p className="text-gray-500">Loading...</p>
    </div>
  );
}
