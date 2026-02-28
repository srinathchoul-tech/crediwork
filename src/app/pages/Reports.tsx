import { useMemo } from "react";
import { useTrackingData } from "../hooks/useTrackingData";

const labelByPlatform = {
  github: "GitHub",
  google_docs: "Google Docs",
  figma: "Figma",
  canva: "Canva",
};

export function Reports() {
  const { snapshot, memberScores, platformShare } = useTrackingData();

  const connectedCount = useMemo(
    () => snapshot.integrations.filter((integration) => integration.status === "connected").length,
    [snapshot.integrations],
  );

  return (
    <div className="min-h-[600px] space-y-6">
      <div className="bg-gradient-to-br from-[#d4e8f5] to-[#c5dae8] rounded-3xl p-10 shadow-lg">
        <h1 className="text-3xl font-semibold text-gray-900">Reports</h1>
        <p className="text-gray-700 mt-2">
          Weekly analytics from GitHub, Google Docs, and Figma contribution data.
        </p>
      </div>

      <div className="bg-gradient-to-br from-[#d4e8f5] to-[#c5dae8] rounded-3xl p-8 shadow-lg">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-4">
            <div className="text-sm text-gray-600">Integration health</div>
            <div className="text-3xl font-bold text-[#5b7c9a]">
              {connectedCount}/{snapshot.integrations.length}
            </div>
          </div>
          <div className="bg-white rounded-xl p-4">
            <div className="text-sm text-gray-600">Tracked events</div>
            <div className="text-3xl font-bold text-[#5b7c9a]">{snapshot.events.length}</div>
          </div>
          <div className="bg-white rounded-xl p-4">
            <div className="text-sm text-gray-600">Avg member score</div>
            <div className="text-3xl font-bold text-[#5b7c9a]">
              {memberScores.length
                ? Math.round(
                    memberScores.reduce((sum, member) => sum + member.scoreOutOf100, 0) /
                      memberScores.length,
                  )
                : 0}
              /100
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-[#d4e8f5] to-[#c5dae8] rounded-3xl p-8 shadow-lg">
        <h2 className="text-2xl font-semibold text-gray-900 mb-5">Platform contribution split</h2>
        <div className="space-y-4">
          {platformShare.map((platform) => (
            <div key={platform.platform}>
              <div className="flex justify-between mb-1">
                <span className="text-gray-900">{labelByPlatform[platform.platform]}</span>
                <span className="font-semibold text-gray-900">{platform.percentage}%</span>
              </div>
              <div className="h-3 bg-white/70 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#5f7f99] to-[#8fb4ce] rounded-full"
                  style={{ width: `${platform.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
