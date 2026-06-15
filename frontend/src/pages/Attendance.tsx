import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { CalendarCheck, ShieldCheck, ShieldAlert, Loader2, Play, Pause, Activity } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { activeSupabase } from "../integrations/supabase/client";
import { checkIPAndNetworkStatus } from "../lib/attendanceAutomation";
import { useActivity } from "../components/activity-tracker";
import ActiveTimer from "../components/ActiveTimer";

export default function Attendance() {
  const { user, role, tenantId } = useAuth();
  const queryClient = useQueryClient();
  const isManager = role === "COMPANY_OWNER" || role === "HR_ADMIN";

  // Activity Tracker details
  const { activeSeconds, idleSeconds } = useActivity();

  // IP/Network state
  const [networkInfo, setNetworkInfo] = useState<{ ip: string; isOfficeNetwork: boolean } | null>(null);
  const [checkingNetwork, setCheckingNetwork] = useState(true);
  const [filterStatus, setFilterStatus] = useState<"ALL" | "PRESENT" | "ABSENT" | "REMOTE">("ALL");

  useEffect(() => {
    async function auditNetwork() {
      const info = await checkIPAndNetworkStatus();
      setNetworkInfo(info);
      setCheckingNetwork(false);
    }
    auditNetwork();
  }, []);

  // Fetch current employee profile
  const { data: employee } = useQuery({
    queryKey: ["current-employee", user?.id],
    queryFn: async () => {
      if (!user?.id || isManager) return null;
      const { data } = await activeSupabase
        .from("employees")
        .eq("user_id", user.id)
        .single();
      return data;
    },
    enabled: !!user?.id && !isManager
  });

  // Fetch attendance records
  const { data: records = [], isLoading } = useQuery({
    queryKey: ["attendance-records", tenantId, employee?.id],
    queryFn: async () => {
      if (!tenantId) return [];
      let query = activeSupabase.from("attendance_records").select("*, employee:employees(*)");
      
      if (isManager) {
        query = query.eq("tenant_id", tenantId);
      } else {
        if (!employee?.id) return [];
        query = query.eq("employee_id", employee.id);
      }

      const { data } = await query.order("date", { ascending: false });
      return data || [];
    },
    enabled: !!tenantId && (isManager || !!employee?.id)
  });

  // Get active clock-in for today
  const { data: todayRecord } = useQuery({
    queryKey: ["today-attendance", employee?.id],
    queryFn: async () => {
      if (!employee?.id) return null;
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const { data } = await activeSupabase
        .from("attendance_records")
        .eq("employee_id", employee.id)
        .order("date", { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const record = data[0];
        if (new Date(record.date) >= startOfToday && !record.checkOut) {
          return record;
        }
      }
      return null;
    },
    enabled: !!employee?.id
  });

  const isClockedIn = !!todayRecord;

  // Clock In Mutation
  const clockInMutation = useMutation({
    mutationFn: async () => {
      if (!employee?.id || !tenantId) throw new Error("Employee profile not loaded");

      // Automate check-in status:
      // If outside office IP, mark them as 'REMOTE' instead of 'PRESENT'
      const status = networkInfo?.isOfficeNetwork ? "PRESENT" : "REMOTE";

      await activeSupabase.from("attendance_records").insert({
        tenantId,
        employeeId: employee.id,
        date: new Date().toISOString(),
        status: status,
        checkIn: new Date().toISOString(),
        locationIp: networkInfo?.ip || "Unknown"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-records"] });
      queryClient.invalidateQueries({ queryKey: ["today-attendance"] });
    },
    onError: (err: any) => {
      alert(err.message || "Failed to clock in");
    }
  });

  // Clock Out Mutation
  const clockOutMutation = useMutation({
    mutationFn: async () => {
      if (!todayRecord?.id) throw new Error("No active clock-in found");

      // Save active work hours and idle hours upon clock-out
      const activeHours = parseFloat((activeSeconds / 3600).toFixed(2));
      const idleHours = parseFloat((idleSeconds / 3600).toFixed(2));
      await activeSupabase
        .from("attendance_records")
        .update({
          checkOut: new Date().toISOString(),
          workHours: activeHours,
          idleHours: idleHours
        })
        .eq("id", todayRecord.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-records"] });
      queryClient.invalidateQueries({ queryKey: ["today-attendance"] });
    },
    onError: (err: any) => {
      alert(err.message || "Failed to clock out");
    }
  });

  // Filter logs list
  const filteredRecords = records.filter((rec: any) => {
    if (filterStatus === "ALL") return true;
    return rec.status === filterStatus;
  });

  // Format active/idle seconds
  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h}h ${m}m ${s}s`;
  };

  const totalTimeSeconds = activeSeconds + idleSeconds;
  const activePercent = totalTimeSeconds > 0 ? Math.round((activeSeconds / totalTimeSeconds) * 100) : 0;
  const idlePercent = totalTimeSeconds > 0 ? 100 - activePercent : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6 font-sans animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <CalendarCheck className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          Attendance Audit
        </h1>

        {/* Filters Tab */}
        <div className="flex bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 shrink-0 w-fit">
          {["ALL", "PRESENT", "ABSENT", "REMOTE"].map((stat) => (
            <button
              key={stat}
              onClick={() => setFilterStatus(stat as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterStatus === stat
                  ? "bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 dark:text-slate-400"
              }`}
            >
              {stat}
            </button>
          ))}
        </div>
      </div>

      {!isManager && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {/* Active Hour Gauge Widget */}
          <div className="md:col-span-1 h-full">
            {isClockedIn && todayRecord?.checkIn ? (
              <ActiveTimer checkInTime={todayRecord.checkIn} />
            ) : (
              <div className="flex flex-col items-center justify-center p-6 h-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-300">
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full flex items-center justify-center mb-3">
                  <Pause className="w-6 h-6 text-slate-400 dark:text-slate-500" />
                </div>
                <div className="text-sm font-semibold text-slate-500">Not Clocked In</div>
                <div className="text-xs text-slate-400 mt-1">Start your workday using the panel</div>
              </div>
            )}
          </div>

          {/* Clock In Panel & Productivity details */}
          <div className="md:col-span-2 flex flex-col gap-6">
            {/* Clock In Card */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-colors duration-300">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">Workspace Session Check-in</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                      {isClockedIn ? "Active session running. Clock out when leaving the workspace." : "Clock in to record your workday check-in."}
                    </p>
                  </div>
                  
                  {/* Network Status Badge */}
                  {checkingNetwork ? (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> auditing...
                    </div>
                  ) : networkInfo?.isOfficeNetwork ? (
                    <span className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-bold border border-emerald-100 dark:border-emerald-900/50">
                      <ShieldCheck className="w-3.5 h-3.5" /> Office Network
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 px-3 py-1.5 rounded-lg text-xs font-bold border border-amber-100 dark:border-amber-900/50">
                      <ShieldAlert className="w-3.5 h-3.5" /> Out of Network
                    </span>
                  )}
                </div>

                {!checkingNetwork && !networkInfo?.isOfficeNetwork && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-700 dark:text-amber-400 leading-relaxed font-semibold">
                    ⚠️ <strong>Remote Clock-in Flagged:</strong> You are not connected to the office network. Your record status will be marked as **`REMOTE`** rather than `PRESENT`.
                  </div>
                )}
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => clockInMutation.mutate()}
                  disabled={isClockedIn || clockInMutation.isPending}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/10 text-sm"
                >
                  {clockInMutation.isPending ? "Clocking In..." : "Confirm Clock In"}
                </button>
                <button
                  onClick={() => clockOutMutation.mutate()}
                  disabled={!isClockedIn || clockOutMutation.isPending}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-white font-bold py-3 px-6 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm border border-slate-200 dark:border-slate-700"
                >
                  {clockOutMutation.isPending ? "Clocking Out..." : "Clock Out"}
                </button>
              </div>
            </div>

            {/* Productivity Hours tracker Card */}
            {isClockedIn && (
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-300">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-emerald-500" /> Live Activity Auditor
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Work Time</div>
                    <div className="text-xl font-bold text-slate-800 dark:text-white mt-1 font-mono">{formatTime(activeSeconds)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Idle / Inactive Time</div>
                    <div className="text-xl font-bold text-slate-800 dark:text-white mt-1 font-mono">{formatTime(idleSeconds)}</div>
                  </div>
                </div>

                {/* Progress bar comparison */}
                <div className="mt-5">
                  <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                    <span>Active: {activePercent}%</span>
                    <span>Idle: {idlePercent}%</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                    <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${activePercent}%` }} />
                    <div className="bg-rose-500 h-full transition-all duration-500" style={{ width: `${idlePercent}%` }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Table Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors duration-300">
        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
          <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-wider">
            <tr>
              {isManager && <th className="px-6 py-4">Employee</th>}
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Check In</th>
              <th className="px-6 py-4">Check Out</th>
              <th className="px-6 py-4">Active Hours</th>
              <th className="px-6 py-4">Idle Hours</th>
              <th className="px-6 py-4">IP Network Log</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {isLoading ? (
              <tr>
                <td colSpan={isManager ? 8 : 7} className="px-6 py-10 text-center">
                  <div className="flex items-center justify-center gap-2 text-slate-500">
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-600" /> 
                    <span className="font-semibold text-sm">Querying attendance directory...</span>
                  </div>
                </td>
              </tr>
            ) : filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={isManager ? 8 : 7} className="px-6 py-10 text-center font-medium text-slate-500">
                  No attendance records matched.
                </td>
              </tr>
            ) : (
              filteredRecords.map((record: any) => (
                <tr key={record.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  {isManager && (
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100">
                      {record.employee ? `${record.employee.firstName} ${record.employee.lastName}` : "System User"}
                    </td>
                  )}
                  <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-350">
                    {new Date(record.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold tracking-wide ${
                        record.status === "PRESENT"
                          ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                          : record.status === "ABSENT"
                          ? "bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400"
                          : "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400" // REMOTE is logged as amber
                      }`}
                    >
                      {record.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono font-medium">
                    {record.checkIn ? new Date(record.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}
                  </td>
                  <td className="px-6 py-4 font-mono font-medium">
                    {record.checkOut ? new Date(record.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">
                    {record.workHours ? `${record.workHours} hrs` : "-"}
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">
                    {record.idleHours ? `${record.idleHours} hrs` : "-"}
                  </td>
                  <td className="px-6 py-4 text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
                    {record.status === "ABSENT" ? "AUTO-TRIGGERED" : (record.locationIp || "127.0.0.1")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
