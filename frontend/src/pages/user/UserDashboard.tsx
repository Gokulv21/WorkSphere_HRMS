import { useEffect, useState } from "react";
import { useAuth } from "../../lib/auth";
import { CalendarCheck, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { activeSupabase } from "../../integrations/supabase/client";
import { checkIPAndNetworkStatus } from "../../lib/attendanceAutomation";

export default function UserDashboard() {
  const { user, tenantId } = useAuth();
  const queryClient = useQueryClient();

  const [networkInfo, setNetworkInfo] = useState<{ ip: string; isOfficeNetwork: boolean } | null>(null);
  const [checkingNetwork, setCheckingNetwork] = useState(true);

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
      if (!user?.id) return null;
      const { data } = await activeSupabase
        .from("employees")
        .eq("user_id", user.id)
        .single();
      return data;
    },
    enabled: !!user?.id
  });

  // Get active clock-in for today
  const { data: todayRecord, isLoading } = useQuery({
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
        if (new Date(record.date) >= startOfToday) {
          return record;
        }
      }
      return null;
    },
    enabled: !!employee?.id
  });

  const isPresent = !!todayRecord;

  // Mark Present Mutation
  const markPresentMutation = useMutation({
    mutationFn: async () => {
      if (!employee?.id || !tenantId) throw new Error("Employee profile not loaded");

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
      queryClient.invalidateQueries({ queryKey: ["today-attendance"] });
    },
    onError: (err: any) => {
      alert(err.message || "Failed to mark attendance");
    }
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6 font-sans animate-fade-in">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome, {employee?.firstName || "Employee"}!
          </h2>
          <p className="text-emerald-100 font-medium text-sm">
            Please mark your attendance for today.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 text-center">
        <CalendarCheck className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Daily Attendance</h3>
        <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto">
          Confirm your presence for today's workday. 
          {checkingNetwork ? " Checking network..." : (!networkInfo?.isOfficeNetwork && " (Remote Network Detected)")}
        </p>

        {isLoading ? (
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto" />
        ) : isPresent ? (
          <div className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 p-4 rounded-xl inline-block font-bold">
            ✅ You are marked as {todayRecord.status} for today.
          </div>
        ) : (
          <button
            onClick={() => markPresentMutation.mutate()}
            disabled={markPresentMutation.isPending || checkingNetwork}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-12 rounded-xl transition-colors disabled:opacity-50 shadow-lg shadow-emerald-600/20 text-lg"
          >
            {markPresentMutation.isPending ? "Recording..." : "Mark Present"}
          </button>
        )}
      </div>
    </div>
  );
}
