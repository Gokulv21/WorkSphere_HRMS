import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Mail, Calendar, Briefcase, IndianRupee, Gift } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { activeSupabase } from "../integrations/supabase/client";

export default function EmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { tenantId } = useAuth();

  // Fetch employee detailed profile
  const { data: employee, isLoading, error } = useQuery({
    queryKey: ["employee-detail", id],
    queryFn: async () => {
      if (!id) return null;
      const { data: emp, error: empErr } = await activeSupabase
        .from("employees")
        .eq("id", id)
        .single();

      if (empErr || !emp) throw new Error(empErr?.message || "Employee not found");

      if (emp.tenantId !== tenantId) {
        throw new Error("Unauthorized access to employee record");
      }

      // Fetch compensations, incentives, and gift cards
      const { data: compensations } = await activeSupabase
        .from("compensations")
        .eq("employee_id", id)
        .order("effective_date", { ascending: false });

      const { data: incentives } = await activeSupabase
        .from("incentives")
        .eq("employee_id", id)
        .order("awarded_date", { ascending: false });

      const { data: giftCards } = await activeSupabase
        .from("gift_cards")
        .eq("employee_id", id)
        .order("issued_date", { ascending: false });

      return {
        ...emp,
        compensations: compensations || [],
        incentives: incentives || [],
        giftCards: giftCards || []
      };
    },
    enabled: !!id && !!tenantId
  });

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-slate-500 dark:text-slate-400 text-sm font-semibold flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-600" /> Loading employee profile...
        </div>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="space-y-4 font-sans max-w-md mx-auto mt-12 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg">
        <div className="text-red-500 dark:text-red-400 text-sm font-bold">Error: {error?.message || "Employee profile not found"}</div>
        <button
          onClick={() => navigate("/users")}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors"
        >
          Back to Directory
        </button>
      </div>
    );
  }

  const currentComp = employee.compensations?.[0];
  const formatMoney = (amount: number, currency = "USD") => {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(amount);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 font-sans animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            {employee.firstName} {employee.lastName}
            {employee.status === "TERMINATED" && (
              <span className="bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs px-2 py-1 rounded-full font-bold">Terminated</span>
            )}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2 font-medium">
            <Briefcase className="w-4 h-4 text-indigo-500 dark:text-indigo-400" /> {employee.jobTitle || employee.employeeNumber}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Personal Info */}
        <div className="col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 transition-colors">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Contact Info</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3 text-sm">
                <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-700 dark:text-slate-300">Work Email</div>
                  <div className="text-slate-500 dark:text-slate-400 mt-0.5">{employee.workEmail}</div>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-700 dark:text-slate-300">Joined Date</div>
                  <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                    {new Date(employee.joiningDate).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Compensation & History */}
        <div className="col-span-2 space-y-6">
          {/* Base Salary */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <IndianRupee className="w-5 h-5 text-indigo-500" />
                Current Compensation
              </h2>
            </div>
            {currentComp ? (
              <div>
                <div className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
                  {formatMoney(Number(currentComp.baseSalary), currentComp.currency)}
                  <span className="text-sm font-normal text-slate-500 dark:text-slate-400 ml-2">/ month</span>
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-450 mt-2 font-medium">
                  Effective from {new Date(currentComp.effectiveDate).toLocaleDateString()}
                </div>
              </div>
            ) : (
              <div className="text-slate-500 dark:text-slate-400 text-sm font-medium">No compensation record found.</div>
            )}
          </div>

          {/* Incentives */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 transition-colors">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Recent Incentives</h2>
            {employee.incentives?.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {employee.incentives.map((inc: any) => (
                  <div key={inc.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{inc.reason}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {new Date(inc.awardedDate).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="font-extrabold text-emerald-600 dark:text-emerald-450 font-mono text-lg">
                      +{formatMoney(Number(inc.amount), inc.currency)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-slate-500 dark:text-slate-400 text-sm font-medium">No incentives recorded yet.</div>
            )}
          </div>

          {/* Gift Cards */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 transition-colors">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Gift className="w-5 h-5 text-pink-500" />
              Gift Cards & Perks
            </h2>
            {employee.giftCards?.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {employee.giftCards.map((gift: any) => (
                  <div key={gift.id} className="border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl">
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                      {gift.provider}
                    </div>
                    <div className="font-extrabold text-slate-850 dark:text-white text-lg font-mono">
                      {formatMoney(Number(gift.amount), gift.currency)}
                    </div>
                    <div className="text-xs text-slate-400 dark:text-slate-500 mt-2 font-medium">
                      Issued {new Date(gift.issuedDate).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-slate-500 dark:text-slate-400 text-sm font-medium">No gift cards issued.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
