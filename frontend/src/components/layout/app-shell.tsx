import { useEffect } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { LayoutDashboard, Users, LogOut, CalendarCheck, Umbrella, Star, IndianRupee, HelpCircle, Briefcase, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { activeSupabase } from "../../integrations/supabase/client";
import ThemeToggle from "../ThemeToggle";
import { runDailyAttendanceCheck } from "../../lib/attendanceAutomation";
import { ActivityProvider, useActivity } from "../activity-tracker";

function ShellHeader() {
  const { user } = useAuth();
  const { countdown } = useActivity();

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;
  const timeText = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center px-8 shadow-sm transition-colors">
      <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">WorkSphere HRMS</h1>
      <div className="ml-auto flex items-center gap-4">
        {/* Session Inactivity Countdown Alert */}
        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className={`w-2 h-2 rounded-full ${countdown < 120 ? "bg-rose-500 animate-ping" : "bg-emerald-500"}`} />
          <span>Auto-Logout in: <span className="font-mono text-slate-800 dark:text-slate-100 font-bold">{timeText}</span></span>
        </div>

        <ThemeToggle />
        <div className="text-sm text-slate-600 dark:text-slate-400 font-semibold bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
          {user?.email}
        </div>
      </div>
    </header>
  );
}

export default function AppShell() {
  const { role, tenantId, signOut } = useAuth();
  const navigate = useNavigate();
  const canManageUsers = role === "COMPANY_OWNER" || role === "HR_ADMIN";

  // Trigger daily attendance automated scans
  useEffect(() => {
    if (tenantId && canManageUsers) {
      runDailyAttendanceCheck(tenantId);
    }
  }, [tenantId, canManageUsers]);

  // Fetch current Tenant info
  const { data: tenant } = useQuery({
    queryKey: ["tenant", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data } = await activeSupabase.from("tenants").eq("id", tenantId).single();
      return data;
    },
    enabled: !!tenantId
  });

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 font-semibold text-sm ${
      isActive
        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
        : "text-slate-400 hover:bg-slate-800 hover:text-white"
    }`;

  return (
    <ActivityProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex transition-colors">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-900 border-r border-slate-850 text-slate-300 flex flex-col shrink-0">
          <div className="p-6 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-indigo-500 text-white rounded-xl flex items-center justify-center font-bold shadow-lg shadow-indigo-500/20">
                {tenant?.displayName?.charAt(0) || "C"}
              </div>
              <div>
                <div className="font-bold text-white leading-tight truncate w-36 text-sm">
                  {tenant?.displayName ?? "Company"}
                </div>
                <div className="text-[10px] text-indigo-400 capitalize font-bold tracking-wider mt-0.5">
                  {role?.replace("_", " ").toLowerCase()}
                </div>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            <NavLink to="/" end className={navLinkClass}>
              <LayoutDashboard className="w-5 h-5 shrink-0" />
              <span>Dashboard</span>
            </NavLink>

            {canManageUsers && (
              <NavLink to="/users" className={navLinkClass}>
                <Users className="w-5 h-5 shrink-0" />
                <span>User Management</span>
              </NavLink>
            )}

            <NavLink to="/attendance" className={navLinkClass}>
              <CalendarCheck className="w-5 h-5 shrink-0" />
              <span>Attendance</span>
            </NavLink>

            <NavLink to="/leaves" className={navLinkClass}>
              <Umbrella className="w-5 h-5 shrink-0" />
              <span>Leave Management</span>
            </NavLink>

            <NavLink to="/performance" className={navLinkClass}>
              <Star className="w-5 h-5 shrink-0" />
              <span>Performance</span>
            </NavLink>

            {canManageUsers && (
              <NavLink to="/payroll" className={navLinkClass}>
                <IndianRupee className="w-5 h-5 shrink-0" />
                <span>Payroll Info</span>
              </NavLink>
            )}

            <NavLink to="/claims" className={navLinkClass}>
              <FileText className="w-5 h-5 shrink-0" />
              <span>Claims</span>
            </NavLink>

            <NavLink to="/recruitment" className={navLinkClass}>
              <Briefcase className="w-5 h-5 shrink-0" />
              <span>Recruitment</span>
            </NavLink>

            <NavLink to="/helpdesk" className={navLinkClass}>
              <HelpCircle className="w-5 h-5 shrink-0" />
              <span>Helpdesk</span>
            </NavLink>
          </nav>

          <div className="p-4 border-t border-slate-800">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors font-semibold text-sm"
            >
              <LogOut className="w-5 h-5" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col h-screen overflow-hidden">
          <ShellHeader />
          {/* Page Content */}
          <div className="flex-1 overflow-auto p-8 bg-slate-50 dark:bg-slate-950 transition-colors">
            <Outlet />
          </div>
        </main>
      </div>
    </ActivityProvider>
  );
}
