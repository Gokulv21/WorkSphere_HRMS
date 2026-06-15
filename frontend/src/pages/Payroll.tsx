import { useState } from "react";
import { useAuth } from "../lib/auth";
import { CreditCard, DollarSign, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { activeSupabase } from "../integrations/supabase/client";

export default function Payroll() {
  const { role, tenantId } = useAuth();
  const queryClient = useQueryClient();
  const isManager = role === "COMPANY_OWNER" || role === "HR_ADMIN";

  // Form states - update salary
  const [salEmpId, setSalEmpId] = useState("");
  const [salAmount, setSalAmount] = useState("");

  // Form states - award incentive
  const [incEmpId, setIncEmpId] = useState("");
  const [incAmount, setIncAmount] = useState("");
  const [incReason, setIncReason] = useState("");

  // Queries
  const { data: employees = [] } = useQuery({
    queryKey: ["payroll-employees", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await activeSupabase
        .from("employees")
        .eq("tenant_id", tenantId)
        .eq("status", "ACTIVE");
      return data || [];
    },
    enabled: !!tenantId
  });

  const { data: compensations = [], isLoading: compLoading } = useQuery({
    queryKey: ["payroll-compensations", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await activeSupabase
        .from("compensations")
        .select("*, employee:employees(*)")
        .order("effective_date", { ascending: false });

      // Client-side filter for current tenant
      return (data || []).filter((c: any) => c.employee?.tenantId === tenantId);
    },
    enabled: !!tenantId
  });

  const { data: incentives = [], isLoading: incLoading } = useQuery({
    queryKey: ["payroll-incentives", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await activeSupabase
        .from("incentives")
        .select("*, employee:employees(*)")
        .order("awarded_date", { ascending: false });

      // Client-side filter for current tenant
      return (data || []).filter((i: any) => i.employee?.tenantId === tenantId);
    },
    enabled: !!tenantId
  });

  // Mutations
  const updateSalaryMutation = useMutation({
    mutationFn: async () => {
      if (!salEmpId || !salAmount) throw new Error("Missing employee or salary amount.");

      // Check if there is an active compensation
      const { data: existing } = await activeSupabase
        .from("compensations")
        .eq("employee_id", salEmpId)
        .eq("end_date", null);

      if (existing && existing.length > 0) {
        // Update previous active record's end_date
        await activeSupabase
          .from("compensations")
          .update({ endDate: new Date().toISOString() })
          .eq("id", existing[0].id);
      }

      // Create new compensation
      await activeSupabase.from("compensations").insert({
        employeeId: salEmpId,
        baseSalary: parseFloat(salAmount),
        currency: "USD",
        effectiveDate: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      alert("Compensation updated successfully.");
      setSalEmpId("");
      setSalAmount("");
      queryClient.invalidateQueries({ queryKey: ["payroll-compensations"] });
    },
    onError: (err: any) => {
      alert(err.message || "Failed to update compensation.");
    }
  });

  const addIncentiveMutation = useMutation({
    mutationFn: async () => {
      if (!incEmpId || !incAmount || !incReason) throw new Error("All fields are required.");

      await activeSupabase.from("incentives").insert({
        employeeId: incEmpId,
        amount: parseFloat(incAmount),
        currency: "USD",
        reason: incReason,
        awardedDate: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      alert("Incentive awarded successfully.");
      setIncEmpId("");
      setIncAmount("");
      setIncReason("");
      queryClient.invalidateQueries({ queryKey: ["payroll-incentives"] });
    },
    onError: (err: any) => {
      alert(err.message || "Failed to award incentive.");
    }
  });

  const handleUpdateSalary = (e: React.FormEvent) => {
    e.preventDefault();
    updateSalaryMutation.mutate();
  };

  const handleAddIncentive = (e: React.FormEvent) => {
    e.preventDefault();
    addIncentiveMutation.mutate();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 font-sans animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          Payroll & Compensation
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Compensations Column */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Base Salaries</h2>

          {isManager && (
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-350 mb-3">Update Salary</h3>
              <form onSubmit={handleUpdateSalary} className="flex items-center gap-3">
                <select
                  value={salEmpId}
                  onChange={(e) => setSalEmpId(e.target.value)}
                  required
                  className="border border-slate-300 dark:border-slate-700 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-white flex-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white">Select Employee</option>
                  {employees.map((e: any) => (
                    <option key={e.id} value={e.id} className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white">
                      {e.firstName} {e.lastName}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Amount"
                  value={salAmount}
                  onChange={(e) => setSalAmount(e.target.value)}
                  required
                  className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-md px-3 py-1.5 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={updateSalaryMutation.isPending}
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm font-semibold disabled:opacity-50"
                >
                  Update
                </button>
              </form>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Base Salary</th>
                  <th className="px-4 py-3">Effective Date</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {compLoading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-600" /> Loading...
                      </div>
                    </td>
                  </tr>
                ) : compensations.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500 font-medium">
                      No compensations defined.
                    </td>
                  </tr>
                ) : (
                  compensations.map((comp: any) => (
                    <tr key={comp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">
                        {comp.employee ? `${comp.employee.firstName} ${comp.employee.lastName}` : "Unknown"}
                      </td>
                      <td className="px-4 py-3 font-extrabold text-slate-800 dark:text-slate-200">
                        {comp.currency} {Number(comp.baseSalary).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 font-medium">{new Date(comp.effectiveDate).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold tracking-wide ${
                            !comp.endDate
                              ? "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          {!comp.endDate ? "Active" : "Past"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Incentives Column */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            Incentives
          </h2>

          {isManager && (
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-350 mb-3">Award Incentive</h3>
              <form onSubmit={handleAddIncentive} className="flex flex-col gap-3">
                <div className="flex gap-3">
                  <select
                    value={incEmpId}
                    onChange={(e) => setIncEmpId(e.target.value)}
                    required
                    className="border border-slate-300 dark:border-slate-700 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-white flex-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white">Select Employee</option>
                    {employees.map((e: any) => (
                      <option key={e.id} value={e.id} className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white">
                        {e.firstName} {e.lastName}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="Amount"
                    value={incAmount}
                    onChange={(e) => setIncAmount(e.target.value)}
                    required
                    className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-md px-3 py-1.5 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Reason..."
                    value={incReason}
                    onChange={(e) => setIncReason(e.target.value)}
                    required
                    className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-md px-3 py-1.5 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={addIncentiveMutation.isPending}
                    className="px-4 py-1.5 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors text-sm font-semibold disabled:opacity-50"
                  >
                    Award
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {incLoading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-600" /> Loading...
                      </div>
                    </td>
                  </tr>
                ) : incentives.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500 font-medium">
                      No incentives awarded yet.
                    </td>
                  </tr>
                ) : (
                  incentives.map((inc: any) => (
                    <tr key={inc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">
                        {inc.employee ? `${inc.employee.firstName} ${inc.employee.lastName}` : "Unknown"}
                      </td>
                      <td className="px-4 py-3 font-extrabold text-emerald-600 dark:text-emerald-400">
                        +{inc.currency} {Number(inc.amount).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 font-medium">{inc.reason}</td>
                      <td className="px-4 py-3">{new Date(inc.awardedDate).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
