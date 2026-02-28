import type {
  ActivityType,
  ContributionEvent,
  IntegrationProvider,
  TeamMember,
} from "../types/tracking";

export const EVENT_POINTS: Record<ActivityType, number> = {
  task_created: 5,
  task_completed: 20,
  deadline_bonus: 10,
  comment: 3,
  peer_validation: 10,
  pr_merged: 15,
};

export type MemberScore = {
  memberId: string;
  memberName: string;
  totalPoints: number;
  scoreOutOf100: number;
  quality: number;
  timeliness: number;
  collaboration: number;
  grade: "A" | "B" | "C" | "D";
  taskCompletionScore: number;
  deadlineAdherenceScore: number;
  activityLogsScore: number;
  peerReviewScore: number;
  eventCounts: Record<ActivityType, number>;
};

function normalizePerTeam(raw: number, maxRaw: number) {
  if (!maxRaw) return 0;
  return Math.round((raw / maxRaw) * 100);
}

export function gradeFromScore(score: number): "A" | "B" | "C" | "D" {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  return "D";
}

export function aggregatePlatformShare(events: ContributionEvent[]) {
  const counts: Record<IntegrationProvider, number> = {
    github: 0,
    google_docs: 0,
    figma: 0,
    canva: 0,
  };
  events.forEach((event) => {
    counts[event.platform] += 1;
  });
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  return Object.entries(counts).map(([platform, count]) => ({
    platform: platform as IntegrationProvider,
    count,
    percentage: total ? Math.round((count / total) * 100) : 0,
  }));
}

export function calculateMemberScores(
  members: TeamMember[],
  events: ContributionEvent[],
) {
  const rawByMember = members.map((member) => {
    const memberEvents = events.filter((event) => event.memberId === member.id);
    const eventCounts: Record<ActivityType, number> = {
      task_created: 0,
      task_completed: 0,
      deadline_bonus: 0,
      comment: 0,
      peer_validation: 0,
      pr_merged: 0,
    };
    memberEvents.forEach((event) => {
      eventCounts[event.type] += 1;
    });

    const totalPoints = memberEvents.reduce(
      (sum, event) => sum + EVENT_POINTS[event.type],
      0,
    );

    const taskCompletionRaw =
      eventCounts.task_created * EVENT_POINTS.task_created +
      eventCounts.task_completed * EVENT_POINTS.task_completed;
    const deadlineRaw = eventCounts.deadline_bonus * EVENT_POINTS.deadline_bonus;
    const activityRaw =
      eventCounts.comment * EVENT_POINTS.comment +
      eventCounts.pr_merged * EVENT_POINTS.pr_merged;
    const peerRaw = eventCounts.peer_validation * EVENT_POINTS.peer_validation;

    return {
      member,
      totalPoints,
      eventCounts,
      taskCompletionRaw,
      deadlineRaw,
      activityRaw,
      peerRaw,
    };
  });

  const maxTaskRaw = Math.max(...rawByMember.map((item) => item.taskCompletionRaw), 0);
  const maxDeadlineRaw = Math.max(...rawByMember.map((item) => item.deadlineRaw), 0);
  const maxActivityRaw = Math.max(...rawByMember.map((item) => item.activityRaw), 0);
  const maxPeerRaw = Math.max(...rawByMember.map((item) => item.peerRaw), 0);

  const scored = rawByMember.map<MemberScore>((item) => {
    const taskCompletionScore = normalizePerTeam(item.taskCompletionRaw, maxTaskRaw);
    const deadlineAdherenceScore = normalizePerTeam(item.deadlineRaw, maxDeadlineRaw);
    const activityLogsScore = normalizePerTeam(item.activityRaw, maxActivityRaw);
    const peerReviewScore = normalizePerTeam(item.peerRaw, maxPeerRaw);

    const scoreOutOf100 = Math.round(
      taskCompletionScore * 0.4 +
        deadlineAdherenceScore * 0.2 +
        activityLogsScore * 0.2 +
        peerReviewScore * 0.2,
    );

    const quality = Math.round(taskCompletionScore * 0.6 + peerReviewScore * 0.4);
    const timeliness = deadlineAdherenceScore;
    const collaboration = Math.round(activityLogsScore * 0.5 + peerReviewScore * 0.5);

    return {
      memberId: item.member.id,
      memberName: item.member.name,
      totalPoints: item.totalPoints,
      scoreOutOf100,
      quality,
      timeliness,
      collaboration,
      grade: gradeFromScore(scoreOutOf100),
      taskCompletionScore,
      deadlineAdherenceScore,
      activityLogsScore,
      peerReviewScore,
      eventCounts: item.eventCounts,
    };
  });

  return scored.sort((a, b) => b.scoreOutOf100 - a.scoreOutOf100);
}

export function describeEvent(event: ContributionEvent, memberName: string) {
  const typeLabels: Record<ActivityType, string> = {
    task_created: "created a task",
    task_completed: "completed a task",
    deadline_bonus: "earned a deadline bonus",
    comment: "added a contribution comment",
    peer_validation: "received peer validation",
    pr_merged: "got a pull request merged",
  };
  return `${memberName} ${typeLabels[event.type]}`;
}
