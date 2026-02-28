import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();
const geminiApiKey = defineSecret("GEMINI_API_KEY");

type ActivityType =
  | "task_created"
  | "task_completed"
  | "deadline_bonus"
  | "comment"
  | "peer_validation"
  | "pr_merged";

type PlannedTask = {
  title: string;
  description: string;
  estimateHours: number;
  assigneeId: string;
  priority: "low" | "medium" | "high";
};

async function writeEvent(params: {
  memberId: string;
  platform: "github" | "google_docs" | "figma" | "canva";
  type: ActivityType;
  externalId: string;
  metadata?: Record<string, string | number | boolean | null>;
}) {
  const eventId = `${params.platform}_${params.memberId}_${params.externalId}`;
  const eventRef = db.collection("events").doc(eventId);
  const existing = await eventRef.get();
  if (existing.exists) return false;

  await eventRef.set({
    memberId: params.memberId,
    platform: params.platform,
    type: params.type,
    metadata: params.metadata ?? null,
    createdAt: new Date().toISOString(),
  });
  return true;
}

export const syncGithubContributions = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must sign in first.");
  }

  const accessToken = request.data?.accessToken as string | undefined;
  const githubUsernameInput = request.data?.githubUsername as string | undefined;
  let githubUsername = githubUsernameInput?.trim();

  if (!accessToken && !githubUsername) {
    throw new HttpsError(
      "invalid-argument",
      "Provide either GitHub access token or githubUsername.",
    );
  }

  const githubHeaders: Record<string, string> = { "User-Agent": "CrediWork" };
  if (accessToken) {
    githubHeaders.Authorization = `Bearer ${accessToken}`;
  }

  if (accessToken && !githubUsername) {
    const userRes = await fetch("https://api.github.com/user", {
      headers: githubHeaders,
    });
    if (!userRes.ok) {
      const body = await userRes.text();
      throw new HttpsError("permission-denied", `Unable to read GitHub profile: ${body}`);
    }
    const userData = (await userRes.json()) as { login: string };
    githubUsername = userData.login;
  }

  if (!githubUsername) {
    throw new HttpsError("invalid-argument", "GitHub username was not resolved.");
  }

  let synced = 0;
  const mergedRes = await fetch(
    `https://api.github.com/search/issues?q=author:${githubUsername}+type:pr+is:merged&per_page=20`,
    {
      headers: githubHeaders,
    },
  );
  if (mergedRes.ok) {
    const mergedData = (await mergedRes.json()) as {
      items?: Array<{ id: number; title?: string }>;
    };
    for (const item of mergedData.items ?? []) {
      const inserted = await writeEvent({
        memberId: request.auth.uid,
        platform: "github",
        type: "pr_merged",
        externalId: `pr_${item.id}`,
        metadata: { title: item.title ?? "" },
      });
      if (inserted) synced += 1;
    }
  }

  const commentsRes = await fetch(
    `https://api.github.com/search/issues?q=commenter:${githubUsername}&per_page=20`,
    {
      headers: githubHeaders,
    },
  );
  if (commentsRes.ok) {
    const commentsData = (await commentsRes.json()) as {
      items?: Array<{ id: number; title?: string }>;
    };
    for (const item of commentsData.items ?? []) {
      const inserted = await writeEvent({
        memberId: request.auth.uid,
        platform: "github",
        type: "comment",
        externalId: `comment_${item.id}`,
        metadata: { title: item.title ?? "" },
      });
      if (inserted) synced += 1;
    }
  }

  return { synced, provider: "github" };
});

export const syncGoogleDocsContributions = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must sign in first.");
  }

  const accessToken = request.data?.accessToken as string | undefined;
  if (!accessToken) {
    throw new HttpsError("invalid-argument", "Missing Google access token.");
  }

  const filesRes = await fetch(
    "https://www.googleapis.com/drive/v3/files?pageSize=20&q=mimeType='application/vnd.google-apps.document' and trashed=false&fields=files(id,name,modifiedTime)",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  if (!filesRes.ok) {
    const body = await filesRes.text();
    throw new HttpsError("permission-denied", `Unable to read Google Docs metadata: ${body}`);
  }

  const filesData = (await filesRes.json()) as {
    files?: Array<{ id: string; name?: string; modifiedTime?: string }>;
  };

  let synced = 0;
  for (const file of filesData.files ?? []) {
    const inserted = await writeEvent({
      memberId: request.auth.uid,
      platform: "google_docs",
      type: "comment",
      externalId: `doc_${file.id}`,
      metadata: {
        name: file.name ?? "Untitled Doc",
        modifiedTime: file.modifiedTime ?? "",
      },
    });
    if (inserted) synced += 1;
  }

  return { synced, provider: "google_docs" };
});

export const recordPeerValidation = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must sign in first.");
  }
  const targetMemberId = request.data?.targetMemberId as string | undefined;
  if (!targetMemberId) {
    throw new HttpsError("invalid-argument", "targetMemberId is required.");
  }

  const inserted = await writeEvent({
    memberId: targetMemberId,
    platform: "google_docs",
    type: "peer_validation",
    externalId: `peer_${request.auth.uid}_${Date.now()}`,
    metadata: { validatorId: request.auth.uid },
  });

  return { synced: inserted ? 1 : 0, provider: "peer_validation" };
});

export const syncFigmaContributions = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must sign in first.");
  }

  const figmaHandle = (request.data?.figmaHandle as string | undefined)?.trim();
  const figmaFileKey = (request.data?.figmaFileKey as string | undefined)?.trim();
  if (!figmaHandle && !figmaFileKey) {
    throw new HttpsError(
      "invalid-argument",
      "Provide figmaHandle or figmaFileKey for Figma tracking.",
    );
  }

  const eventId = `figma_manual_${request.auth.uid}_${figmaHandle ?? figmaFileKey}`;
  const inserted = await writeEvent({
    memberId: request.auth.uid,
    platform: "figma",
    type: "comment",
    externalId: eventId,
    metadata: {
      source: "figma_manual",
      figmaHandle: figmaHandle ?? "",
      figmaFileKey: figmaFileKey ?? "",
    },
  });

  return { synced: inserted ? 1 : 0, provider: "figma" };
});

export const syncCanvaContributions = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must sign in first.");
  }

  const canvaUsername = (request.data?.canvaUsername as string | undefined)?.trim();
  const canvaProjectName = (request.data?.canvaProjectName as string | undefined)?.trim();
  if (!canvaUsername && !canvaProjectName) {
    throw new HttpsError(
      "invalid-argument",
      "Provide canvaUsername or canvaProjectName for Canva tracking.",
    );
  }

  const eventId = `canva_manual_${request.auth.uid}_${canvaUsername ?? canvaProjectName}`;
  const inserted = await writeEvent({
    memberId: request.auth.uid,
    platform: "canva",
    type: "comment",
    externalId: eventId,
    metadata: {
      source: "canva_manual",
      canvaUsername: canvaUsername ?? "",
      canvaProjectName: canvaProjectName ?? "",
    },
  });

  return { synced: inserted ? 1 : 0, provider: "canva" };
});

function rebalanceTasks(tasks: PlannedTask[], memberIds: string[]) {
  if (!memberIds.length || !tasks.length) return tasks;

  const totals = new Map<string, number>();
  memberIds.forEach((memberId) => totals.set(memberId, 0));

  tasks.forEach((task) => {
    totals.set(task.assigneeId, (totals.get(task.assigneeId) ?? 0) + task.estimateHours);
  });

  const sortedTasks = [...tasks].sort((a, b) => b.estimateHours - a.estimateHours);
  for (const task of sortedTasks) {
    const maxEntry = [...totals.entries()].sort((a, b) => b[1] - a[1])[0];
    const minEntry = [...totals.entries()].sort((a, b) => a[1] - b[1])[0];
    if (!maxEntry || !minEntry) continue;

    const [maxMember, maxHours] = maxEntry;
    const [minMember, minHours] = minEntry;
    if (maxHours - minHours <= 2) break;
    if (task.assigneeId !== maxMember) continue;
    if (task.estimateHours > maxHours - minHours) continue;

    totals.set(maxMember, maxHours - task.estimateHours);
    totals.set(minMember, minHours + task.estimateHours);
    task.assigneeId = minMember;
  }

  return sortedTasks;
}

export const generateTaskPlan = onCall({ secrets: [geminiApiKey] }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must sign in first.");
  }

  const projectDescription = request.data?.projectDescription as string | undefined;
  const membersRaw = request.data?.members as
    | Array<{ id: string; name: string; skills?: string[] }>
    | undefined;
  const dueDate = request.data?.dueDate as string | undefined;
  const projectId = request.data?.projectId as string | undefined;

  if (!projectDescription?.trim()) {
    throw new HttpsError("invalid-argument", "projectDescription is required.");
  }
  if (!membersRaw?.length) {
    throw new HttpsError("invalid-argument", "members are required.");
  }

  const memberIds = membersRaw.map((member) => member.id);
  const apiKey = geminiApiKey.value();
  if (!apiKey) {
    throw new HttpsError("failed-precondition", "GEMINI_API_KEY is not configured.");
  }

  const prompt = `
You are a project planner. Create an implementation task plan.
Project description: ${projectDescription}
Members: ${JSON.stringify(membersRaw)}
Due date: ${dueDate ?? "Not provided"}

Rules:
- Return only valid JSON.
- Create 6 to 12 practical engineering tasks.
- Each task must have: title, description, estimateHours (integer 1-12), assigneeId, priority.
- assigneeId must be one of: ${memberIds.join(", ")}
- Keep workload as balanced as possible across members.
- Prefer actionable tasks, not vague statements.

JSON schema:
{"tasks":[{"title":"", "description":"", "estimateHours":4, "assigneeId":"", "priority":"low|medium|high"}]}
`;

  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.3,
        },
      }),
    },
  );

  if (!geminiResponse.ok) {
    const body = await geminiResponse.text();
    throw new HttpsError("internal", `Gemini call failed: ${body}`);
  }

  const geminiPayload = (await geminiResponse.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const jsonText =
    geminiPayload.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
  if (!jsonText) {
    throw new HttpsError("internal", "Gemini returned empty task plan.");
  }

  let parsed: { tasks?: PlannedTask[] };
  try {
    parsed = JSON.parse(jsonText) as { tasks?: PlannedTask[] };
  } catch {
    throw new HttpsError("internal", "Gemini response JSON parsing failed.");
  }

  const tasks = (parsed.tasks ?? [])
    .filter((task) => task.title && task.assigneeId && memberIds.includes(task.assigneeId))
    .map((task): PlannedTask => {
      const priority: PlannedTask["priority"] =
        task.priority === "high" || task.priority === "low" ? task.priority : "medium";
      return {
        title: task.title.trim(),
        description: (task.description ?? "").trim(),
        estimateHours: Math.max(1, Math.min(12, Math.round(task.estimateHours || 1))),
        assigneeId: task.assigneeId,
        priority,
      };
    });

  if (!tasks.length) {
    throw new HttpsError("internal", "No valid tasks returned by Gemini.");
  }

  const balancedTasks = rebalanceTasks(tasks, memberIds);

  const createdTasks: Array<
    PlannedTask & {
      id: string;
    }
  > = [];
  for (const task of balancedTasks) {
    const taskId = `task_${Date.now()}_${Math.random().toString(16).slice(2, 7)}`;
    await db.collection("tasks").doc(taskId).set({
      title: task.title,
      projectId: projectId ?? null,
      assigneeId: task.assigneeId,
      dueDate: dueDate ?? new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      estimateHours: task.estimateHours,
      status: "todo",
      description: task.description,
      priority: task.priority,
    });

    await db.collection("events").doc(`canva_${task.assigneeId}_${taskId}`).set({
      memberId: task.assigneeId,
      projectId: projectId ?? null,
      platform: "canva",
      type: "task_created",
      metadata: { taskId, generatedBy: "gemini" },
      createdAt: new Date().toISOString(),
    });

    createdTasks.push({ ...task, id: taskId });
  }

  return { createdTasks: createdTasks.length, tasks: createdTasks };
});
