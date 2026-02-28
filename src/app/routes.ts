import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { AdminLayout } from "./components/AdminLayout";
import { Dashboard } from "./pages/Dashboard";
import { Integrate } from "./pages/Integrate";
import { Reports } from "./pages/Reports";
import { Notifications } from "./pages/Notifications";
import { Contributions } from "./pages/Contributions";
import { MyProfile } from "./pages/MyProfile";
import { NotFound } from "./pages/NotFound";
import { AuthPage } from "./pages/AuthPage";
import {
  PublicOnlyRoute,
  RequireAdminRoute,
  RequireClientRoute,
} from "./components/auth/RouteGuards";
import { AdminLeaderboard } from "./pages/admin/AdminLeaderboard";
import { AdminTeamManagement } from "./pages/admin/AdminTeamManagement";
import { AdminWorkloadRedistribution } from "./pages/admin/AdminWorkloadRedistribution";
import { AdminAnalyticsReports } from "./pages/admin/AdminAnalyticsReports";

export const router = createBrowserRouter([
  {
    Component: PublicOnlyRoute,
    children: [{ path: "/login", Component: AuthPage }],
  },
  {
    Component: RequireClientRoute,
    children: [
      {
        path: "/",
        Component: Layout,
        children: [
          { index: true, Component: Dashboard },
          { path: "integrate", Component: Integrate },
          { path: "reports", Component: Reports },
          { path: "notifications", Component: Notifications },
          { path: "contributions", Component: Contributions },
          { path: "profile", Component: MyProfile },
        ],
      },
    ],
  },
  {
    Component: RequireAdminRoute,
    children: [
      {
        path: "/admin",
        Component: AdminLayout,
        children: [
          { index: true, Component: AdminLeaderboard },
          { path: "team-management", Component: AdminTeamManagement },
          { path: "workload", Component: AdminWorkloadRedistribution },
          { path: "analytics", Component: AdminAnalyticsReports },
        ],
      },
    ],
  },
  { path: "*", Component: NotFound },
]);
