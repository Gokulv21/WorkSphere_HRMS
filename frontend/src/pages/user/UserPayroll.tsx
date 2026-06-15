import { useState } from "react";
import { useAuth } from "../../lib/auth";
import { IndianRupee, MessageSquarePlus, TrendingUp } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { activeSupabase } from "../../integrations/supabase/client";

export default function UserPayroll() {
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

  const { data: compensation } = useQuery({
    queryKey: ["my-compensation", employee?.id],
    queryFn: async () => {
      if (!employee?.id) return null;
      const { data } = await activeSupabase
        .from("compensations")
        .eq("employee_id", employee.id)
        .single();
      return data;
    },
    enabled: !!employee?.id
  });

  const requestHikeMutation = useMutation({
    mutationFn: async () => {
      if (!employee?.id || !tenantId) throw new Error("Missing info");

      const ticketObj = {
        tenantId,
        requesterId: employee.id,
        subject: "Salary Hike Request",
        category: "PAYROLL",
        priority: "HIGH",
        status: "OPEN"
      };

      const { data: newTicket, error } = await activeSupabase
        .from("tickets")
        .insert(ticketObj)
        .select()
        .single();

      if (error || !newTicket) throw error;

      await activeSupabase.from("ticket_messages").insert({
        ticketId: newTicket.id,
        senderId: employee.id,
        message: `Hike Request Justification: ${reason}`,
        isInternal: false
      });
    },
    onSuccess: () => {
      setIsModalOpen(false);
      setReason("");
      alert("Hike request submitted successfully!");
    },
    onError: (err: any) => {
      alert(err.message || "Failed to submit request.");
    }
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans animate-fade-in">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
        <IndianRupee className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
        My Payroll Info
      </h1>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden p-6">
        {compensation ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="text-sm font-bold uppercase tracking-wider text-slate-400">Current Base Salary</div>
              <div className="text-3xl font-extrabold text-slate-800 dark:text-white mt-1">
                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: compensation.currency || 'INR', maximumSignificantDigits: 3 }).format(compensation.baseSalary)}
              </div>
              <div className="text-xs font-semibold text-slate-500 mt-1 capitalize">
                Paid {compensation.payPeriod?.toLowerCase()}
              </div>
            </div>
            {/* Can show more details here if needed */}
          </div>
        ) : (
          <div className="text-center py-10 text-slate-500">
            No payroll information found on your profile.
          </div>
        )}

        <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" /> Request Salary Hike
            </h3>
            <p className="text-sm text-slate-500">Think you deserve a raise? Submit a formal request to your manager.</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold transition-colors shadow-lg shadow-emerald-600/20"
          >
            Ask for Hike
          </button>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden animate-fade-in">
            <div className="p-6">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Salary Hike Request</h3>
              <p className="text-sm text-slate-500 mb-4">Detail the reasons for your hike request (e.g., achievements, extra responsibilities).</p>
              
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="I am requesting a hike because..."
                className="w-full h-32 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-4 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-900 dark:text-white resize-none"
              />

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => requestHikeMutation.mutate()}
                  disabled={!reason.trim() || requestHikeMutation.isPending}
                  className="flex-1 px-4 py-2.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  {requestHikeMutation.isPending ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
