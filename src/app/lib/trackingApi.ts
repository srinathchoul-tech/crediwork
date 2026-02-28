import {
  collection,
  deleteDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db, firebaseEnabled } from "./firebase";
import { demoSnapshot } from "./demoData";
import type {
  ActivityType,
  AuthMember,
  ContributionEvent,
  IntegrationProvider,
  IntegrationRecord,
  ProjectTask,
  ProjectRequest,
  ProjectRequestTeammate,
  TeamProject,
  TaskExchangeRequest,
  TeamMember,
  TrackingSnapshot,
} from "../types/tracking";

const COLLECTIONS = {
  members: "members",
  projects: "projects",
  events: "events",
  tasks: "tasks",
  exchangeRequests: "exchange_requests",
  projectRequests: "project_requests",
  integrations: "integrations",
  config: "config",
};

function getTeamNameFromConfig(raw: unknown) {
  if (!raw || typeof raw !== "object") return demoSnapshot.teamName;
  const value = (raw as { teamName?: unknown }).teamName;
  return typeof value === "string" && value.trim()
    ? value
    : demoSnapshot.teamName;
}

export async function loadTrackingSnapshot(): Promise<TrackingSnapshot> {
  if (!firebaseEnabled || !db) {
    return demoSnapshot;
  }

  const [membersSnap, projectsSnap, eventsSnap, tasksSnap, requestsSnap, projectRequestsSnap, integrationsSnap, configSnap] =
    await Promise.all([
      getDocs(collection(db, COLLECTIONS.members)),
      getDocs(collection(db, COLLECTIONS.projects)),
      getDocs(
        query(
          collection(db, COLLECTIONS.events),
          orderBy("createdAt", "desc"),
          limit(500),
        ),
      ),
      getDocs(collection(db, COLLECTIONS.tasks)),
      getDocs(collection(db, COLLECTIONS.exchangeRequests)),
      getDocs(
        query(
          collection(db, COLLECTIONS.projectRequests),
          orderBy("createdAt", "desc"),
          limit(200),
        ),
      ),
      getDocs(collection(db, COLLECTIONS.integrations)),
      getDocs(collection(db, COLLECTIONS.config)),
    ]);

  const members = membersSnap.docs.map(
    (entry) => {
      const member = { id: entry.id, ...entry.data() } as TeamMember;
      return { ...member, isAvailable: member.isAvailable ?? true };
    },
  );
  const projects = projectsSnap.docs.map(
    (entry) => ({ id: entry.id, ...entry.data() }) as TeamProject,
  );
  const events = eventsSnap.docs.map(
    (entry) => ({ id: entry.id, ...entry.data() }) as ContributionEvent,
  );
  const tasks = tasksSnap.docs.map(
    (entry) => ({ id: entry.id, ...entry.data() }) as ProjectTask,
  );
  const exchangeRequests = requestsSnap.docs.map(
    (entry) => ({ id: entry.id, ...entry.data() }) as TaskExchangeRequest,
  );
  const projectRequests = projectRequestsSnap.docs.map(
    (entry) => ({ id: entry.id, ...entry.data() }) as ProjectRequest,
  );
  const integrations = integrationsSnap.docs.map(
    (entry) => ({ provider: entry.id, ...entry.data() }) as IntegrationRecord,
  );
  const defaultIntegrations: IntegrationRecord[] = [
    { provider: "github", status: "disconnected" },
    { provider: "google_docs", status: "disconnected" },
    { provider: "figma", status: "pending" },
    { provider: "canva", status: "connected" },
  ];
  const mergedIntegrations = defaultIntegrations.map((defaults) => {
    const existing = integrations.find((entry) => entry.provider === defaults.provider);
    return existing ?? defaults;
  });
  const configDoc = configSnap.docs.find((entry) => entry.id === "team");
  const teamName = getTeamNameFromConfig(configDoc?.data());

  return {
    teamName,
    projects: projects.length ? projects : demoSnapshot.projects,
    members: members.length ? members : demoSnapshot.members,
    events: events.length ? events : demoSnapshot.events,
    tasks: tasks.length ? tasks : demoSnapshot.tasks,
    exchangeRequests,
    projectRequests,
    integrations: mergedIntegrations.length ? mergedIntegrations : demoSnapshot.integrations,
    timeLimits: demoSnapshot.timeLimits,
  };
}

export async function upsertMember(member: AuthMember) {
  if (!firebaseEnabled || !db) return;
  await setDoc(
    doc(db, COLLECTIONS.members, member.uid),
    {
      name: member.displayName,
      email: member.email,
      providerIds: member.providerIds,
    },
    { merge: true },
  );
}

export async function createProject(params: {
  name: string;
  description?: string;
  adminId?: string;
  memberIds?: string[];
}) {
  if (!firebaseEnabled || !db) return;
  const projectId = `proj_${Date.now()}_${Math.random().toString(16).slice(2, 7)}`;
  await setDoc(doc(db, COLLECTIONS.projects, projectId), {
    name: params.name.trim(),
    description: params.description?.trim() ?? "",
    adminId: params.adminId ?? null,
    memberIds: params.memberIds ?? [],
    createdAt: new Date().toISOString(),
  });
}

export async function updateProjectMembers(projectId: string, memberIds: string[]) {
  if (!firebaseEnabled || !db) return;
  await setDoc(doc(db, COLLECTIONS.projects, projectId), { memberIds }, { merge: true });
}

export async function createProjectRequest(params: {
  projectName: string;
  description?: string;
  leadMemberId: string;
  leadName: string;
  adminId: string;
  adminName?: string;
  teammates: ProjectRequestTeammate[];
}) {
  if (!firebaseEnabled || !db) return;
  const requestId = `prjreq_${Date.now()}_${Math.random().toString(16).slice(2, 7)}`;
  await setDoc(doc(db, COLLECTIONS.projectRequests, requestId), {
    projectName: params.projectName.trim(),
    description: params.description?.trim() ?? "",
    leadMemberId: params.leadMemberId,
    leadName: params.leadName,
    adminId: params.adminId,
    adminName: params.adminName ?? "",
    teammates: params.teammates,
    status: "pending",
    createdAt: new Date().toISOString(),
  });
}

export async function respondProjectRequest(params: {
  requestId: string;
  decision: "accepted" | "rejected";
}) {
  if (!firebaseEnabled || !db) return;
  const requestRef = doc(db, COLLECTIONS.projectRequests, params.requestId);
  const requestSnap = await getDocs(
    query(collection(db, COLLECTIONS.projectRequests), limit(500)),
  );
  const requestMap = new Map(
    requestSnap.docs.map((entry) => [entry.id, { id: entry.id, ...entry.data() } as ProjectRequest]),
  );
  const request = requestMap.get(params.requestId);
  if (!request) return;

  await updateDoc(requestRef, {
    status: params.decision,
    reviewedAt: new Date().toISOString(),
  });

  if (params.decision !== "accepted") return;

  const membersSnap = await getDocs(collection(db, COLLECTIONS.members));
  const existingMembers = membersSnap.docs.map(
    (entry) => ({ id: entry.id, ...entry.data() }) as TeamMember,
  );

  const linkedMemberIds = new Set<string>([request.leadMemberId]);
  for (const teammate of request.teammates) {
    const email = teammate.email?.trim().toLowerCase();
    let matched = existingMembers.find((member) => email && member.email?.toLowerCase() === email);
    if (!matched) {
      matched = existingMembers.find((member) => member.name.toLowerCase() === teammate.name.toLowerCase());
    }
    if (!matched) {
      const newMemberId = `member_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`;
      await setDoc(doc(db, COLLECTIONS.members, newMemberId), {
        name: teammate.name.trim(),
        email: email ?? "",
        isAvailable: true,
      });
      linkedMemberIds.add(newMemberId);
    } else {
      linkedMemberIds.add(matched.id);
    }
  }

  await createProject({
    name: request.projectName,
    description: request.description,
    adminId: request.adminId,
    memberIds: [...linkedMemberIds],
  });
}

export async function updateMemberAvailability(memberId: string, isAvailable: boolean) {
  if (!firebaseEnabled || !db) return;
  await setDoc(doc(db, COLLECTIONS.members, memberId), { isAvailable }, { merge: true });
}

export async function updateMemberTeamLead(memberId: string, isTeamLead: boolean) {
  if (!firebaseEnabled || !db) return;
  await setDoc(doc(db, COLLECTIONS.members, memberId), { isTeamLead }, { merge: true });
}

export async function updateMemberGithubUsername(memberId: string, githubUsername: string) {
  if (!firebaseEnabled || !db) return;
  await setDoc(
    doc(db, COLLECTIONS.members, memberId),
    { githubUsername: githubUsername.trim() },
    { merge: true },
  );
}

export async function addContributionEvent(params: {
  memberId: string;
  projectId?: string;
  type: ActivityType;
  platform: IntegrationProvider;
  metadata?: Record<string, string | number | boolean | null>;
}) {
  if (!firebaseEnabled || !db) return;
  const eventId = `evt_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
  await setDoc(doc(db, COLLECTIONS.events, eventId), {
    memberId: params.memberId,
    projectId: params.projectId ?? null,
    type: params.type,
    platform: params.platform,
    metadata: params.metadata ?? null,
    createdAt: new Date().toISOString(),
  });
}

export async function createTask(task: ProjectTask, actorMemberId?: string) {
  if (!firebaseEnabled || !db) return;
  await setDoc(doc(db, COLLECTIONS.tasks, task.id), task);
  if (actorMemberId) {
    await addContributionEvent({
      memberId: actorMemberId,
      projectId: task.projectId,
      type: "task_created",
      platform: "canva",
      metadata: { taskId: task.id, title: task.title },
    });
  }
}

export async function deleteTask(taskId: string) {
  if (!firebaseEnabled || !db) return;
  await deleteDoc(doc(db, COLLECTIONS.tasks, taskId));
}

export async function createExchangeRequest(params: {
  fromTaskId: string;
  toTaskId: string;
  requesterId: string;
  targetMemberId: string;
}) {
  if (!firebaseEnabled || !db) return;
  const requestId = `ex_${Date.now()}_${Math.random().toString(16).slice(2, 7)}`;
  await setDoc(doc(db, COLLECTIONS.exchangeRequests, requestId), {
    fromTaskId: params.fromTaskId,
    toTaskId: params.toTaskId,
    requesterId: params.requesterId,
    targetMemberId: params.targetMemberId,
    status: "pending",
    createdAt: new Date().toISOString(),
  });
}

export async function respondExchangeRequest(params: {
  requestId: string;
  status: "accepted" | "rejected";
}) {
  if (!firebaseEnabled || !db) return;
  await updateDoc(doc(db, COLLECTIONS.exchangeRequests, params.requestId), {
    status: params.status,
  });
}

export async function swapTaskOwnership(fromTaskId: string, toTaskId: string) {
  if (!firebaseEnabled || !db) return;
  const tasksSnap = await getDocs(
    query(collection(db, COLLECTIONS.tasks), limit(500)),
  );
  const taskMap = new Map(
    tasksSnap.docs.map((entry) => [entry.id, { id: entry.id, ...entry.data() } as ProjectTask]),
  );
  const fromTask = taskMap.get(fromTaskId);
  const toTask = taskMap.get(toTaskId);
  if (!fromTask || !toTask) return;

  await updateDoc(doc(db, COLLECTIONS.tasks, fromTaskId), { assigneeId: toTask.assigneeId });
  await updateDoc(doc(db, COLLECTIONS.tasks, toTaskId), { assigneeId: fromTask.assigneeId });
}

export async function updateTaskStatus(
  task: ProjectTask,
  status: ProjectTask["status"],
  actorMemberId?: string,
) {
  if (!firebaseEnabled || !db) return;
  await updateDoc(doc(db, COLLECTIONS.tasks, task.id), { status });

  if (status === "done" && actorMemberId) {
    await addContributionEvent({
      memberId: actorMemberId,
      projectId: task.projectId,
      type: "task_completed",
      platform: "canva",
      metadata: { taskId: task.id, title: task.title },
    });

    const dueDateTime = new Date(task.dueDate).getTime();
    if (Date.now() <= dueDateTime) {
      await addContributionEvent({
        memberId: actorMemberId,
        projectId: task.projectId,
        type: "deadline_bonus",
        platform: "canva",
        metadata: { taskId: task.id },
      });
    }
  }
}

export async function setIntegrationStatus(
  provider: IntegrationProvider,
  status: IntegrationRecord["status"],
) {
  if (!firebaseEnabled || !db) return;
  await setDoc(
    doc(db, COLLECTIONS.integrations, provider),
    {
      status,
      connectedAt: status === "connected" ? new Date().toISOString() : null,
    },
    { merge: true },
  );
}
