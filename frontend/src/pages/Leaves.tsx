import { useState } from "react";
import { useAuth } from "../lib/auth";
import { Umbrella, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { activeSupabase } from "../integrations/supabase/client";

export default function Leaves() {
  const { user, role, tenantId } = useAuth();
  const queryClient = useQueryClient();
  const isManager = role === "COMPANY_OWNER" || role === "HR_ADMIN";

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [reason, setReason] = useState("");

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Fetch current employee profile
  const { data: employee } = useQuery({
    queryKey: ["current-employee-leaves", user?.id],
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

  // Fetch leave types
  const { data: leaveTypes = [] } = useQuery({
    queryKey: ["leave-types", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await activeSupabase.from("leave_types").eq("tenant_id", tenantId);
      return data || [];
    },
    enabled: !!tenantId
  });

  // Fetch leave requests
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["leave-requests", tenantId, employee?.id],
    queryFn: async () => {
      if (!tenantId) return [];
      let query = activeSupabase.from("leave_requests").select("*, employee:employees(*), leaveType:leave_types(*)");
      
      if (isManager) {
        query = query.eq("tenant_id", tenantId);
      } else {
        if (!employee?.id) return [];
        query = query.eq("employee_id", employee.id);
      }

      const { data } = await query.order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!tenantId && (isManager || !!employee?.id)
  });

  // Submit leave request mutation
  const submitRequestMutation = useMutation({
    mutationFn: async () => {
      setErrorMsg("");
      setSuccessMsg("");

      if (!startDate || !endDate || !leaveTypeId || !reason) {
        throw new Error("All form fields are required.");
      }

      if (!employee?.id || !tenantId) throw new Error("Employee profile is not loaded.");

      const daysRequested = Math.ceil(
        (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;

      await activeSupabase.from("leave_requests").insert({
        tenantId,
        employeeId: employee.id,
        leaveTypeId,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        daysRequested,
        reason,
        status: "PENDING"
      });
    },
    onSuccess: () => {
      setSuccessMsg("Leave request submitted successfully.");
      setStartDate("");
      setEndDate("");
      setLeaveTypeId("");
      setReason("");
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Failed to submit leave request.");
    }
  });

  // Review leave mutation
  const reviewLeaveMutation = useMutation({
    mutationFn: async ({ id, status, remarks }: { id: string; status: "APPROVED" | "REJECTED"; remarks?: string }) => {
      await activeSupabase
        .from("leave_requests")
        .update({
          status,
          approvedBy: user?.email,
          managerRemarks: remarks || ""
        })
        .eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
    },
    onError: (err: any) => {
      alert(err.message || "Failed to update leave request status");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitRequestMutation.mutate();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 font-sans animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Umbrella className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          Leave Management
        </h1>
        
        {!isManager && (
          <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="border border-slate-300 dark:border-slate-700 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-slate-500 dark:text-slate-400 text-sm">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
              className="border border-slate-300 dark:border-slate-700 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            
            <select
              value={leaveTypeId}
              onChange={(e) => setLeaveTypeId(e.target.value)}
              required
              className="border border-slate-300 dark:border-slate-700 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white">Select Type</option>
              {leaveTypes.map((type: any) => (
                <option key={type.id} value={type.id} className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white">
                  {type.name}
                </option>
              ))}
            </select>
            
            <input
              type="text"
              placeholder="Reason..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              className="border border-slate-300 dark:border-slate-700 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            
            <button
              type="submit"
              disabled={submitRequestMutation.isPending}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-semibold disabled:opacity-50"
            >
              {submitRequestMutation.isPending ? "Submitting..." : "Submit Request"}
            </button>
          </form>
        )}
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/50 rounded-xl text-sm max-w-sm font-semibold">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="p-3 bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900/50 rounded-xl text-sm max-w-sm font-semibold">
          {successMsg}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
          <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-wider border-b border-slate-250 dark:border-slate-800">
            <tr>
              {isManager && <th className="px-6 py-4">Employee</th>}
              <th className="px-6 py-4">Leave Type</th>
              <th className="px-6 py-4">From</th>
              <th className="px-6 py-4">To</th>
              <th className="px-6 py-4">Days</th>
              <th className="px-6 py-4">Reason</th>
              <th className="px-6 py-4">Status</th>
              {isManager && <th className="px-6 py-4">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {isLoading ? (
              <tr>
                <td colSpan={isManager ? 8 : 6} className="px-6 py-8 text-center text-slate-500">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" /> Loading leave requests...
                  </div>
                </td>
              </tr>
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan={isManager ? 8 : 6} className="px-6 py-8 text-center text-slate-500 font-medium">
                  No leave requests found.
                </td>
              </tr>
            ) : (
              requests.map((req: any) => (
                <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  {isManager && (
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100">
                      {req.employee ? `${req.employee.firstName} ${req.employee.lastName}` : "Unknown"}
                    </td>
                  )}
                  <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">
                    {req.leaveType?.name || "Annual Leave"}
                  </td>
                  <td className="px-6 py-4 font-medium">{new Date(req.startDate).toLocaleDateString()}</td>
                  <td className="px-6 py-4 font-medium">{new Date(req.endDate).toLocaleDateString()}</td>
                  <td className="px-6 py-4 font-semibold">{req.daysRequested}</td>
                  <td className="px-6 py-4 max-w-xs truncate" title={req.reason}>{req.reason}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold tracking-wide ${
                        req.status === "APPROVED"
                          ? "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                          : req.status === "REJECTED"
                          ? "bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400"
                          : "bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400"
                      }`}
                    >
                      {req.status}
                    </span>
                  </td>
                  {isManager && (
                    <td className="px-6 py-4">
                      {req.status === "PENDING" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => reviewLeaveMutation.mutate({ id: req.id, status: "APPROVED" })}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded transition-colors"
                            title="Approve"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => reviewLeaveMutation.mutate({ id: req.id, status: "REJECTED" })}
                            className="p-1 text-red-650 hover:bg-red-50 dark:hover:bg-red-950/50 rounded transition-colors"
                            title="Reject"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
