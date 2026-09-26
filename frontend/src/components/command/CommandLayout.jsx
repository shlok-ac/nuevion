import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

// The topbar (global search, clock, alert bell, officer badge) is a dashboard-only
// affordance — every other route renders its own in-page heading instead.
const DASHBOARD_PATH = "/";

export default function CommandLayout() {
  const { pathname } = useLocation();
  const showTopbar = pathname === DASHBOARD_PATH;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-y-auto">
        {showTopbar && (
          <div className="shrink-0">
            <Topbar />
          </div>
        )}
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}