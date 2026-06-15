import { useState } from "react";
import { useAuth } from "../lib/auth";
import { Star, MessageSquare, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { activeSupabase } from "../integrations/supabase/client";

export default function Performance() {
  const { user, role, tenantId } = useAuth();
  const queryClient = useQueryClient();
  const isManager = role === "COMPANY_OWNER" || role === "HR_ADMIN";

  const [employeeId, setEmployeeId] = useState("");
  const [reviewPeriod, setReviewPeriod] = useState("");
  const [rating, setRating] = useState("5");
  const [comments, setComments] = useState("");

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Fetch current employee profile
  const { data: currentEmployee } = useQuery({
    queryKey: ["current-employee-performance", user?.id],
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

  // Fetch list of employees (for managers to choose from)
  const { data: employees = [] } = useQuery({
    queryKey: ["performance-employees", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await activeSupabase
        .from("employees")
        .eq("tenant_id", tenantId)
        .eq("status", "ACTIVE");
      return data || [];
    },
    enabled: !!tenantId && isManager
  });

  // Fetch reviews
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["performance-reviews", tenantId, currentEmployee?.id],
    queryFn: async () => {
      if (!tenantId) return [];
      let query = activeSupabase.from("performance_reviews").select("*, employee:employees(*), reviewer:employees(*)");

      if (isManager) {
        // In local storage mock or real query, filter by employee's tenant
        // We will fetch all reviews and filter client-side for tenantId simplicity
        const { data } = await query.order("created_at", { ascending: false });
        return (data || []).filter((r: any) => r.employee?.tenantId === tenantId);
      } else {
        if (!currentEmployee?.id) return [];
        const { data } = await query.eq("employee_id", currentEmployee.id).order("created_at", { ascending: false });
        return data || [];
      }
    },
    enabled: !!tenantId && (isManager || !!currentEmployee?.id)
  });

  // Submit review mutation
  const submitReviewMutation = useMutation({
    mutationFn: async () => {
      setErrorMsg("");
      setSuccessMsg("");

      if (!employeeId || !reviewPeriod || !rating) {
        throw new Error("All fields are required.");
      }

      // Find current reviewer employee profile matching current user ID
      const { data: reviewer } = await activeSupabase
        .from("employees")
        .eq("user_id", user?.id)
        .single();

      if (!reviewer) {
        throw new Error("Reviewer employee profile not found.");
      }

      await activeSupabase.from("performance_reviews").insert({
        employeeId,
        reviewerId: reviewer.id,
        reviewPeriod,
        rating: parseInt(rating),
        comments,
        reviewDate: new Date().toISOString()
      });
    },
    onSuccess: () => {
      setSuccessMsg("Performance review submitted successfully.");
      setEmployeeId("");
      setReviewPeriod("");
      setComments("");
      setRating("5");
      queryClient.invalidateQueries({ queryKey: ["performance-reviews"] });
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Failed to submit review.");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitReviewMutation.mutate();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 font-sans animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Star className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          Performance Reviews
        </h1>
        {isManager && (
          <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              required
              className="border border-slate-300 dark:border-slate-700 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white">Select Employee</option>
              {employees.map((e: any) => (
                <option key={e.id} value={e.id} className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white">
                  {e.firstName} {e.lastName}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Period (e.g., Q1 2026)"
              value={reviewPeriod}
              onChange={(e) => setReviewPeriod(e.target.value)}
              required
              className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-md px-3 py-1.5 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <select
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              required
              className="border border-slate-300 dark:border-slate-700 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="5" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white">5 - Excellent</option>
              <option value="4" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white">4 - Good</option>
              <option value="3" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white">3 - Average</option>
              <option value="2" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white">2 - Poor</option>
              <option value="1" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white">1 - Terrible</option>
            </select>
            <input
              type="text"
              placeholder="Comments..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={submitReviewMutation.isPending}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-semibold disabled:opacity-50"
            >
              {submitReviewMutation.isPending ? "Submitting..." : "Submit Review"}
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

      {isLoading ? (
        <div className="flex justify-center p-12 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-500 dark:text-slate-400 font-medium">
          No performance reviews found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reviews.map((rev: any) => (
            <div key={rev.id} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between transition-colors">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-slate-850 dark:text-white">
                      {rev.employee ? `${rev.employee.firstName} ${rev.employee.lastName}` : "Unknown"}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{rev.reviewPeriod}</p>
                  </div>
                  <div className="flex items-center gap-1 bg-yellow-100 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400 px-2.5 py-1 rounded-lg font-bold text-sm">
                    <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                    {rev.rating}/5
                  </div>
                </div>

                {rev.comments && (
                  <div className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-3 rounded-lg mb-4 italic border border-slate-100 dark:border-slate-800/50">
                    "{rev.comments}"
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  By {rev.reviewer ? `${rev.reviewer.firstName} ${rev.reviewer.lastName}` : "Reviewer"}
                </div>
                <div>{new Date(rev.reviewDate).toLocaleDateString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
