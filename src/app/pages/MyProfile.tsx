export function MyProfile() {
  const userStats = [
    { label: "Total Contributions", value: "45%" },
    { label: "Commits", value: "12" },
    { label: "Reviews", value: "8" },
    { label: "Documents Edited", value: "6" },
    { label: "Active Days", value: "23" },
    { label: "Team Rank", value: "#1" },
  ];

  return (
    <div className="min-h-[600px]">
      <div className="bg-gradient-to-br from-[#d4e8f5] to-[#c5dae8] rounded-3xl p-12 shadow-lg">
        <h1 className="text-3xl font-semibold text-gray-900 mb-8">
          My Profile
        </h1>
        
        {/* Profile Header */}
        <div className="bg-white rounded-xl p-8 shadow-md mb-6">
          <div className="flex items-center gap-6 mb-6">
            <div className="w-24 h-24 bg-[#5b7c9a] rounded-full flex items-center justify-center text-white text-3xl font-semibold">
              U1
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">User1</h2>
              <p className="text-gray-600">user1@example.com</p>
              <p className="text-gray-600">Team: FutureHack</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="bg-white rounded-xl p-8 shadow-md">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">
            Statistics
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {userStats.map((stat) => (
              <div
                key={stat.label}
                className="text-center p-4 bg-gray-50 rounded-lg"
              >
                <div className="text-3xl font-bold text-[#5b7c9a] mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
