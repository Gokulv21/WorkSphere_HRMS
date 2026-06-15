import { useState } from "react";
import { useAuth } from "../lib/auth";
import { Headset, CheckCircle, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { activeSupabase } from "../integrations/supabase/client";

export default function Helpdesk() {
  const { user, role, tenantId } = useAuth();
  const queryClient = useQueryClient();
  const isManager = role === "COMPANY_OWNER" || role === "HR_ADMIN";

  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("IT");
  const [priority, setPriority] = useState("MEDIUM");
  const [message, setMessage] = useState("");

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Fetch current employee profile
  const { data: employee } = useQuery({
    queryKey: ["current-employee-helpdesk", user?.id],
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

  // Fetch support tickets
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["helpdesk-tickets", tenantId, employee?.id],
    queryFn: async () => {
      if (!tenantId) return [];
      
      // Load tickets with requester profile info
      // Since mockDb doesn't support complex joins automatically, we can enrich client-side
      const { data: ticketsList } = await activeSupabase
        .from("tickets")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      const enriched = await Promise.all(
        (ticketsList || []).map(async (t: any) => {
          const { data: req } = await activeSupabase.from("employees").eq("id", t.requesterId).single();
          const { data: msgs } = await activeSupabase.from("ticket_messages").eq("ticket_id", t.id);

          return {
            ...t,
            requester: req,
            messages: msgs || []
          };
        })
      );

      // If manager, return all. If employee, filter by requesterId
      if (isManager) {
        return enriched;
      } else {
        if (!employee?.id) return [];
        return enriched.filter((t: any) => t.requesterId === employee.id);
      }
    },
    enabled: !!tenantId && (isManager || !!employee?.id)
  });

  // Submit ticket mutation
  const submitTicketMutation = useMutation({
    mutationFn: async () => {
      setErrorMsg("");
      setSuccessMsg("");

      if (!subject || !message) {
        throw new Error("Subject and issue description are required.");
      }

      if (!employee?.id || !tenantId) throw new Error("Employee profile is not loaded.");

      // Create ticket
      const { data: ticket, error: ticketErr } = await activeSupabase
        .from("tickets")
        .insert({
          tenantId,
          requesterId: employee.id,
          subject,
          category,
          priority,
          status: "OPEN"
        })
        .select()
        .single();

      if (ticketErr || !ticket) {
        throw new Error(ticketErr?.message || "Failed to create support ticket.");
      }

      // Create initial message
      await activeSupabase.from("ticket_messages").insert({
        ticketId: ticket.id,
        senderId: user?.id,
        content: message
      });
    },
    onSuccess: () => {
      setSuccessMsg("Support ticket opened successfully.");
      setSubject("");
      setMessage("");
      setCategory("IT");
      setPriority("MEDIUM");
      queryClient.invalidateQueries({ queryKey: ["helpdesk-tickets"] });
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Failed to open support ticket.");
    }
  });

  // Close ticket mutation
  const resolveTicketMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      await activeSupabase
        .from("tickets")
        .update({ status: "RESOLVED" })
        .eq("id", ticketId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["helpdesk-tickets"] });
    },
    onError: (err: any) => {
      alert(err.message || "Failed to mark ticket resolved.");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitTicketMutation.mutate();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 font-sans animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Headset className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          IT & HR Helpdesk
        </h1>
      </div>

      {!isManager && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Open a New Ticket</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-3xl">
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                placeholder="Subject..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-md px-3 py-2 text-sm flex-1 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-md px-3 py-2 text-sm w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="IT" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white">IT Support</option>
                <option value="HR" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white">HR Inquiry</option>
                <option value="PAYROLL" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white">Payroll Issue</option>
                <option value="OTHER" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white">Other</option>
              </select>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                required
                className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-md px-3 py-2 text-sm w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="LOW" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white">Low Priority</option>
                <option value="MEDIUM" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white">Medium Priority</option>
                <option value="HIGH" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white">High Priority</option>
                <option value="URGENT" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white">Urgent</option>
              </select>
            </div>
            <textarea
              placeholder="Describe your issue..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={3}
              className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div>
              <button
                type="submit"
                disabled={submitTicketMutation.isPending}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-semibold disabled:opacity-50"
              >
                {submitTicketMutation.isPending ? "Submitting..." : "Submit Ticket"}
              </button>
            </div>
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

      {isLoading ? (
        <div className="flex justify-center p-12 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-500 dark:text-slate-400 font-medium">
          No support tickets found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tickets.map((ticket: any) => (
            <div key={ticket.id} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between transition-colors">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg line-clamp-1" title={ticket.subject}>
                    {ticket.subject}
                  </h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      ticket.status === "OPEN"
                        ? "bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    {ticket.status}
                  </span>
                </div>

                <div className="text-sm text-slate-500 dark:text-slate-450 mb-4 flex items-center gap-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{ticket.category}</span>
                  &bull;
                  <span
                    className={`${
                      ticket.priority === "URGENT"
                        ? "text-red-650 dark:text-red-400 font-bold"
                        : ticket.priority === "HIGH"
                        ? "text-orange-600 dark:text-orange-400 font-bold"
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {ticket.priority} Priority
                  </span>
                </div>

                {ticket.messages && ticket.messages.length > 0 && (
                  <div className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-3 rounded-lg mb-4 line-clamp-3 italic border border-slate-100 dark:border-slate-800/50">
                    "{ticket.messages[0].content}"
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div>
                  By {ticket.requester ? `${ticket.requester.firstName} ${ticket.requester.lastName}` : "User"}
                </div>
                <div>{new Date(ticket.createdAt).toLocaleDateString()}</div>
              </div>

              {isManager && ticket.status === "OPEN" && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button
                    onClick={() => resolveTicketMutation.mutate(ticket.id)}
                    disabled={resolveTicketMutation.isPending}
                    className="flex items-center gap-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 disabled:opacity-50 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Mark Resolved
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
