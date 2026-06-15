import { useState } from "react";
import { useAuth } from "../lib/auth";
import { Briefcase, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { activeSupabase } from "../integrations/supabase/client";

export default function Recruitment() {
  const { role, tenantId } = useAuth();
  const queryClient = useQueryClient();
  const isManager = role === "COMPANY_OWNER" || role === "HR_ADMIN";

  const [title, setTitle] = useState("");
  const [type, setType] = useState("FULL_TIME");
  const [description, setDescription] = useState("");

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Fetch job postings
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["job-postings", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await activeSupabase
        .from("job_postings")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      // Enrich each job posting with applications count
      const enriched = await Promise.all(
        (data || []).map(async (job: any) => {
          const { data: apps } = await activeSupabase
            .from("applications")
            .eq("job_posting_id", job.id);
          return {
            ...job,
            appCount: apps?.length || 0
          };
        })
      );

      return enriched;
    },
    enabled: !!tenantId
  });

  // Create job posting mutation
  const createJobMutation = useMutation({
    mutationFn: async () => {
      setErrorMsg("");
      setSuccessMsg("");

      if (!title || !description) {
        throw new Error("Job title and description are required.");
      }

      await activeSupabase.from("job_postings").insert({
        tenantId,
        title,
        description,
        type,
        status: "OPEN",
      });
    },
    onSuccess: () => {
      setSuccessMsg("Job posting created successfully.");
      setTitle("");
      setDescription("");
      setType("FULL_TIME");
      queryClient.invalidateQueries({ queryKey: ["job-postings"] });
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Failed to create job posting.");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createJobMutation.mutate();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 font-sans animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Briefcase className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          Recruitment
        </h1>
      </div>

      {isManager && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Post a New Job</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-2xl">
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="Job Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-md px-3 py-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                required
                className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="FULL_TIME" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white">Full Time</option>
                <option value="PART_TIME" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white">Part Time</option>
                <option value="CONTRACT" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white">Contract</option>
              </select>
            </div>
            <textarea
              placeholder="Job Description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={3}
              className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div>
              <button
                type="submit"
                disabled={createJobMutation.isPending}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-semibold disabled:opacity-50"
              >
                {createJobMutation.isPending ? "Creating..." : "Create Posting"}
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

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
          <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="px-6 py-4">Job Title</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Applications</th>
              <th className="px-6 py-4">Posted Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" /> Loading job postings...
                  </div>
                </td>
              </tr>
            ) : jobs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500 font-medium">
                  No job postings found.
                </td>
              </tr>
            ) : (
              jobs.map((job: any) => (
                <tr key={job.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100">{job.title}</td>
                  <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">{job.type.replace("_", " ")}</td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400">
                      {job.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-extrabold text-indigo-600 dark:text-indigo-400">{job.appCount}</td>
                  <td className="px-6 py-4 font-medium">{new Date(job.createdAt).toLocaleDateString()}</td>
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
