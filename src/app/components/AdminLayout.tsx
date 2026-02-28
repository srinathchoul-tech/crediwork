import { Link, Outlet, useLocation, useNavigate } from "react-router";
import { useAuth } from "../auth/AuthContext";

export function AdminLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const links = [
    { path: "/admin", label: "Leaderboard" },
    { path: "/admin/team-management", label: "Team Management" },
    { path: "/admin/workload", label: "Workload Redistribution" },
    { path: "/admin/analytics", label: "Analytics & Reports" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#a8c5d9] to-[#7a9bb5]">
      <header className="bg-white shadow-xl border-b border-[#9ab4c8]/40">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#5b7c9a]">CrediWork Admin</h1>
            <p className="text-sm text-gray-600">{user?.name ?? "Admin"}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              void signOut();
              navigate("/login", { replace: true });
            }}
            className="bg-[#5b7c9a] hover:bg-[#4a6b89] text-white px-5 py-2 rounded-lg"
          >
            Signout
          </button>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-8 space-y-6">
        <nav className="bg-white rounded-2xl p-4 shadow-lg flex flex-wrap gap-4">
          {links.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`px-4 py-2 rounded-lg ${
                location.pathname === link.path
                  ? "bg-[#5b7c9a] text-white"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <Outlet />
      </main>
    </div>
  );
}
