import { useAuth } from "../lib/auth";
import { useQuery } from "@tanstack/react-query";
import { activeSupabase } from "../integrations/supabase/client";
import { Users, CheckCircle, CalendarDays, ShieldAlert } from "lucide-react";

export default function DashboardHome() {
  const { user, role, tenantId } = useAuth();

  // Fetch tenant details and daily metrics
  const { data: tenantData } = useQuery({
    queryKey: ["dashboard-tenant", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data: tenant } = await activeSupabase.from("tenants").eq("id", tenantId).single();
      const { data: employees } = await activeSupabase.from("employees").eq("tenant_id", tenantId);
      const { data: leaveRequests } = await activeSupabase.from("leave_requests").eq("tenant_id", tenantId).eq("status", "APPROVED");

      return {
        ...tenant,
        employeeCount: employees?.length || 0,
        leaveCount: leaveRequests?.length || 0,
      };
    },
    enabled: !!tenantId
  });

  // Get dynamic greeting based on time of day
  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return "Good morning";
    if (hr < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="max-w-5xl mx-auto font-sans animate-fade-in space-y-8">
      {/* Dynamic Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white rounded-3xl p-8 shadow-xl shadow-indigo-600/10 dark:shadow-none relative overflow-hidden">
        {/* Decorative background shape */}
        <div className="absolute right-[-10%] top-[-50%] w-72 h-72 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <h2 className="text-3xl font-extrabold tracking-tight">
            {getGreeting()}, Admin!
          </h2>
          <p className="text-indigo-100 font-medium text-sm max-w-xl">
            Welcome back to {tenantData?.displayName || "your HR cockpit"}. Here is an overview of your organization's operations today.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Total Employees */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-5 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5">
              Total Employees
            </div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white leading-none">
              {tenantData?.employeeCount || 0}
            </div>
          </div>
        </div>

        {/* Card 2: Active Check-ins */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-5 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5">
              Present Today
            </div>
            <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-450 leading-none">
              {Math.max(0, (tenantData?.employeeCount || 0) - (tenantData?.leaveCount || 0))}
            </div>
          </div>
        </div>

        {/* Card 3: Approved Leaves */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-5 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5">
              On Approved Leave
            </div>
            <div className="text-3xl font-extrabold text-amber-500 dark:text-amber-450 leading-none">
              {tenantData?.leaveCount || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Info Warning Alert Banner */}
      <div className="bg-indigo-50 dark:bg-slate-900 border border-indigo-100 dark:border-slate-800 p-6 rounded-2xl flex items-start gap-4 transition-colors">
        <div className="w-10 h-10 rounded-lg bg-indigo-500 text-white flex items-center justify-center shrink-0">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h3 className="font-bold text-indigo-900 dark:text-indigo-400">
            Security & Scope Access Rules
          </h3>
          <p className="text-indigo-800 dark:text-slate-400 text-sm leading-relaxed">
            You are logged in with the <strong>{role?.replace("_", " ")}</strong> role.
            {role === "STANDARD_EMPLOYEE" ? (
              " Because you are a Standard Employee, you cannot access administrative controls. Your access is restricted to clocking attendance, viewing leave request submissions, submitting claims, and helpdesk replies."
            ) : (
              " As an Owner/HR manager, you have full privileges to review and approve claims, leaves, performance metrics, and create or soft-delete user accounts."
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
