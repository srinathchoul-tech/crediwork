import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { consumeRedirectAuthResult, signInWithGoogle } from "../lib/auth";

type Mode = "signin" | "signup";
type Role = "client" | "admin";

function mapGoogleAuthError(error: unknown) {
  if (!(error instanceof Error)) return "Google sign-in failed.";
  if (error.message.includes("auth/unauthorized-domain")) {
    const origin = window.location.origin;
    return `This domain is not authorized in Firebase (${origin}). Add it in Firebase Console > Authentication > Settings > Authorized domains.`;
  }
  if (error.message.includes("auth/popup-closed-by-user")) {
    return "Google popup was closed before sign-in completed. Try again.";
  }
  if (error.message.includes("auth/popup-blocked")) {
    return "Popup was blocked by the browser. Allow popups for this site and try again.";
  }
  return error.message;
}

export function AuthPage() {
  const navigate = useNavigate();
  const { signIn, signUp, completeOAuthSignIn } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [role, setRole] = useState<Role>("client");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const runRedirectGoogleSignIn = async () => {
      const redirectResult = await consumeRedirectAuthResult();
      if (redirectResult.provider !== "google_docs" || !redirectResult.member?.email) return;
      const pendingRole = (localStorage.getItem("cw_pending_role") as Role | null) ?? "client";
      localStorage.removeItem("cw_pending_role");
      await completeOAuthSignIn({
        role: pendingRole,
        name: redirectResult.member.displayName,
        email: redirectResult.member.email,
      });
      navigate(pendingRole === "admin" ? "/admin" : "/", { replace: true });
    };
    void runRedirectGoogleSignIn();
  }, [completeOAuthSignIn, navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      setBusy(true);
      if (mode === "signup") {
        await signUp({ name, email, password, role });
      } else {
        await signIn(email, password, role);
      }
      navigate(role === "admin" ? "/admin" : "/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleContinue = async () => {
    setError("");
    try {
      setBusy(true);
      localStorage.setItem("cw_pending_role", role);
      const result = await signInWithGoogle();
      if (result.redirectStarted) return;
      if (!result.member?.email) throw new Error("Google account email not available.");
      await completeOAuthSignIn({
        role,
        name: result.member.displayName,
        email: result.member.email,
      });
      navigate(role === "admin" ? "/admin" : "/", { replace: true });
    } catch (err) {
      setError(mapGoogleAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#a8c5d9] to-[#7a9bb5] relative overflow-hidden flex items-center justify-center px-4 py-10">
      <div className="absolute left-8 bottom-24 md:left-16 md:bottom-28 max-w-[320px] text-[#5b7c9a]">
        <p className="text-lg md:text-2xl font-semibold leading-snug">
          Uneven workload and low contribution visibility.
        </p>
      </div>

      <div className="absolute right-8 top-10 md:right-16 md:top-16 max-w-[320px] text-[#5b7c9a] text-right">
        <p className="text-lg md:text-2xl font-semibold leading-snug">
          Balanced tasks and Measurable impact.
        </p>
      </div>

      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 1200 800"
        preserveAspectRatio="none"
      >
        <defs>
          <marker
            id="curveArrow"
            markerWidth="10"
            markerHeight="12"
            refX="8"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,6 L9,3 z" fill="rgba(255,255,255,0.85)" />
          </marker>
        </defs>
        <path
          d="M230 710 C 270 700, 320 705, 370 720 C 460 748, 545 700, 620 620 C 710 525, 810 395, 930 285 C 968 250, 998 225, 1020 200"
          fill="none"
          stroke="rgba(255,255,255,0.55)"
          strokeWidth="4"
          strokeDasharray="8 8"
          markerEnd="url(#curveArrow)"
        />
      </svg>

      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-10 relative z-10">
        <h1 className="text-3xl font-semibold text-[#5b7c9a]">CrediWork Access</h1>
        <p className="text-gray-600 mt-2">
          {mode === "signup" ? "Create account" : "Sign in"} as Client or Admin.
        </p>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={`px-4 py-2 rounded-lg text-sm ${
              mode === "signin" ? "bg-[#5b7c9a] text-white" : "bg-gray-100 text-gray-700"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`px-4 py-2 rounded-lg text-sm ${
              mode === "signup" ? "bg-[#5b7c9a] text-white" : "bg-gray-100 text-gray-700"
            }`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {mode === "signup" && (
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Full name"
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          )}
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setRole("client")}
              className={`px-4 py-2 rounded-lg text-sm ${
                role === "client" ? "bg-[#5b7c9a] text-white" : "bg-gray-100 text-gray-700"
              }`}
            >
              I am Client
            </button>
            <button
              type="button"
              onClick={() => setRole("admin")}
              className={`px-4 py-2 rounded-lg text-sm ${
                role === "admin" ? "bg-[#5b7c9a] text-white" : "bg-gray-100 text-gray-700"
              }`}
            >
              I am Admin
            </button>
          </div>

          {error && <p className="text-sm text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-[#5b7c9a] hover:bg-[#4a6b89] text-white py-2 disabled:opacity-60"
          >
            {busy ? "Please wait..." : mode === "signup" ? "Create and continue" : "Sign in"}
          </button>

          {mode === "signin" && (
            <button
              type="button"
              onClick={() => void handleGoogleContinue()}
              disabled={busy}
              className="w-full rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 py-2 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                <path
                  fill="#EA4335"
                  d="M12 10.2v3.9h5.5c-.2 1.2-.9 2.2-1.9 2.9l3 2.3c1.7-1.6 2.7-3.9 2.7-6.8 0-.6 0-1.2-.2-1.8H12z"
                />
                <path
                  fill="#34A853"
                  d="M12 21.9c2.4 0 4.5-.8 6-2.2l-3-2.3c-.8.5-1.8.8-3 .8-2.3 0-4.2-1.6-4.9-3.7l-3.1 2.4c1.5 3 4.6 5 8 5z"
                />
                <path
                  fill="#4A90E2"
                  d="M7.1 14.5c-.2-.5-.3-1.1-.3-1.7s.1-1.2.3-1.7L4 8.7C3.3 10 3 11.3 3 12.8c0 1.5.3 2.8 1 4.1l3.1-2.4z"
                />
                <path
                  fill="#FBBC05"
                  d="M12 7.4c1.3 0 2.5.5 3.5 1.4l2.6-2.6C16.5 4.8 14.5 4 12 4 8.6 4 5.5 6 4 8.9l3.1 2.4c.7-2.2 2.6-3.9 4.9-3.9z"
                />
              </svg>
              Continue with Google
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
