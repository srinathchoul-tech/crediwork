import { useState } from "react";
import { Outlet, Link, useLocation } from "react-router";
import { HelpCircle, X } from "lucide-react";
import { useNavigate } from "react-router";
import { useAuth } from "../auth/AuthContext";

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [showHelp, setShowHelp] = useState(false);

  const navLinks = [
    { path: "/notifications", label: "Notifications" },
    { path: "/contributions", label: "Contributions" },
    { path: "/profile", label: "My profile" },
  ];

  const footerLinks = [
    { path: "/", label: "Dashboard" },
    { path: "/integrate", label: "Integrate" },
    { path: "/reports", label: "Reports" },
  ];

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#a8c5d9] to-[#7a9bb5]">
      <header className="bg-white shadow-xl border-b border-[#9ab4c8]/40">
        <div className="max-w-[1400px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link
                to="/"
                className="text-3xl font-semibold tracking-wide text-[#4a6b89] [font-family:'Poppins','Segoe_UI',sans-serif]"
              >
                CrediWork
              </Link>
              <span className="text-gray-600 text-sm">
                Signed in as {user?.name ?? "Group member"}
              </span>
            </div>

            <div className="flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className="text-[#5b7c9a] hover:text-[#4a6b89] transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              <button
                type="button"
                onClick={() => {
                  void signOut();
                  navigate("/login", { replace: true });
                }}
                className="bg-[#5b7c9a] hover:bg-[#4a6b89] text-white px-6 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                Signout -&gt;
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 pt-10 pb-32">
        <div className="max-w-[1400px] mx-auto px-6">
          <Outlet />
        </div>
      </main>

      {showHelp && (
        <aside className="fixed right-6 bottom-28 z-50 w-[360px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              How points are calculated..
            </h3>
            <button
              type="button"
              onClick={() => setShowHelp(false)}
              className="rounded-full p-1 hover:bg-gray-100 transition-colors"
              aria-label="Close help"
            >
              <X className="w-3 h-3 text-gray-600" />
            </button>
          </div>
          <div className="text-sm text-gray-700 mt-3 space-y-2">
            <p>Member score is a weighted total out of 100.</p>
            <p>Task completion contributes 40%.</p>
            <p>Deadline adherence contributes 20%.</p>
            <p>Activity logs contributes 20%.</p>
            <p>Peer review contributes 20%.</p>
            <p>Rules: Task created 5, completed 20, deadline bonus 10.</p>
            <p>Rules: Comment 3, peer validation 10, PR merged 15.</p>
            <p>Grading: A (90+), B (80-89), C (70-79), D (&lt;70).</p>
          </div>
        </aside>
      )}

      <footer className="bg-[#4a6b89] py-4 fixed bottom-3 left-4 right-4 z-40 rounded-3xl shadow-2xl border border-white/20">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="flex items-center justify-between">
            <nav className="flex items-center gap-14">
              {footerLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`text-white text-xl leading-none transition-colors ${
                    isActive(link.path)
                      ? "font-semibold underline underline-offset-4"
                      : "hover:text-gray-200"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <button
              type="button"
              onClick={() => setShowHelp((previous) => !previous)}
              className="bg-white rounded-full w-12 h-12 flex items-center justify-center hover:bg-gray-100 transition-colors"
              aria-label="Open scoring help"
            >
              <HelpCircle className="w-6 h-6 text-[#5b7c9a]" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
