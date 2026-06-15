import { useState } from "react";
import { useAuth } from "../lib/auth";
import { HandCoins, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { activeSupabase } from "../integrations/supabase/client";

export default function Claims() {
  const { user, role, tenantId } = useAuth();
  const queryClient = useQueryClient();
  const isManager = role === "COMPANY_OWNER" || role === "HR_ADMIN";

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Fetch current employee profile
  const { data: employee } = useQuery({
    queryKey: ["current-employee-claims", user?.id],
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

  // Fetch claims list
  const { data: claims = [], isLoading } = useQuery({
    queryKey: ["claims", tenantId, employee?.id],
    queryFn: async () => {
      if (!tenantId) return [];
      let query = activeSupabase.from("claims").select("*, employee:employees(*)");
      
      if (isManager) {
        query = query.eq("tenant_id", tenantId);
      } else {
        if (!employee?.id) return [];
        query = query.eq("employee_id", employee.id);
      }

      const { data } = await query.order("submitted_at", { ascending: false });
      return data || [];
    },
    enabled: !!tenantId && (isManager || !!employee?.id)
  });

  // Submit claim mutation
  const submitClaimMutation = useMutation({
    mutationFn: async () => {
      setErrorMsg("");
      setSuccessMsg("");

      if (!title || !amount) {
        throw new Error("Title and amount are required.");
      }

      if (!employee?.id || !tenantId) throw new Error("Employee profile not loaded");

      await activeSupabase.from("claims").insert({
        tenantId,
        employeeId: employee.id,
        title,
        description,
        totalAmount: parseFloat(amount),
        currency: "USD",
        status: "PENDING",
        submittedAt: new Date().toISOString()
      });
    },
    onSuccess: () => {
      setSuccessMsg("Claim submitted successfully.");
      setTitle("");
      setAmount("");
      setDescription("");
      queryClient.invalidateQueries({ queryKey: ["claims"] });
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Failed to submit expense claim");
    }
  });

  // Process claim (approve / reject) mutation
  const processClaimMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "APPROVED" | "REJECTED" }) => {
      await activeSupabase
        .from("claims")
        .update({ status })
        .eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["claims"] });
    },
    onError: (err: any) => {
      alert(err.message || "Failed to process expense claim");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitClaimMutation.mutate();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 font-sans animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <HandCoins className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          Expense Claims
        </h1>
      </div>

      {!isManager && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Submit a New Claim</h2>
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-4">
            <input
              type="text"
              placeholder="Claim Title (e.g. Travel)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-md px-3 py-2 text-sm flex-1 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="number"
              placeholder="Amount"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-md px-3 py-2 text-sm w-full sm:w-32 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="text"
              placeholder="Description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-md px-3 py-2 text-sm flex-1 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={submitClaimMutation.isPending}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-semibold w-full sm:w-auto"
            >
              {submitClaimMutation.isPending ? "Submitting..." : "Submit"}
            </button>
          </form>
          {errorMsg && (
            <div className="mt-4 p-3 bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/50 rounded-xl text-sm font-semibold">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="mt-4 p-3 bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900/50 rounded-xl text-sm font-semibold">
              {successMsg}
            </div>
          )}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
          <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
            <tr>
              {isManager && <th className="px-6 py-4">Employee</th>}
              <th className="px-6 py-4">Title</th>
              <th className="px-6 py-4">Amount</th>
              <th className="px-6 py-4">Description</th>
              <th className="px-6 py-4">Date Submitted</th>
              <th className="px-6 py-4">Status</th>
              {isManager && <th className="px-6 py-4">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {isLoading ? (
              <tr>
                <td colSpan={isManager ? 7 : 5} className="px-6 py-8 text-center text-slate-500">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" /> Loading claims...
                  </div>
                </td>
              </tr>
            ) : claims.length === 0 ? (
              <tr>
                <td colSpan={isManager ? 7 : 5} className="px-6 py-8 text-center text-slate-500 font-medium">
                  No expense claims found.
                </td>
              </tr>
            ) : (
              claims.map((claim: any) => (
                <tr key={claim.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  {isManager && (
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100">
                      {claim.employee ? `${claim.employee.firstName} ${claim.employee.lastName}` : "Unknown"}
                    </td>
                  )}
                  <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100">{claim.title}</td>
                  <td className="px-6 py-4 font-extrabold text-indigo-600 dark:text-indigo-400">
                    {claim.currency} {Number(claim.totalAmount).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 max-w-xs truncate" title={claim.description}>{claim.description || "-"}</td>
                  <td className="px-6 py-4 font-medium">{new Date(claim.submittedAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold tracking-wide ${
                        claim.status === "APPROVED"
                          ? "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                          : claim.status === "REJECTED"
                          ? "bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400"
                          : "bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400"
                      }`}
                    >
                      {claim.status}
                    </span>
                  </td>
                  {isManager && (
                    <td className="px-6 py-4">
                      {claim.status === "PENDING" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => processClaimMutation.mutate({ id: claim.id, status: "APPROVED" })}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded transition-colors"
                            title="Approve"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => processClaimMutation.mutate({ id: claim.id, status: "REJECTED" })}
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
  );
}
