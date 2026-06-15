import { useState } from "react";
import { useAuth } from "../../lib/auth";
import { Umbrella, Plus, MessageSquare } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { activeSupabase } from "../../integrations/supabase/client";

export default function UserLeaves() {
  const { user, tenantId } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reason, setReason] = useState("");

  const { data: employee } = useQuery({
    queryKey: ["current-employee", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await activeSupabase.from("employees").eq("user_id", user.id).single();
      return data;
    },
    enabled: !!user?.id
  });

  const { data: requests = [] } = useQuery({
    queryKey: ["my-leaves", employee?.id],
    queryFn: async () => {
      if (!employee?.id) return [];
      const { data } = await activeSupabase
        .from("leave_requests")
        .select("*, leaveType:leave_types(*)")
        .eq("employee_id", employee.id)
        .order("start_date", { ascending: false });
      return data || [];
    },
    enabled: !!employee?.id
  });

  const requestLeaveMutation = useMutation({
    mutationFn: async () => {
      if (!employee?.id || !tenantId) throw new Error("Missing info");
      
      // Default to picking the first leave type, or we could just save without it if schema allows
      const { data: types } = await activeSupabase.from("leave_types").eq("tenant_id", tenantId).limit(1);
      const leaveTypeId = types?.[0]?.id || null;

      const today = new Date().toISOString();
      await activeSupabase.from("leave_requests").insert({
        tenantId,
        employeeId: employee.id,
        leaveTypeId: leaveTypeId,
        startDate: today,
        endDate: today,
        reason: reason,
        status: "PENDING"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-leaves"] });
      setIsModalOpen(false);
      setReason("");
      alert("Permission request submitted!");
    },
    onError: (err: any) => {
      alert(err.message || "Failed to submit request.");
    }
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Umbrella className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          Leave Permissions
        </h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold transition-colors flex items-center gap-2 text-sm shadow-md shadow-indigo-600/20"
        >
          <Plus className="w-4 h-4" /> Request Permission
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">My Requests</h2>
          {requests.length === 0 ? (
            <div className="text-center py-10 text-slate-500">No leave requests found.</div>
          ) : (
            <div className="space-y-4">
              {requests.map((req: any) => (
                <div key={req.id} className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-bold text-slate-800 dark:text-white">
                      {new Date(req.startDate).toLocaleDateString()}
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-200 dark:bg-slate-800">
                      {req.status}
                    </span>
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800 mt-2 flex items-start gap-2">
                    <MessageSquare className="w-4 h-4 mt-0.5 text-indigo-400 shrink-0" />
                    <span>{req.reason}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden animate-fade-in">
            <div className="p-6">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Request Permission</h3>
              <p className="text-sm text-slate-500 mb-4">Your message will be sent to your reporting manager for approval.</p>
              
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Type your reason clearly here..."
                className="w-full h-32 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-4 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 dark:text-white resize-none"
              />

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => requestLeaveMutation.mutate()}
                  disabled={!reason.trim() || requestLeaveMutation.isPending}
                  className="flex-1 px-4 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {requestLeaveMutation.isPending ? "Sending..." : "Send Request"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
