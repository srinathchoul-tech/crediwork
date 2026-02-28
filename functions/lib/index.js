"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTaskPlan = exports.syncCanvaContributions = exports.syncFigmaContributions = exports.recordPeerValidation = exports.syncGoogleDocsContributions = exports.syncGithubContributions = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
const db = admin.firestore();
const geminiApiKey = (0, params_1.defineSecret)("GEMINI_API_KEY");
async function writeEvent(params) {
    const eventId = `${params.platform}_${params.memberId}_${params.externalId}`;
    const eventRef = db.collection("events").doc(eventId);
    const existing = await eventRef.get();
    if (existing.exists)
        return false;
    await eventRef.set({
        memberId: params.memberId,
        platform: params.platform,
        type: params.type,
        metadata: params.metadata ?? null,
        createdAt: new Date().toISOString(),
    });
    return true;
}
exports.syncGithubContributions = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "You must sign in first.");
    }
    const accessToken = request.data?.accessToken;
    const githubUsernameInput = request.data?.githubUsername;
    let githubUsername = githubUsernameInput?.trim();
    if (!accessToken && !githubUsername) {
        throw new https_1.HttpsError("invalid-argument", "Provide either GitHub access token or githubUsername.");
    }
    const githubHeaders = { "User-Agent": "CrediWork" };
    if (accessToken) {
        githubHeaders.Authorization = `Bearer ${accessToken}`;
    }
    if (accessToken && !githubUsername) {
        const userRes = await fetch("https://api.github.com/user", {
            headers: githubHeaders,
        });
        if (!userRes.ok) {
            const body = await userRes.text();
            throw new https_1.HttpsError("permission-denied", `Unable to read GitHub profile: ${body}`);
        }
        const userData = (await userRes.json());
        githubUsername = userData.login;
    }
    if (!githubUsername) {
        throw new https_1.HttpsError("invalid-argument", "GitHub username was not resolved.");
    }
    let synced = 0;
    const mergedRes = await fetch(`https://api.github.com/search/issues?q=author:${githubUsername}+type:pr+is:merged&per_page=20`, {
        headers: githubHeaders,
    });
    if (mergedRes.ok) {
        const mergedData = (await mergedRes.json());
        for (const item of mergedData.items ?? []) {
            const inserted = await writeEvent({
                memberId: request.auth.uid,
                platform: "github",
                type: "pr_merged",
                externalId: `pr_${item.id}`,
                metadata: { title: item.title ?? "" },
            });
            if (inserted)
                synced += 1;
        }
    }
    const commentsRes = await fetch(`https://api.github.com/search/issues?q=commenter:${githubUsername}&per_page=20`, {
        headers: githubHeaders,
    });
    if (commentsRes.ok) {
        const commentsData = (await commentsRes.json());
        for (const item of commentsData.items ?? []) {
            const inserted = await writeEvent({
                memberId: request.auth.uid,
                platform: "github",
                type: "comment",
                externalId: `comment_${item.id}`,
                metadata: { title: item.title ?? "" },
            });
            if (inserted)
                synced += 1;
        }
    }
    return { synced, provider: "github" };
});
exports.syncGoogleDocsContributions = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "You must sign in first.");
    }
    const accessToken = request.data?.accessToken;
    if (!accessToken) {
        throw new https_1.HttpsError("invalid-argument", "Missing Google access token.");
    }
    const filesRes = await fetch("https://www.googleapis.com/drive/v3/files?pageSize=20&q=mimeType='application/vnd.google-apps.document' and trashed=false&fields=files(id,name,modifiedTime)", {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!filesRes.ok) {
        const body = await filesRes.text();
        throw new https_1.HttpsError("permission-denied", `Unable to read Google Docs metadata: ${body}`);
    }
    const filesData = (await filesRes.json());
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
        if (inserted)
            synced += 1;
    }
    return { synced, provider: "google_docs" };
});
exports.recordPeerValidation = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "You must sign in first.");
    }
    const targetMemberId = request.data?.targetMemberId;
    if (!targetMemberId) {
        throw new https_1.HttpsError("invalid-argument", "targetMemberId is required.");
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
exports.syncFigmaContributions = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "You must sign in first.");
    }
    const figmaHandle = request.data?.figmaHandle?.trim();
    const figmaFileKey = request.data?.figmaFileKey?.trim();
    if (!figmaHandle && !figmaFileKey) {
        throw new https_1.HttpsError("invalid-argument", "Provide figmaHandle or figmaFileKey for Figma tracking.");
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
exports.syncCanvaContributions = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "You must sign in first.");
    }
    const canvaUsername = request.data?.canvaUsername?.trim();
    const canvaProjectName = request.data?.canvaProjectName?.trim();
    if (!canvaUsername && !canvaProjectName) {
        throw new https_1.HttpsError("invalid-argument", "Provide canvaUsername or canvaProjectName for Canva tracking.");
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
function rebalanceTasks(tasks, memberIds) {
    if (!memberIds.length || !tasks.length)
        return tasks;
    const totals = new Map();
    memberIds.forEach((memberId) => totals.set(memberId, 0));
    tasks.forEach((task) => {
        totals.set(task.assigneeId, (totals.get(task.assigneeId) ?? 0) + task.estimateHours);
    });
    const sortedTasks = [...tasks].sort((a, b) => b.estimateHours - a.estimateHours);
    for (const task of sortedTasks) {
        const maxEntry = [...totals.entries()].sort((a, b) => b[1] - a[1])[0];
        const minEntry = [...totals.entries()].sort((a, b) => a[1] - b[1])[0];
        if (!maxEntry || !minEntry)
            continue;
        const [maxMember, maxHours] = maxEntry;
        const [minMember, minHours] = minEntry;
        if (maxHours - minHours <= 2)
            break;
        if (task.assigneeId !== maxMember)
            continue;
        if (task.estimateHours > maxHours - minHours)
            continue;
        totals.set(maxMember, maxHours - task.estimateHours);
        totals.set(minMember, minHours + task.estimateHours);
        task.assigneeId = minMember;
    }
    return sortedTasks;
}
exports.generateTaskPlan = (0, https_1.onCall)({ secrets: [geminiApiKey] }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "You must sign in first.");
    }
    const projectDescription = request.data?.projectDescription;
    const membersRaw = request.data?.members;
    const dueDate = request.data?.dueDate;
    if (!projectDescription?.trim()) {
        throw new https_1.HttpsError("invalid-argument", "projectDescription is required.");
    }
    if (!membersRaw?.length) {
        throw new https_1.HttpsError("invalid-argument", "members are required.");
    }
    const memberIds = membersRaw.map((member) => member.id);
    const apiKey = geminiApiKey.value();
    if (!apiKey) {
        throw new https_1.HttpsError("failed-precondition", "GEMINI_API_KEY is not configured.");
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
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.3,
            },
        }),
    });
    if (!geminiResponse.ok) {
        const body = await geminiResponse.text();
        throw new https_1.HttpsError("internal", `Gemini call failed: ${body}`);
    }
    const geminiPayload = (await geminiResponse.json());
    const jsonText = geminiPayload.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
    if (!jsonText) {
        throw new https_1.HttpsError("internal", "Gemini returned empty task plan.");
    }
    let parsed;
    try {
        parsed = JSON.parse(jsonText);
    }
    catch {
        throw new https_1.HttpsError("internal", "Gemini response JSON parsing failed.");
    }
    const tasks = (parsed.tasks ?? [])
        .filter((task) => task.title && task.assigneeId && memberIds.includes(task.assigneeId))
        .map((task) => {
        const priority = task.priority === "high" || task.priority === "low" ? task.priority : "medium";
        return {
            title: task.title.trim(),
            description: (task.description ?? "").trim(),
            estimateHours: Math.max(1, Math.min(12, Math.round(task.estimateHours || 1))),
            assigneeId: task.assigneeId,
            priority,
        };
    });
    if (!tasks.length) {
        throw new https_1.HttpsError("internal", "No valid tasks returned by Gemini.");
    }
    const balancedTasks = rebalanceTasks(tasks, memberIds);
    const createdTasks = [];
    for (const task of balancedTasks) {
        const taskId = `task_${Date.now()}_${Math.random().toString(16).slice(2, 7)}`;
        await db.collection("tasks").doc(taskId).set({
            title: task.title,
            assigneeId: task.assigneeId,
            dueDate: dueDate ?? new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
            estimateHours: task.estimateHours,
            status: "todo",
            description: task.description,
            priority: task.priority,
        });
        await db.collection("events").doc(`canva_${task.assigneeId}_${taskId}`).set({
            memberId: task.assigneeId,
            platform: "canva",
            type: "task_created",
            metadata: { taskId, generatedBy: "gemini" },
            createdAt: new Date().toISOString(),
        });
        createdTasks.push({ ...task, id: taskId });
    }
    return { createdTasks: createdTasks.length, tasks: createdTasks };
});
