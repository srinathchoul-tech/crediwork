import { useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Timer, Plus } from "lucide-react";
import { useTrackingData } from "../hooks/useTrackingData";
import { describeEvent } from "../lib/scoring";

const contributorColors = ["#2563eb", "#14b8a6", "#f97316", "#a855f7"];

function formatTimeRemaining(targetDate: string) {
  const now = new Date();
  const target = new Date(targetDate);
  const diffMs = target.getTime() - now.getTime();
  if (diffMs <= 0) return "Overdue";
  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  return `${days}d ${hours}h left`;
}

export function Dashboard() {
  const {
    snapshot,
    activeProjectId,
    currentMember,
    memberScores,
    platformShare,
    totalPoints,
    addTask,
    cycleTask,
    setMemberUnavailable,
    redistributeUnavailableTasks,
    redistributionBusy,
    requestTaskExchange,
    setActiveProjectId,
    submitProjectRequest,
  } = useTrackingData();
  const [taskForm, setTaskForm] = useState({
    projectId: snapshot.projects[0]?.id ?? "",
    title: "",
    assigneeId: snapshot.members[0]?.id ?? "",
    dueDate: "",
    estimateHours: "3",
  });
  const [exchangeDraft, setExchangeDraft] = useState<{
    fromTaskId: string;
    toTaskId: string;
  }>({ fromTaskId: "", toTaskId: "" });
  const [projectRequestForm, setProjectRequestForm] = useState({
    projectName: "",
    description: "",
    adminId: "",
    teammatesText: "",
  });

  const pieData = useMemo(
    () =>
      memberScores.map((member, index) => ({
        name: member.memberName,
        value: member.scoreOutOf100,
        color: contributorColors[index % contributorColors.length],
      })),
    [memberScores],
  );

  const projectNameById = useMemo(
    () => new Map(snapshot.projects.map((project) => [project.id, project.name])),
    [snapshot.projects],
  );
  const currentMemberProfile = useMemo(
    () => snapshot.members.find((member) => member.id === (currentMember?.uid ?? "")),
    [currentMember?.uid, snapshot.members],
  );
  const isTeamLead = currentMemberProfile?.isTeamLead === true;
  const adminOptions = useMemo(() => {
    try {
      const raw = localStorage.getItem("cw_users");
      if (!raw) return [] as Array<{ id: string; name: string }>;
      const users = JSON.parse(raw) as Array<{ id: string; name: string; role: string }>;
      return users.filter((user) => user.role === "admin").map((user) => ({ id: user.id, name: user.name }));
    } catch {
      return [] as Array<{ id: string; name: string }>;
    }
  }, []);

  const activeTasks = useMemo(
    () => snapshot.tasks.filter((task) => !task.parentTaskId || task.status !== "done"),
    [snapshot.tasks],
  );

  const tasksByAssignee = useMemo(() => {
    return activeTasks.reduce<Record<string, typeof activeTasks>>((acc, task) => {
      if (!acc[task.assigneeId]) acc[task.assigneeId] = [];
      acc[task.assigneeId].push(task);
      return acc;
    }, {});
  }, [activeTasks]);

  const completedTasks = activeTasks.filter((task) => task.status === "done").length;
  const taskCompletion = activeTasks.length
    ? Math.round((completedTasks / activeTasks.length) * 100)
    : 0;

  const recentActivities = useMemo(() => {
    const memberMap = new Map(snapshot.members.map((member) => [member.id, member.name]));
    return snapshot.events
      .slice(0, 5)
      .map((event) => describeEvent(event, memberMap.get(event.memberId) ?? "Member"));
  }, [snapshot.members, snapshot.events]);

  const exchangeFromTask = snapshot.tasks.find((task) => task.id === exchangeDraft.fromTaskId);
  const exchangeCandidates = snapshot.tasks.filter(
    (task) =>
      task.id !== exchangeDraft.fromTaskId &&
      task.status !== "done" &&
      (!exchangeFromTask || task.assigneeId !== exchangeFromTask.assigneeId),
  );

  const handleTaskCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!taskForm.title.trim() || !taskForm.dueDate || !taskForm.assigneeId || !taskForm.projectId) return;
    await addTask({
      id: `task_${Date.now()}`,
      projectId: taskForm.projectId,
      title: taskForm.title.trim(),
      assigneeId: taskForm.assigneeId,
      dueDate: taskForm.dueDate,
      estimateHours: Number(taskForm.estimateHours) || 0,
      status: "todo",
    });
    setTaskForm((previous) => ({ ...previous, title: "", dueDate: "", estimateHours: "3" }));
  };

  const handleProjectRequestSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!projectRequestForm.projectName.trim() || !projectRequestForm.adminId) return;
    const teammates = projectRequestForm.teammatesText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [namePart, emailPart] = line.split(",").map((part) => part.trim());
        return { name: namePart, email: emailPart || undefined };
      })
      .filter((entry) => entry.name);

    const selectedAdmin = adminOptions.find((admin) => admin.id === projectRequestForm.adminId);
    await submitProjectRequest({
      projectName: projectRequestForm.projectName.trim(),
      description: projectRequestForm.description.trim(),
      adminId: projectRequestForm.adminId,
      adminName: selectedAdmin?.name,
      teammates,
    });
    setProjectRequestForm({ projectName: "", description: "", adminId: "", teammatesText: "" });
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-[#d4e8f5] to-[#c5dae8] rounded-3xl p-8 shadow-lg">
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">
                Team performance
              </h2>
              <p className="text-gray-700 mt-2">
                {snapshot.teamName} has {snapshot.members.length} tracked members
                and {snapshot.events.length} contribution events.
              </p>
              <div className="mt-3 max-w-sm">
                <label className="text-sm text-gray-700">Project scope</label>
                <select
                  value={activeProjectId}
                  onChange={(event) => setActiveProjectId(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/60 bg-white px-3 py-2 text-sm"
                >
                  <option value="all">All my projects</option>
                  {snapshot.projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              {snapshot.timeLimits.map((limit) => {
                const timeLeft = formatTimeRemaining(limit.dueDate);
                return (
                  <div
                    key={limit.label}
                    className="bg-white/80 rounded-xl p-3 border border-white/60"
                  >
                    <div className="flex items-center gap-2 text-gray-700 text-sm">
                      <Timer className="w-4 h-4" />
                      {limit.label}
                    </div>
                    <div className="mt-2 text-sm font-semibold text-gray-900">
                      {new Date(limit.dueDate).toLocaleString()}
                    </div>
                    <div className="text-sm mt-1 text-emerald-700">{timeLeft}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white/60 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Contribution distribution</h3>
              <span className="text-sm text-gray-700">Total points: {totalPoints}</span>
            </div>
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={95}
                    paddingAngle={3}
                    stroke="#ffffff"
                    strokeWidth={2}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, _label, payload) => [
                      `${payload?.payload?.name}: ${value}%`,
                      "Score",
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid sm:grid-cols-2 gap-2 text-sm text-gray-800">
              {pieData.map((contributor) => (
                <div
                  key={contributor.name}
                  className="flex items-center justify-between bg-white rounded-lg px-3 py-2"
                >
                  <span>{contributor.name}</span>
                  <span className="font-semibold">{contributor.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-[#d4e8f5] to-[#c5dae8] rounded-3xl p-8 shadow-lg">
        <div className="grid xl:grid-cols-2 gap-8">
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Task creation and division</h3>
            <div className="bg-white/80 rounded-2xl p-4 border border-white/70 mb-4 space-y-3">
              {(
                <form
                  onSubmit={(event) => void handleProjectRequestSubmit(event)}
                  className="rounded-xl border border-gray-200 bg-white p-3 space-y-2"
                >
                  <div className="font-semibold text-gray-900">Team lead project request</div>
                  <p className="text-xs text-gray-600">
                    Submit a project request and choose an admin reviewer.
                    {!isTeamLead && " On submission, you will be marked as team lead for this request."}
                  </p>
                  <input
                    value={projectRequestForm.projectName}
                    onChange={(event) =>
                      setProjectRequestForm((previous) => ({
                        ...previous,
                        projectName: event.target.value,
                      }))
                    }
                    placeholder="Requested project name"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                  <textarea
                    value={projectRequestForm.description}
                    onChange={(event) =>
                      setProjectRequestForm((previous) => ({
                        ...previous,
                        description: event.target.value,
                      }))
                    }
                    placeholder="Short project description"
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                  <select
                    value={projectRequestForm.adminId}
                    onChange={(event) =>
                      setProjectRequestForm((previous) => ({
                        ...previous,
                        adminId: event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
                  >
                    <option value="">Select admin</option>
                    {adminOptions.map((admin) => (
                      <option key={admin.id} value={admin.id}>
                        {admin.name}
                      </option>
                    ))}
                  </select>
                  <textarea
                    value={projectRequestForm.teammatesText}
                    onChange={(event) =>
                      setProjectRequestForm((previous) => ({
                        ...previous,
                        teammatesText: event.target.value,
                      }))
                    }
                    placeholder="Teammates (one per line): Name, email(optional)"
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={!projectRequestForm.projectName.trim() || !projectRequestForm.adminId}
                    className="rounded-lg bg-[#5f7f99] text-white px-3 py-2 text-xs hover:bg-[#4b6a84] disabled:opacity-60"
                  >
                    Request Project From Admin
                  </button>
                </form>
              )}
              <div className="font-semibold text-gray-900">Task exchange</div>
              <p className="text-xs text-gray-600">
                Select a task, request exchange, and wait for accept/reject.
              </p>
              <div className="grid sm:grid-cols-2 gap-2">
                <select
                  value={exchangeDraft.fromTaskId}
                  onChange={(event) =>
                    setExchangeDraft((previous) => ({
                      ...previous,
                      fromTaskId: event.target.value,
                    }))
                  }
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
                >
                  <option value="">Select your task</option>
                  {snapshot.tasks
                    .filter((task) => task.status !== "done")
                    .map((task) => (
                      <option key={task.id} value={task.id}>
                        {task.title} ({snapshot.members.find((m) => m.id === task.assigneeId)?.name})
                      </option>
                    ))}
                </select>
                <select
                  value={exchangeDraft.toTaskId}
                  onChange={(event) =>
                    setExchangeDraft((previous) => ({
                      ...previous,
                      toTaskId: event.target.value,
                    }))
                  }
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
                >
                  <option value="">Select teammate task</option>
                  {exchangeCandidates.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.title} ({snapshot.members.find((m) => m.id === task.assigneeId)?.name})
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() =>
                  void requestTaskExchange({
                    fromTaskId: exchangeDraft.fromTaskId,
                    toTaskId: exchangeDraft.toTaskId,
                  })
                }
                disabled={!exchangeDraft.fromTaskId || !exchangeDraft.toTaskId}
                className="rounded-lg bg-[#5f7f99] text-white px-3 py-2 text-xs hover:bg-[#4b6a84] disabled:opacity-60"
              >
                Request Exchange
              </button>
            </div>
            <div className="bg-white/80 rounded-2xl p-4 border border-white/70 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900">Member availability</h4>
                <button
                  type="button"
                  onClick={() => void redistributeUnavailableTasks()}
                  disabled={redistributionBusy}
                  className="rounded-lg bg-[#5f7f99] text-white px-3 py-2 text-xs hover:bg-[#4b6a84] disabled:opacity-60"
                >
                  {redistributionBusy ? "Redistributing..." : "Admin: Redistribute"}
                </button>
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                {snapshot.members.map((member) => {
                  const isUnavailable = member.isAvailable === false;
                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-3 py-2"
                    >
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">{member.name}</div>
                        <div className={isUnavailable ? "text-red-700" : "text-emerald-700"}>
                          {isUnavailable ? "Unavailable" : "Available"}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void setMemberUnavailable(member.id, !isUnavailable)}
                        className={`rounded-lg px-3 py-1 text-xs font-medium ${
                          isUnavailable
                            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                            : "bg-rose-100 text-rose-800 hover:bg-rose-200"
                        }`}
                      >
                        {isUnavailable ? "Mark available" : "Mark unavailable"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
            <form
              onSubmit={(event) => void handleTaskCreate(event)}
              className="bg-white/80 rounded-2xl p-4 border border-white/70 space-y-3"
            >
              <input
                value={taskForm.title}
                onChange={(event) =>
                  setTaskForm((previous) => ({ ...previous, title: event.target.value }))
                }
                placeholder="Task name"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
              />
              <div className="grid sm:grid-cols-4 gap-2">
                <select
                  value={taskForm.projectId}
                  onChange={(event) =>
                    setTaskForm((previous) => ({ ...previous, projectId: event.target.value }))
                  }
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
                >
                  <option value="">Select project</option>
                  {snapshot.projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                <select
                  value={taskForm.assigneeId}
                  onChange={(event) =>
                    setTaskForm((previous) => ({ ...previous, assigneeId: event.target.value }))
                  }
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
                >
                  {snapshot.members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(event) =>
                    setTaskForm((previous) => ({ ...previous, dueDate: event.target.value }))
                  }
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
                />
                <input
                  type="number"
                  min={1}
                  value={taskForm.estimateHours}
                  onChange={(event) =>
                    setTaskForm((previous) => ({ ...previous, estimateHours: event.target.value }))
                  }
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
                  placeholder="Hours"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-[#5f7f99] text-white px-4 py-2 text-sm hover:bg-[#4b6a84] transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create task
              </button>
            </form>

            <div className="mt-4 bg-white/70 rounded-xl p-4">
              <div className="flex items-center justify-between text-sm text-gray-800">
                <span>Task completion</span>
                <span className="font-semibold">{taskCompletion}%</span>
              </div>
              <div className="h-3 mt-2 rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#5f7f99] to-[#8fb4ce]"
                  style={{ width: `${taskCompletion}%` }}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {Object.entries(tasksByAssignee).map(([assigneeId, assigneeTasks]) => (
              <div key={assigneeId} className="bg-white/75 rounded-2xl p-4">
                <h4 className="font-semibold text-gray-900 mb-3">
                  {snapshot.members.find((member) => member.id === assigneeId)?.name ??
                    assigneeId}{" "}
                  ({assigneeTasks.length} tasks)
                </h4>
                <div className="space-y-2">
                  {assigneeTasks.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => void cycleTask(task.id)}
                      className="w-full text-left rounded-xl border border-gray-200 bg-white px-3 py-2 hover:border-gray-400 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">{task.title}</span>
                        <span className="text-xs uppercase tracking-wide text-gray-600">
                          {task.status.replace("_", " ")}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-[#4b6a84]">
                        {projectNameById.get(task.projectId ?? "") ?? "General"}
                      </div>
                      <div className="mt-1 text-xs text-gray-600">
                        Due: {new Date(task.dueDate).toLocaleDateString()} | {task.estimateHours}h
                      </div>
                      <div className="mt-2">
                        <span
                          className="text-xs text-[#4b6a84] underline underline-offset-2"
                          onClick={(event) => {
                            event.stopPropagation();
                            setExchangeDraft((previous) => ({
                              ...previous,
                              fromTaskId: task.id,
                            }));
                          }}
                        >
                          Request Exchange
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-[#d4e8f5] to-[#c5dae8] rounded-3xl p-8 shadow-lg">
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Recent activity</h3>
            <ul className="space-y-2 text-gray-800">
              {recentActivities.map((activity) => (
                <li key={activity} className="flex items-start gap-2">
                  <span className="text-gray-600">-</span>
                  <span>{activity}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Contribution sources</h3>
            <div className="space-y-4">
              {platformShare.map((source) => (
                <div key={source.platform}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-gray-900">
                      {source.platform === "google_docs"
                        ? "Google Docs"
                        : source.platform === "canva"
                          ? "Canva"
                          : source.platform.charAt(0).toUpperCase() + source.platform.slice(1)}
                    </span>
                    <span className="font-semibold text-gray-900">{source.percentage}%</span>
                  </div>
                  <div className="h-3 bg-white/70 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#5f7f99] to-[#8fb4ce] rounded-full"
                      style={{ width: `${source.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
