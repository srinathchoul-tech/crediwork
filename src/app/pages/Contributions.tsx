import { useMemo } from "react";
import { useTrackingData } from "../hooks/useTrackingData";

function getGradeColor(grade: "A" | "B" | "C" | "D") {
  if (grade === "A") return "text-emerald-700 bg-emerald-100";
  if (grade === "B") return "text-blue-700 bg-blue-100";
  if (grade === "C") return "text-amber-700 bg-amber-100";
  return "text-rose-700 bg-rose-100";
}

export function Contributions() {
  const { memberScores } = useTrackingData();

  const teamAverage = useMemo(() => {
    if (!memberScores.length) return 0;
    return Math.round(
      memberScores.reduce((sum, member) => sum + member.scoreOutOf100, 0) /
        memberScores.length,
    );
  }, [memberScores]);

  return (
    <div className="space-y-6 min-h-[600px]">
      <div className="bg-gradient-to-br from-[#d4e8f5] to-[#c5dae8] rounded-3xl p-8 shadow-lg">
        <h1 className="text-3xl font-semibold text-gray-900">
          Contributions and marks overview
        </h1>
        <p className="text-gray-700 mt-2">
          Marks are generated from tracked contribution events across connected
          platforms.
        </p>

        <div className="grid md:grid-cols-3 gap-4 mt-6">
          <div className="bg-white rounded-xl p-4">
            <div className="text-sm text-gray-600">Team average</div>
            <div className="text-3xl font-bold text-[#5b7c9a]">{teamAverage}/100</div>
          </div>
          <div className="bg-white rounded-xl p-4">
            <div className="text-sm text-gray-600">Top performer</div>
            <div className="text-3xl font-bold text-[#5b7c9a]">
              {memberScores[0]?.memberName ?? "--"}
            </div>
          </div>
          <div className="bg-white rounded-xl p-4">
            <div className="text-sm text-gray-600">Members tracked</div>
            <div className="text-3xl font-bold text-[#5b7c9a]">{memberScores.length}</div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-[#d4e8f5] to-[#c5dae8] rounded-3xl p-8 shadow-lg">
        <div className="grid gap-5">
          {memberScores.map((member, index) => (
            <div
              key={member.memberId}
              className="bg-white rounded-2xl p-6 border border-white/60 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    #{index + 1} {member.memberName}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {member.eventCounts.task_completed} tasks completed,{" "}
                    {member.eventCounts.pr_merged} PRs merged,{" "}
                    {member.eventCounts.peer_validation} peer validations
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold text-[#5b7c9a]">
                    {member.scoreOutOf100}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${getGradeColor(
                      member.grade,
                    )}`}
                  >
                    Grade {member.grade}
                  </span>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-3 mt-5">
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="flex items-center justify-between text-sm text-gray-700">
                    <span>Quality</span>
                    <span className="font-semibold">{member.quality}</span>
                  </div>
                  <div className="h-2 mt-2 rounded-full bg-white">
                    <div
                      className="h-full rounded-full bg-[#5f7f99]"
                      style={{ width: `${member.quality}%` }}
                    />
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="flex items-center justify-between text-sm text-gray-700">
                    <span>Timeliness</span>
                    <span className="font-semibold">{member.timeliness}</span>
                  </div>
                  <div className="h-2 mt-2 rounded-full bg-white">
                    <div
                      className="h-full rounded-full bg-[#81a4bf]"
                      style={{ width: `${member.timeliness}%` }}
                    />
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="flex items-center justify-between text-sm text-gray-700">
                    <span>Collaboration</span>
                    <span className="font-semibold">{member.collaboration}</span>
                  </div>
                  <div className="h-2 mt-2 rounded-full bg-white">
                    <div
                      className="h-full rounded-full bg-[#a6c0d1]"
                      style={{ width: `${member.collaboration}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
