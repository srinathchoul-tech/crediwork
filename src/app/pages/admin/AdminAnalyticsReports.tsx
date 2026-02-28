import { useTrackingData } from "../../hooks/useTrackingData";

export function AdminAnalyticsReports() {
  const { snapshot, metrics } = useTrackingData();

  return (
    <section className="bg-white rounded-2xl p-6 shadow-lg space-y-4">
      <h2 className="text-2xl font-semibold text-gray-900">Analytics & Reports</h2>
      <div className="grid md:grid-cols-3 gap-3">
        <div className="bg-slate-50 rounded-xl p-4">
          <div className="text-sm text-gray-600">Total members</div>
          <div className="text-3xl font-bold text-[#5b7c9a]">{snapshot.members.length}</div>
        </div>
        <div className="bg-slate-50 rounded-xl p-4">
          <div className="text-sm text-gray-600">Total tasks</div>
          <div className="text-3xl font-bold text-[#5b7c9a]">{snapshot.tasks.length}</div>
        </div>
        <div className="bg-slate-50 rounded-xl p-4">
          <div className="text-sm text-gray-600">Total events</div>
          <div className="text-3xl font-bold text-[#5b7c9a]">{snapshot.events.length}</div>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <div className="border rounded-xl p-4">
          <div className="font-medium mb-2">Task activity</div>
          <div className="text-sm text-gray-700">Created: {metrics.taskCreated}</div>
          <div className="text-sm text-gray-700">Completed: {metrics.taskCompleted}</div>
        </div>
        <div className="border rounded-xl p-4">
          <div className="font-medium mb-2">Collaboration activity</div>
          <div className="text-sm text-gray-700">Comments: {metrics.comments}</div>
          <div className="text-sm text-gray-700">Peer validations: {metrics.peerValidation}</div>
          <div className="text-sm text-gray-700">PR merged: {metrics.prMerged}</div>
        </div>
      </div>
    </section>
  );
}
