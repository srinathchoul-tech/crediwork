import { useTrackingData } from "../../hooks/useTrackingData";

export function AdminWorkloadRedistribution() {
  const { redistributeUnavailableTasks, redistributionBusy, snapshot } = useTrackingData();
  return (
    <section className="bg-white rounded-2xl p-6 shadow-lg">
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">Workload Redistribution</h2>
      <p className="text-sm text-gray-600 mb-4">
        Redistribute active tasks from unavailable users into subtasks and assign to available users.
      </p>
      <button
        type="button"
        onClick={() => void redistributeUnavailableTasks()}
        disabled={redistributionBusy}
        className="px-4 py-2 rounded-lg bg-[#5b7c9a] text-white hover:bg-[#4a6b89] disabled:opacity-60"
      >
        {redistributionBusy ? "Redistributing..." : "Redistribute now"}
      </button>

      <div className="mt-6 space-y-2">
        {snapshot.tasks.map((task) => (
          <div key={task.id} className="border rounded-lg px-4 py-2 text-sm flex justify-between">
            <span>{task.title}</span>
            <span className="text-gray-600">{task.estimateHours}h</span>
          </div>
        ))}
      </div>
    </section>
  );
}
