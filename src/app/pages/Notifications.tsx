import { useMemo } from "react";
import { useTrackingData } from "../hooks/useTrackingData";
import { describeEvent } from "../lib/scoring";

export function Notifications() {
  const { snapshot, handleExchangeRequest } = useTrackingData();

  const notifications = useMemo(() => {
    const memberMap = new Map(snapshot.members.map((member) => [member.id, member.name]));
    return snapshot.events.slice(0, 8).map((event) => ({
      id: event.id,
      title:
        event.platform === "github"
          ? "GitHub activity"
          : event.platform === "google_docs"
            ? "Google Docs activity"
            : event.platform === "figma"
              ? "Figma activity"
              : "Canva activity",
      description: describeEvent(event, memberMap.get(event.memberId) ?? "Member"),
      time: new Date(event.createdAt).toLocaleString(),
    }));
  }, [snapshot.events, snapshot.members]);

  const pendingRequests = snapshot.exchangeRequests.filter(
    (request) => request.status === "pending",
  );

  return (
    <div className="min-h-[600px] space-y-6">
      {pendingRequests.length > 0 && (
        <div className="bg-gradient-to-br from-[#d4e8f5] to-[#c5dae8] rounded-3xl p-8 shadow-lg">
          <h1 className="text-3xl font-semibold text-gray-900 mb-6">
            Pending Exchange Requests
          </h1>
          <div className="space-y-3">
            {pendingRequests.map((request) => {
              const fromTask = snapshot.tasks.find((task) => task.id === request.fromTaskId);
              const toTask = snapshot.tasks.find((task) => task.id === request.toTaskId);
              const requester = snapshot.members.find((member) => member.id === request.requesterId);
              const target = snapshot.members.find((member) => member.id === request.targetMemberId);
              return (
                <div
                  key={request.id}
                  className="bg-white rounded-xl p-5 shadow-md border border-white/60"
                >
                  <div className="text-gray-900 font-medium">
                    {requester?.name ?? "Member"} requested exchange with{" "}
                    {target?.name ?? "Member"}
                  </div>
                  <div className="text-sm text-gray-700 mt-1">
                    "{fromTask?.title ?? "Task"}" ↔ "{toTask?.title ?? "Task"}"
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => void handleExchangeRequest(request.id, "accepted")}
                      className="rounded-md bg-emerald-100 text-emerald-800 px-3 py-1 text-xs hover:bg-emerald-200"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleExchangeRequest(request.id, "rejected")}
                      className="rounded-md bg-rose-100 text-rose-800 px-3 py-1 text-xs hover:bg-rose-200"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-gradient-to-br from-[#d4e8f5] to-[#c5dae8] rounded-3xl p-12 shadow-lg">
        <h1 className="text-3xl font-semibold text-gray-900 mb-8">Notifications</h1>
        <div className="space-y-4">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow"
            >
              <h3 className="font-semibold text-gray-900 mb-2">{notification.title}</h3>
              <p className="text-gray-700 mb-2">{notification.description}</p>
              <p className="text-sm text-gray-500">{notification.time}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
