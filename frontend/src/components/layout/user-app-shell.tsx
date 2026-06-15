import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { LayoutDashboard, LogOut, Umbrella, IndianRupee, HelpCircle, Menu, X, ShieldCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { activeSupabase } from "../../integrations/supabase/client";
import ThemeToggle from "../ThemeToggle";

function UserShellHeader({ onMenuClick }: { onMenuClick: () => void }) {
  const { user } = useAuth();

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center px-4 lg:px-8 shadow-sm transition-colors relative z-10">
      <button 
        onClick={onMenuClick} 
        className="lg:hidden p-2 mr-2 -ml-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <Menu className="w-6 h-6" />
      </button>
      
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-6 h-6 text-indigo-500 hidden sm:block" />
        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 hidden sm:block">Employee Portal</h1>
        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 sm:hidden">Portal</h1>
      </div>
      
      <div className="ml-auto flex items-center gap-2 sm:gap-4">
        <ThemeToggle />
        <div className="text-sm text-slate-600 dark:text-slate-400 font-semibold bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 max-w-[120px] sm:max-w-none truncate">
          {user?.email}
        </div>
      </div>
    </header>
  );
}

export default function UserAppShell() {
  const { role, tenantId, signOut } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Fetch current Tenant info for company name
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

  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex transition-colors overflow-hidden">
      
      {/* Mobile Backdrop Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-850 text-slate-300 flex flex-col shrink-0 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-6 border-b border-slate-800 flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-500 text-white rounded-xl flex items-center justify-center font-bold shadow-lg shadow-emerald-500/20 shrink-0">
              {tenant?.displayName?.charAt(0) || "C"}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-white leading-tight truncate w-32 text-sm">
                {tenant?.displayName ?? "Company"}
              </div>
              <div className="text-[10px] text-emerald-400 capitalize font-bold tracking-wider mt-0.5 truncate">
                {role?.replace("_", " ").toLowerCase()}
              </div>
            </div>
          </div>
          <button onClick={closeSidebar} className="lg:hidden p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          <NavLink to="/user" end className={navLinkClass} onClick={closeSidebar}>
            <LayoutDashboard className="w-5 h-5 shrink-0" />
            <span>Dashboard / Attendance</span>
          </NavLink>

          <NavLink to="/user/leaves" className={navLinkClass} onClick={closeSidebar}>
            <Umbrella className="w-5 h-5 shrink-0" />
            <span>Leave Management</span>
          </NavLink>

          <NavLink to="/user/payroll" className={navLinkClass} onClick={closeSidebar}>
            <IndianRupee className="w-5 h-5 shrink-0" />
            <span>Payroll Info</span>
          </NavLink>

          <NavLink to="/user/helpdesk" className={navLinkClass} onClick={closeSidebar}>
            <HelpCircle className="w-5 h-5 shrink-0" />
            <span>Helpdesk</span>
          </NavLink>
        </nav>

        <div className="p-4 border-t border-slate-800 shrink-0">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors font-semibold text-sm"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        <UserShellHeader onMenuClick={() => setIsSidebarOpen(true)} />
        {/* Page Content */}
        <div className="flex-1 overflow-auto p-4 sm:p-8 bg-slate-50 dark:bg-slate-950 transition-colors">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
