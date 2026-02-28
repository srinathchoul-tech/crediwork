import { Link } from "react-router";

export function NotFound() {
  return (
    <div className="min-h-[600px] flex items-center justify-center">
      <div className="bg-gradient-to-br from-[#d4e8f5] to-[#c5dae8] rounded-3xl p-12 shadow-lg text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <p className="text-xl text-gray-700 mb-6">Page not found</p>
        <Link
          to="/"
          className="inline-block bg-[#5b7c9a] hover:bg-[#4a6b89] text-white px-6 py-3 rounded-lg transition-colors"
        >
          Go back to Dashboard
        </Link>
      </div>
    </div>
  );
}
