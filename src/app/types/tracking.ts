export type IntegrationProvider = "github" | "google_docs" | "figma" | "canva";

export type IntegrationStatus = "connected" | "disconnected" | "pending";

export type ActivityType =
  | "task_created"
  | "task_completed"
  | "deadline_bonus"
  | "comment"
  | "peer_validation"
  | "pr_merged";

export type TeamMember = {
  id: string;
  name: string;
  email?: string;
  githubUsername?: string;
  googleEmail?: string;
  figmaHandle?: string;
  isAvailable?: boolean;
  isTeamLead?: boolean;
};

export type ContributionEvent = {
  id: string;
  memberId: string;
  projectId?: string;
  platform: IntegrationProvider;
  type: ActivityType;
  createdAt: string;
  metadata?: Record<string, string | number | boolean | null>;
};

export type AuthMember = {
  uid: string;
  displayName: string;
  email: string;
  providerIds: string[];
};

export type TaskStatus = "todo" | "in_progress" | "done";

export type ProjectTask = {
  id: string;
  projectId?: string;
  title: string;
  assigneeId: string;
  dueDate: string;
  estimateHours: number;
  status: TaskStatus;
  description?: string;
  priority?: "low" | "medium" | "high";
  parentTaskId?: string;
};

export type IntegrationRecord = {
  provider: IntegrationProvider;
  status: IntegrationStatus;
  connectedAt?: string;
};

export type TimeLimit = {
  label: string;
  dueDate: string;
};

export type TeamProject = {
  id: string;
  name: string;
  description?: string;
  adminId?: string;
  memberIds: string[];
  createdAt?: string;
};

export type ProjectRequestStatus = "pending" | "accepted" | "rejected";

export type ProjectRequestTeammate = {
  name: string;
  email?: string;
};

export type ProjectRequest = {
  id: string;
  projectName: string;
  description?: string;
  leadMemberId: string;
  leadName: string;
  adminId: string;
  adminName?: string;
  teammates: ProjectRequestTeammate[];
  status: ProjectRequestStatus;
  createdAt: string;
  reviewedAt?: string;
};

export type TrackingSnapshot = {
  teamName: string;
  projects: TeamProject[];
  members: TeamMember[];
  events: ContributionEvent[];
  tasks: ProjectTask[];
  exchangeRequests: TaskExchangeRequest[];
  projectRequests: ProjectRequest[];
  integrations: IntegrationRecord[];
  timeLimits: TimeLimit[];
};

export type TaskExchangeRequestStatus = "pending" | "accepted" | "rejected";

export type TaskExchangeRequest = {
  id: string;
  fromTaskId: string;
  toTaskId: string;
  requesterId: string;
  targetMemberId: string;
  status: TaskExchangeRequestStatus;
  createdAt: string;
};
