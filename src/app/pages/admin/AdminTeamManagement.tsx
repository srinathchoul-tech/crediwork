import { useMemo, useState } from "react";
import { useTrackingData } from "../../hooks/useTrackingData";

export function AdminTeamManagement() {
  const {
    snapshot,
    activeProjectId,
    setActiveProjectId,
    createProject,
    saveProjectMembers,
    reviewProjectRequest,
    setMemberUnavailable,
    addTask,
  } = useTrackingData();
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [assignTaskTitle, setAssignTaskTitle] = useState("");
  const [assignTaskDueDate, setAssignTaskDueDate] = useState("");
  const [assignTaskHours, setAssignTaskHours] = useState("3");
  const [assignToMemberId, setAssignToMemberId] = useState("");

  const activeProject = useMemo(
    () => snapshot.projects.find((project) => project.id === activeProjectId) ?? null,
    [activeProjectId, snapshot.projects],
  );

  const memberOptions = useMemo(
    () =>
      activeProject
        ? snapshot.members.filter((member) => activeProject.memberIds.includes(member.id))
        : snapshot.members,
    [activeProject, snapshot.members],
  );

  const toggleProjectMember = async (memberId: string) => {
    if (!activeProject) return;
    const nextMembers = activeProject.memberIds.includes(memberId)
      ? activeProject.memberIds.filter((id) => id !== memberId)
      : [...activeProject.memberIds, memberId];
    await saveProjectMembers(activeProject.id, nextMembers);
  };

  return (
    <section className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Project Requests</h2>
        <div className="space-y-3">
          {snapshot.projectRequests.filter((request) => request.status === "pending").length === 0 && (
            <p className="text-sm text-gray-600">No pending requests for this admin.</p>
          )}
          {snapshot.projectRequests
            .filter((request) => request.status === "pending")
            .map((request) => (
              <div key={request.id} className="border rounded-xl p-4">
                <div className="font-semibold text-gray-900">{request.projectName}</div>
                <div className="text-sm text-gray-700 mt-1">
                  Team lead: {request.leadName} | Admin: {request.adminName ?? request.adminId}
                </div>
                {request.description && (
                  <div className="text-sm text-gray-700 mt-1">{request.description}</div>
                )}
                <div className="text-xs text-gray-600 mt-2">
                  Teammates:{" "}
                  {request.teammates.length
                    ? request.teammates
                        .map((member) => `${member.name}${member.email ? ` (${member.email})` : ""}`)
                        .join(", ")
                    : "None provided"}
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => void reviewProjectRequest(request.id, "accepted")}
                    className="rounded-md bg-emerald-100 text-emerald-800 px-3 py-1 text-xs hover:bg-emerald-200"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => void reviewProjectRequest(request.id, "rejected")}
                    className="rounded-md bg-rose-100 text-rose-800 px-3 py-1 text-xs hover:bg-rose-200"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Team Management</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="border rounded-xl p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Create project</h3>
            <input
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
              placeholder="Project name"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <textarea
              value={projectDescription}
              onChange={(event) => setProjectDescription(event.target.value)}
              placeholder="Short description"
              className="w-full mt-2 rounded-lg border border-gray-300 px-3 py-2 text-sm"
              rows={3}
            />
            <button
              type="button"
              onClick={() =>
                void createProject({
                  name: projectName.trim(),
                  description: projectDescription.trim(),
                  memberIds: snapshot.members.map((member) => member.id),
                }).then(() => {
                  setProjectName("");
                  setProjectDescription("");
                })
              }
              disabled={!projectName.trim()}
              className="mt-3 px-4 py-2 rounded-lg bg-[#5b7c9a] text-white hover:bg-[#4a6b89] disabled:opacity-60"
            >
              Create Project
            </button>
          </div>

          <div className="border rounded-xl p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Select project</h3>
            <select
              value={activeProjectId}
              onChange={(event) => setActiveProjectId(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="all">All projects</option>
              {snapshot.projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-gray-600">
              Admin-to-user link is maintained through project membership.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Group users into project</h3>
        {!activeProject ? (
          <p className="text-sm text-gray-600">Select one project (not "All projects").</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {snapshot.members.map((member) => {
              const unavailable = member.isAvailable === false;
              const inProject = activeProject.memberIds.includes(member.id);
              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between border rounded-lg px-4 py-3"
                >
                  <div>
                    <div className="font-medium text-gray-900">{member.name}</div>
                    <div className={`text-sm ${unavailable ? "text-red-700" : "text-emerald-700"}`}>
                      {unavailable ? "Unavailable" : "Available"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void setMemberUnavailable(member.id, !unavailable)}
                      className="px-3 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-sm"
                    >
                      {unavailable ? "Mark available" : "Mark unavailable"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleProjectMember(member.id)}
                      className={`px-3 py-1 rounded-md text-sm ${
                        inProject
                          ? "bg-[#5b7c9a] text-white"
                          : "bg-white border border-gray-300 text-gray-700"
                      }`}
                    >
                      {inProject ? "In project" : "Add"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Assign work</h3>
        <div className="grid md:grid-cols-4 gap-2">
          <input
            value={assignTaskTitle}
            onChange={(event) => setAssignTaskTitle(event.target.value)}
            placeholder="Task title"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <select
            value={assignToMemberId}
            onChange={(event) => setAssignToMemberId(event.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Assign to</option>
            {memberOptions.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={assignTaskDueDate}
            onChange={(event) => setAssignTaskDueDate(event.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            min={1}
            value={assignTaskHours}
            onChange={(event) => setAssignTaskHours(event.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={() =>
            void addTask({
              id: `task_${Date.now()}`,
              projectId: activeProject?.id,
              title: assignTaskTitle.trim(),
              assigneeId: assignToMemberId,
              dueDate: assignTaskDueDate,
              estimateHours: Number(assignTaskHours) || 1,
              status: "todo",
            }).then(() => {
              setAssignTaskTitle("");
              setAssignToMemberId("");
              setAssignTaskDueDate("");
              setAssignTaskHours("3");
            })
          }
          disabled={!activeProject || !assignTaskTitle.trim() || !assignToMemberId || !assignTaskDueDate}
          className="mt-3 px-4 py-2 rounded-lg bg-[#5b7c9a] text-white hover:bg-[#4a6b89] disabled:opacity-60"
        >
          Assign Task
        </button>
      </div>
    </section>
  );
}
