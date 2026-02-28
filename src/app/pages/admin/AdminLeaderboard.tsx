import { useTrackingData } from "../../hooks/useTrackingData";

export function AdminLeaderboard() {
  const { memberScores } = useTrackingData();
  return (
    <section className="bg-white rounded-2xl p-6 shadow-lg">
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">Leaderboard</h2>
      <div className="space-y-3">
        {memberScores.map((member, index) => (
          <div key={member.memberId} className="flex items-center justify-between border rounded-lg px-4 py-3">
            <span className="font-medium">
              #{index + 1} {member.memberName}
            </span>
            <span className="font-semibold text-[#5b7c9a]">{member.scoreOutOf100}%</span>
          </div>
        ))}
      </div>
    </section>
  );
}
