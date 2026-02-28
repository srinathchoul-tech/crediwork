import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

type SyncResult = {
  synced: number;
  provider: string;
};

type GenerateTaskPlanInput = {
  projectDescription: string;
  projectId?: string;
  members: Array<{ id: string; name: string; skills?: string[] }>;
  dueDate?: string;
};

type GenerateTaskPlanResult = {
  createdTasks: number;
  tasks: Array<{
    id: string;
    title: string;
    description: string;
    estimateHours: number;
    assigneeId: string;
    priority: "low" | "medium" | "high";
  }>;
};

export async function syncGithubContributions(params: {
  accessToken?: string;
  githubUsername?: string;
}) {
  if (!functions) return { synced: 0, provider: "github" } satisfies SyncResult;
  const callable = httpsCallable<
    { accessToken?: string; githubUsername?: string },
    SyncResult
  >(
    functions,
    "syncGithubContributions",
  );
  const result = await callable(params);
  return result.data;
}

export async function syncGoogleDocsContributions(accessToken: string) {
  if (!functions) return { synced: 0, provider: "google_docs" } satisfies SyncResult;
  const callable = httpsCallable<{ accessToken: string }, SyncResult>(
    functions,
    "syncGoogleDocsContributions",
  );
  const result = await callable({ accessToken });
  return result.data;
}

export async function syncFigmaContributions(params: {
  figmaHandle?: string;
  figmaFileKey?: string;
}) {
  if (!functions) return { synced: 0, provider: "figma" } satisfies SyncResult;
  const callable = httpsCallable<
    { figmaHandle?: string; figmaFileKey?: string },
    SyncResult
  >(functions, "syncFigmaContributions");
  const result = await callable(params);
  return result.data;
}

export async function syncCanvaContributions(params: {
  canvaUsername?: string;
  canvaProjectName?: string;
}) {
  if (!functions) return { synced: 0, provider: "canva" } satisfies SyncResult;
  const callable = httpsCallable<
    { canvaUsername?: string; canvaProjectName?: string },
    SyncResult
  >(functions, "syncCanvaContributions");
  const result = await callable(params);
  return result.data;
}

export async function generateTaskPlan(input: GenerateTaskPlanInput) {
  if (!functions) return { createdTasks: 0, tasks: [] } satisfies GenerateTaskPlanResult;
  const callable = httpsCallable<GenerateTaskPlanInput, GenerateTaskPlanResult>(
    functions,
    "generateTaskPlan",
  );
  const result = await callable(input);
  return result.data;
}
