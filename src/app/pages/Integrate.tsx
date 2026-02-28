import { useEffect, useMemo, useState } from "react";
import { setIntegrationStatus, updateMemberGithubUsername } from "../lib/trackingApi";
import { firebaseEnabled } from "../lib/firebase";
import { useTrackingData } from "../hooks/useTrackingData";
import { consumeRedirectAuthResult, signInWithGoogle } from "../lib/auth";
import {
  syncCanvaContributions,
  syncFigmaContributions,
  syncGithubContributions,
  syncGoogleDocsContributions,
  generateTaskPlan,
} from "../lib/cloudFunctions";

export function Integrate() {
  const { snapshot, activeProjectId, metrics, reload, currentMember } = useTrackingData();
  const [busyProvider, setBusyProvider] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");
  const [projectDescription, setProjectDescription] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [githubUsername, setGithubUsername] = useState("");
  const [figmaHandle, setFigmaHandle] = useState("");
  const [canvaUsername, setCanvaUsername] = useState("");

  const statusByProvider = useMemo(
    () =>
      new Map(snapshot.integrations.map((integration) => [integration.provider, integration.status])),
    [snapshot.integrations],
  );

  useEffect(() => {
    if (!currentMember?.uid) return;
    const profile = snapshot.members.find((member) => member.id === currentMember.uid);
    if (profile?.githubUsername) {
      setGithubUsername(profile.githubUsername);
    }
  }, [currentMember?.uid, snapshot.members]);

  useEffect(() => {
    const runRedirectCompletion = async () => {
      const redirectResult = await consumeRedirectAuthResult();
      if (redirectResult.provider !== "google_docs" || !redirectResult.accessToken) return;

      setBusyProvider("google_docs");
      await setIntegrationStatus("google_docs", "connected");
      await syncGoogleDocsContributions(redirectResult.accessToken);
      setMessage("Google Docs connected and synced.");
      await reload();
      setBusyProvider(null);
    };
    void runRedirectCompletion();
  }, [reload]);

  const requireSignedInUser = () => {
    if (currentMember?.uid) return true;
    setMessage("Sign in first (Google Docs connect) to run provider sync.");
    return false;
  };

  const connectGithubByUsername = async () => {
    if (!requireSignedInUser()) return;
    if (!githubUsername.trim()) {
      setMessage("Enter GitHub username before connecting.");
      return;
    }
    try {
      setBusyProvider("github");
      setMessage("");
      await updateMemberGithubUsername(currentMember!.uid, githubUsername);
      await setIntegrationStatus("github", "connected");
      await syncGithubContributions({ githubUsername: githubUsername.trim() });
      setMessage("GitHub username connected and synced.");
      await reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "GitHub integration failed.");
    } finally {
      setBusyProvider(null);
    }
  };

  const connectGoogleDocs = async () => {
    try {
      setBusyProvider("google_docs");
      setMessage("");
      const authResult = await signInWithGoogle();
      if (authResult.redirectStarted) return;
      await setIntegrationStatus("google_docs", "connected");
      if (authResult.accessToken) {
        await syncGoogleDocsContributions(authResult.accessToken);
        setMessage("Google Docs connected and synced.");
      } else {
        setMessage(
          "Google auth succeeded but token missing. Reconnect and grant Docs/Drive scopes.",
        );
      }
      await reload();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Google Docs connect failed: ${error.message}`
          : "Google Docs connect failed.",
      );
    } finally {
      setBusyProvider(null);
    }
  };

  const connectFigma = async () => {
    if (!requireSignedInUser()) return;
    if (!figmaHandle.trim()) {
      setMessage("Enter Figma handle or file key before connecting.");
      return;
    }
    try {
      setBusyProvider("figma");
      setMessage("");
      await setIntegrationStatus("figma", "connected");
      await syncFigmaContributions({ figmaHandle: figmaHandle.trim() });
      setMessage("Figma connected in manual mode and contribution event tracked.");
      await reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Figma integration failed.");
    } finally {
      setBusyProvider(null);
    }
  };

  const connectCanva = async () => {
    if (!requireSignedInUser()) return;
    if (!canvaUsername.trim()) {
      setMessage("Enter Canva username/workspace before connecting.");
      return;
    }
    try {
      setBusyProvider("canva");
      setMessage("");
      await setIntegrationStatus("canva", "connected");
      await syncCanvaContributions({ canvaUsername: canvaUsername.trim() });
      setMessage("Canva connected in manual mode and contribution event tracked.");
      await reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Canva integration failed.");
    } finally {
      setBusyProvider(null);
    }
  };

  const handleGeneratePlan = async () => {
    if (!projectDescription.trim()) {
      setMessage("Add project description before generating tasks.");
      return;
    }
    try {
      setAiBusy(true);
      setMessage("");
      const result = await generateTaskPlan({
        projectDescription,
        projectId: activeProjectId === "all" ? undefined : activeProjectId,
        members: snapshot.members.map((member) => ({ id: member.id, name: member.name })),
      });
      setMessage(`Gemini generated ${result.createdTasks} tasks and assigned them equally.`);
      setProjectDescription("");
      await reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to generate plan.");
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <div className="min-h-[500px]">
      <div className="h-1 mb-4" />
      <div className="bg-gradient-to-br from-[#d4e8f5] to-[#c5dae8] rounded-3xl p-8 shadow-lg space-y-6">
        <div className="bg-white/85 rounded-2xl p-5 text-sm text-gray-700">
          <p>
            {firebaseEnabled
              ? "Live mode: integrations, auth, tasks, and events are stored in Firebase."
              : "Demo mode: add Firebase credentials to enable live provider sync."}
          </p>
          <p className="mt-1">
            Google Docs sync needs Google Auth plus Drive API enabled in Google Cloud.
          </p>
          {message && <p className="mt-2 text-[#35556f] font-medium">{message}</p>}
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl pt-5 pb-8 px-8 shadow-md space-y-4">
            <h2 className="text-2xl font-semibold text-gray-900 mb-1">Tools</h2>

            <div className="border rounded-xl p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium text-gray-900">GitHub</div>
                <button
                  type="button"
                  onClick={() => void connectGithubByUsername()}
                  disabled={busyProvider === "github"}
                  className="px-4 py-2 rounded-lg font-medium bg-blue-200 text-blue-800 hover:bg-blue-300 disabled:opacity-60"
                >
                  {busyProvider === "github" ? "Working..." : "Connect"}
                </button>
              </div>
              <input
                value={githubUsername}
                onChange={(event) => setGithubUsername(event.target.value)}
                placeholder="GitHub username"
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Status: {statusByProvider.get("github") ?? "disconnected"}
              </p>
            </div>

            <div className="border rounded-xl p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium text-gray-900">Google Docs</div>
                <button
                  type="button"
                  onClick={() => void connectGoogleDocs()}
                  disabled={busyProvider === "google_docs"}
                  className="px-4 py-2 rounded-lg font-medium bg-blue-200 text-blue-800 hover:bg-blue-300 disabled:opacity-60"
                >
                  {busyProvider === "google_docs" ? "Working..." : "Connect"}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Status: {statusByProvider.get("google_docs") ?? "disconnected"}
              </p>
            </div>

            <div className="border rounded-xl p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium text-gray-900">Figma</div>
                <button
                  type="button"
                  onClick={() => void connectFigma()}
                  disabled={busyProvider === "figma"}
                  className="px-4 py-2 rounded-lg font-medium bg-blue-200 text-blue-800 hover:bg-blue-300 disabled:opacity-60"
                >
                  {busyProvider === "figma" ? "Working..." : "Connect"}
                </button>
              </div>
              <input
                value={figmaHandle}
                onChange={(event) => setFigmaHandle(event.target.value)}
                placeholder="Figma handle or file key"
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Status: {statusByProvider.get("figma") ?? "disconnected"}
              </p>
            </div>

            <div className="border rounded-xl p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium text-gray-900">Canva</div>
                <button
                  type="button"
                  onClick={() => void connectCanva()}
                  disabled={busyProvider === "canva"}
                  className="px-4 py-2 rounded-lg font-medium bg-blue-200 text-blue-800 hover:bg-blue-300 disabled:opacity-60"
                >
                  {busyProvider === "canva" ? "Working..." : "Connect"}
                </button>
              </div>
              <input
                value={canvaUsername}
                onChange={(event) => setCanvaUsername(event.target.value)}
                placeholder="Canva username or workspace"
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Status: {statusByProvider.get("canva") ?? "disconnected"}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl pt-5 pb-8 px-8 shadow-md">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Tracking</h2>
            <ul className="space-y-4">
              <li className="flex items-center justify-between">
                <span className="text-gray-700">Tasks created</span>
                <span className="font-semibold text-gray-900">{metrics.taskCreated}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-gray-700">Tasks completed</span>
                <span className="font-semibold text-gray-900">{metrics.taskCompleted}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-gray-700">PRs merged</span>
                <span className="font-semibold text-gray-900">{metrics.prMerged}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="bg-white rounded-2xl pt-5 pb-8 px-8 shadow-md">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">AI Task Split (Gemini)</h2>
          <p className="text-sm text-gray-600 mb-3">
            Describe your project and Gemini will create and equally distribute tasks.
          </p>
          <textarea
            value={projectDescription}
            onChange={(event) => setProjectDescription(event.target.value)}
            rows={5}
            placeholder="Example: Build a contribution tracker with auth, dashboard, reports, and integrations."
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-800"
          />
          <button
            type="button"
            onClick={() => void handleGeneratePlan()}
            disabled={aiBusy}
            className="mt-4 px-5 py-2 rounded-lg font-medium bg-[#5b7c9a] text-white hover:bg-[#4b6a84] transition-colors disabled:opacity-60"
          >
            {aiBusy ? "Generating..." : "Generate and assign tasks"}
          </button>
        </div>
      </div>
    </div>
  );
}
