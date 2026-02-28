import { useCallback, useEffect, useMemo, useState } from "react";
import type { AuthMember, ProjectTask, TrackingSnapshot } from "../types/tracking";
import {
  createExchangeRequest,
  createProject as createProjectRecord,
  createProjectRequest,
  createTask,
  deleteTask,
  loadTrackingSnapshot,
  respondProjectRequest,
  respondExchangeRequest,
  swapTaskOwnership,
  updateMemberAvailability,
  updateMemberTeamLead,
  updateProjectMembers,
  updateTaskStatus,
  upsertMember,
} from "../lib/trackingApi";
import { aggregatePlatformShare, calculateMemberScores } from "../lib/scoring";
import { demoSnapshot } from "../lib/demoData";
import { watchAuthState } from "../lib/auth";

const ACTIVE_PROJECT_KEY = "cw_active_project";

function nextStatus(status: ProjectTask["status"]): ProjectTask["status"] {
  if (status === "todo") return "in_progress";
  if (status === "in_progress") return "done";
  return "todo";
}

function splitHours(totalHours: number, parts: number) {
  const base = Math.floor(totalHours / parts);
  const remainder = totalHours % parts;
  return Array.from({ length: parts }, (_, index) => base + (index < remainder ? 1 : 0));
}

function readSessionRole() {
  try {
    const raw = localStorage.getItem("cw_session");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { role?: "client" | "admin" };
    return parsed.role ?? null;
  } catch {
    return null;
  }
}

function readSessionUserId() {
  try {
    const raw = localStorage.getItem("cw_session");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { id?: string };
    return parsed.id ?? null;
  } catch {
    return null;
  }
}

export function useTrackingData() {
  const [snapshot, setSnapshot] = useState<TrackingSnapshot>(demoSnapshot);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentMember, setCurrentMember] = useState<AuthMember | null>(null);
  const [redistributionBusy, setRedistributionBusy] = useState(false);
  const [activeProjectId, setActiveProjectIdState] = useState<string>("all");

  const setActiveProjectId = useCallback((projectId: string) => {
    setActiveProjectIdState(projectId);
    localStorage.setItem(ACTIVE_PROJECT_KEY, projectId);
  }, []);

  useEffect(() => {
    const initial = localStorage.getItem(ACTIVE_PROJECT_KEY);
    if (initial) setActiveProjectIdState(initial);
  }, []);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      const data = await loadTrackingSnapshot();
      const role = readSessionRole();
      const sessionUserId = readSessionUserId();
      const viewerId = currentMember?.uid ?? sessionUserId ?? "";

      const filteredMembers = data.members;
      const allowedMemberIds = new Set(filteredMembers.map((member) => member.id));
      const filteredTasks = data.tasks.filter((task) => allowedMemberIds.has(task.assigneeId));
      const filteredEvents = data.events.filter((event) => allowedMemberIds.has(event.memberId));

      let visibleProjects = data.projects;
      if (viewerId) {
        if (role === "admin") {
          const adminProjects = data.projects.filter((project) => project.adminId === viewerId);
          visibleProjects = adminProjects.length ? adminProjects : data.projects;
        } else if (role === "client") {
          const memberProjects = data.projects.filter((project) =>
            project.memberIds.includes(viewerId),
          );
          visibleProjects = memberProjects.length ? memberProjects : data.projects;
        }
      }

      const visibleProjectIds = new Set(visibleProjects.map((project) => project.id));
      const hasActive =
        activeProjectId === "all" || visibleProjectIds.has(activeProjectId);
      const selectedProjectId = hasActive
        ? activeProjectId
        : visibleProjects[0]?.id ?? "all";

      if (selectedProjectId !== activeProjectId) {
        setActiveProjectIdState(selectedProjectId);
        localStorage.setItem(ACTIVE_PROJECT_KEY, selectedProjectId);
      }

      const projectScopedTasks = filteredTasks.filter((task) => {
        if (selectedProjectId === "all") {
          return !task.projectId || visibleProjectIds.has(task.projectId);
        }
        return task.projectId === selectedProjectId;
      });

      const projectScopedEvents = filteredEvents.filter((event) => {
        if (selectedProjectId === "all") {
          return !event.projectId || visibleProjectIds.has(event.projectId);
        }
        return event.projectId === selectedProjectId;
      });

      const filteredRequests = data.exchangeRequests.filter((request) =>
        projectScopedTasks.some((task) => task.id === request.fromTaskId) &&
        projectScopedTasks.some((task) => task.id === request.toTaskId) &&
        allowedMemberIds.has(request.requesterId) &&
        allowedMemberIds.has(request.targetMemberId),
      );

      const filteredProjectRequests = data.projectRequests.filter((request) => {
        if (role === "admin" && viewerId) return request.adminId === viewerId;
        if (role === "client" && viewerId) return request.leadMemberId === viewerId;
        return true;
      });

      setSnapshot({
        ...data,
        projects: visibleProjects,
        members: filteredMembers,
        tasks: projectScopedTasks,
        events: projectScopedEvents,
        exchangeRequests: filteredRequests,
        projectRequests: filteredProjectRequests,
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load tracking data");
    } finally {
      setLoading(false);
    }
  }, [activeProjectId, currentMember?.uid]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const unsubscribe = watchAuthState((member) => {
      setCurrentMember(member);
      if (member) {
        void upsertMember(member);
      }
    });
    return unsubscribe;
  }, []);

  const memberScores = useMemo(
    () => calculateMemberScores(snapshot.members, snapshot.events),
    [snapshot.members, snapshot.events],
  );

  const platformShare = useMemo(
    () => aggregatePlatformShare(snapshot.events),
    [snapshot.events],
  );

  const totalPoints = memberScores.reduce((sum, member) => sum + member.totalPoints, 0);

  const metrics = useMemo(() => {
    const taskCreated = snapshot.events.filter((event) => event.type === "task_created").length;
    const taskCompleted = snapshot.events.filter((event) => event.type === "task_completed").length;
    const comments = snapshot.events.filter((event) => event.type === "comment").length;
    const peerValidation = snapshot.events.filter(
      (event) => event.type === "peer_validation",
    ).length;
    const prMerged = snapshot.events.filter((event) => event.type === "pr_merged").length;
    return { taskCreated, taskCompleted, comments, peerValidation, prMerged };
  }, [snapshot.events]);

  const addTask = useCallback(
    async (task: ProjectTask) => {
      const effectiveProjectId = task.projectId ?? (activeProjectId !== "all" ? activeProjectId : undefined);
      const preparedTask = { ...task, projectId: effectiveProjectId };
      setSnapshot((previous) => ({ ...previous, tasks: [preparedTask, ...previous.tasks] }));
      await createTask(preparedTask, currentMember?.uid ?? task.assigneeId);
      await reload();
    },
    [activeProjectId, currentMember?.uid, reload],
  );

  const cycleTask = useCallback(
    async (taskId: string) => {
      let sourceTask: ProjectTask | null = null;
      let updatedStatus: ProjectTask["status"] | null = null;
      setSnapshot((previous) => ({
        ...previous,
        tasks: previous.tasks.map((task) => {
          if (task.id !== taskId) return task;
          sourceTask = task;
          updatedStatus = nextStatus(task.status);
          return { ...task, status: updatedStatus };
        }),
      }));

      if (sourceTask && updatedStatus) {
        await updateTaskStatus(
          sourceTask,
          updatedStatus,
          currentMember?.uid ?? sourceTask.assigneeId,
        );
        await reload();
      }
    },
    [currentMember?.uid, reload],
  );

  const setMemberUnavailable = useCallback(
    async (memberId: string, isUnavailable: boolean) => {
      const isAvailable = !isUnavailable;
      setSnapshot((previous) => ({
        ...previous,
        members: previous.members.map((member) =>
          member.id === memberId ? { ...member, isAvailable } : member,
        ),
      }));
      await updateMemberAvailability(memberId, isAvailable);
      await reload();
    },
    [reload],
  );

  const redistributeUnavailableTasks = useCallback(async () => {
    setRedistributionBusy(true);
    try {
      const unavailableMembers = snapshot.members.filter((member) => member.isAvailable === false);
      const availableMembers = snapshot.members.filter((member) => member.isAvailable !== false);
      if (!unavailableMembers.length || !availableMembers.length) return;

      const unavailableIds = new Set(unavailableMembers.map((member) => member.id));
      const impactedTasks = snapshot.tasks.filter(
        (task) => unavailableIds.has(task.assigneeId) && task.status !== "done",
      );
      if (!impactedTasks.length) return;

      const unaffectedTasks = snapshot.tasks.filter((task) => !impactedTasks.includes(task));
      const loadMap = new Map<string, number>();
      availableMembers.forEach((member) => loadMap.set(member.id, 0));
      unaffectedTasks
        .filter((task) => task.status !== "done" && loadMap.has(task.assigneeId))
        .forEach((task) =>
          loadMap.set(task.assigneeId, (loadMap.get(task.assigneeId) ?? 0) + task.estimateHours),
        );

      const newSubtasks: ProjectTask[] = [];
      for (const task of impactedTasks) {
        const parts = Math.min(availableMembers.length, Math.max(1, task.estimateHours));
        const hoursByPart = splitHours(task.estimateHours, parts).filter((hours) => hours > 0);

        hoursByPart.forEach((partHours, index) => {
          const assigneeId =
            [...loadMap.entries()].sort((a, b) => a[1] - b[1])[0]?.[0] ?? availableMembers[0].id;
          loadMap.set(assigneeId, (loadMap.get(assigneeId) ?? 0) + partHours);

          newSubtasks.push({
            id: `sub_${task.id}_${index + 1}_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
            title: `${task.title} - Subtask ${index + 1}/${hoursByPart.length}`,
            projectId: task.projectId,
            assigneeId,
            dueDate: task.dueDate,
            estimateHours: partHours,
            status: "todo",
            parentTaskId: task.id,
            description: `Split from ${task.title} due to member unavailability.`,
          });
        });
      }

      setSnapshot((previous) => ({ ...previous, tasks: [...unaffectedTasks, ...newSubtasks] }));

      for (const impacted of impactedTasks) {
        await deleteTask(impacted.id);
      }
      for (const subtask of newSubtasks) {
        await createTask(subtask, currentMember?.uid ?? subtask.assigneeId);
      }
      await reload();
    } finally {
      setRedistributionBusy(false);
    }
  }, [currentMember?.uid, reload, snapshot.members, snapshot.tasks]);

  const requestTaskExchange = useCallback(
    async (params: { fromTaskId: string; toTaskId: string }) => {
      const fromTask = snapshot.tasks.find((task) => task.id === params.fromTaskId);
      const toTask = snapshot.tasks.find((task) => task.id === params.toTaskId);
      if (!fromTask || !toTask) return;

      await createExchangeRequest({
        fromTaskId: fromTask.id,
        toTaskId: toTask.id,
        requesterId: currentMember?.uid ?? fromTask.assigneeId,
        targetMemberId: toTask.assigneeId,
      });
      await reload();
    },
    [currentMember?.uid, reload, snapshot.tasks],
  );

  const handleExchangeRequest = useCallback(
    async (requestId: string, decision: "accepted" | "rejected") => {
      const request = snapshot.exchangeRequests.find((item) => item.id === requestId);
      if (!request) return;

      if (decision === "accepted") {
        await swapTaskOwnership(request.fromTaskId, request.toTaskId);
      }
      await respondExchangeRequest({ requestId, status: decision });
      await reload();
    },
    [reload, snapshot.exchangeRequests],
  );

  const createProject = useCallback(
    async (params: { name: string; description?: string; memberIds?: string[] }) => {
      const sessionUserId = readSessionUserId();
      await createProjectRecord({
        name: params.name,
        description: params.description,
        adminId: currentMember?.uid ?? sessionUserId ?? undefined,
        memberIds: params.memberIds ?? [],
      });
      await reload();
    },
    [currentMember?.uid, reload],
  );

  const saveProjectMembers = useCallback(
    async (projectId: string, memberIds: string[]) => {
      await updateProjectMembers(projectId, memberIds);
      await reload();
    },
    [reload],
  );

  const submitProjectRequest = useCallback(
    async (params: {
      projectName: string;
      description?: string;
      adminId: string;
      adminName?: string;
      teammates: Array<{ name: string; email?: string }>;
    }) => {
      const leadId = currentMember?.uid ?? readSessionUserId();
      if (!leadId) throw new Error("Sign in required.");
      const leadName =
        snapshot.members.find((member) => member.id === leadId)?.name ??
        currentMember?.displayName ??
        "Team Lead";

      await updateMemberTeamLead(leadId, true);
      await createProjectRequest({
        projectName: params.projectName,
        description: params.description,
        leadMemberId: leadId,
        leadName,
        adminId: params.adminId,
        adminName: params.adminName,
        teammates: params.teammates,
      });
      await reload();
    },
    [currentMember?.displayName, currentMember?.uid, reload, snapshot.members],
  );

  const reviewProjectRequest = useCallback(
    async (requestId: string, decision: "accepted" | "rejected") => {
      await respondProjectRequest({ requestId, decision });
      await reload();
    },
    [reload],
  );

  return {
    snapshot,
    activeProjectId,
    memberScores,
    platformShare,
    totalPoints,
    metrics,
    loading,
    error,
    currentMember,
    redistributionBusy,
    reload,
    setActiveProjectId,
    createProject,
    saveProjectMembers,
    submitProjectRequest,
    reviewProjectRequest,
    addTask,
    cycleTask,
    setMemberUnavailable,
    redistributeUnavailableTasks,
    requestTaskExchange,
    handleExchangeRequest,
  };
}
