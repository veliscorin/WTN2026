import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center space-y-4 text-center">
      <h2 className="text-2xl font-bold">404 - Page Not Found</h2>
      <p className="text-gray-600">Could not find the requested resource.</p>
      <Link
        href="/"
        className="rounded-md bg-black px-4 py-2 text-sm text-white transition-colors hover:bg-gray-800"
      >
        Return Home
      </Link>
    </div>
  );
}
