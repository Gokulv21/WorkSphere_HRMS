import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Users, UserPlus, Briefcase, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { activeSupabase } from "../integrations/supabase/client";

export default function UserManagement() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [role, setRole] = useState("STANDARD_EMPLOYEE");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Fetch employees
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees", tenantId],
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

  // Create employee mutation
  const createEmployeeMutation = useMutation({
    mutationFn: async () => {
      setErrorMsg("");
      setSuccessMsg("");

      if (!firstName || !lastName || !email || !password) {
        throw new Error("All required fields must be filled.");
      }

      // Check if user email exists
      const { data: existingUser } = await activeSupabase
        .from("users")
        .eq("email", email)
        .maybeSingle();

      if (existingUser) {
        throw new Error("Email already registered.");
      }

      // Next employee number
      const nextId = employees.length + 1;
      const employeeNumber = `EMP-${nextId.toString().padStart(3, "0")}`;

      // Create login User record
      const { data: user, error: userErr } = await activeSupabase
        .from("users")
        .insert({
          email,
          password,
          role,
          tenantId
        })
        .select()
        .single();

      if (userErr || !user) {
        throw new Error(userErr?.message || "Failed to create user login credentials");
      }

      // Create Employee profile record
      const { error: empErr } = await activeSupabase
        .from("employees")
        .insert({
          userId: user.id,
          tenantId,
          firstName,
          lastName,
          employeeNumber,
          workEmail: email,
          jobTitle: jobTitle || "Employee",
          status: "ACTIVE",
          joiningDate: new Date().toISOString()
        });

      if (empErr) {
        // Rollback user
        await activeSupabase.from("users").delete().eq("id", user.id);
        throw new Error(empErr?.message || "Failed to create employee profile");
      }

      return user;
    },
    onSuccess: () => {
      setSuccessMsg("Employee created successfully.");
      setFirstName("");
      setLastName("");
      setJobTitle("");
      setEmail("");
      setPassword("");
      setRole("STANDARD_EMPLOYEE");
      queryClient.invalidateQueries({ queryKey: ["employees", tenantId] });
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Failed to create employee.");
    }
  });

  // Delete employee mutation
  const deleteEmployeeMutation = useMutation({
    mutationFn: async (employee: any) => {
      if (employee.userId) {
        // Find if they are owner
        const { data: userRec } = await activeSupabase
          .from("users")
          .eq("id", employee.userId)
          .single();

        if (userRec?.role === "COMPANY_OWNER") {
          throw new Error("Cannot delete the company owner.");
        }

        // Delete user login record
        await activeSupabase.from("users").delete().eq("id", employee.userId);
      }

      // Soft delete employee profile
      await activeSupabase
        .from("employees")
        .update({ status: "TERMINATED", deletedAt: new Date().toISOString() })
        .eq("id", employee.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees", tenantId] });
    },
    onError: (err: any) => {
      alert(err.message || "Failed to delete employee");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createEmployeeMutation.mutate();
  };

  const handleDelete = (emp: any) => {
    if (
      confirm(
        "Are you sure you want to delete this employee? Their historical data will be retained for auditing, but they will lose login access."
      )
    ) {
      deleteEmployeeMutation.mutate(emp);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 font-sans animate-fade-in">
      <div className="lg:col-span-1">
        <div className="sticky top-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm transition-colors">
          <h2 className="mb-6 flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <UserPlus className="w-5 h-5 text-indigo-500" />
            Add New Employee
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && <div className="p-3 bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 rounded-xl text-sm font-semibold">{errorMsg}</div>}
            {successMsg && <div className="p-3 bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 rounded-xl text-sm font-semibold">{successMsg}</div>}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-350">First Name</label>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="John"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-350">Last Name</label>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Doe"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-350">Job Title</label>
              <input
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. SDE, CEO"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-350">System Access Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="STANDARD_EMPLOYEE" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white">Standard Employee</option>
                <option value="HR_ADMIN" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white">HR Admin</option>
                <option value="MANAGER" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white">Manager</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-350">Work Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="john@company.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-350">Temporary Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Temporary password"
              />
            </div>
            <button
              type="submit"
              disabled={createEmployeeMutation.isPending}
              className="mt-2 w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
            >
              {createEmployeeMutation.isPending ? "Creating..." : "Create Employee"}
            </button>
          </form>
        </div>
      </div>

      <div className="lg:col-span-2">
        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-colors">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/10 p-6">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
              <Users className="w-5 h-5 text-indigo-500" />
              Employee Directory
            </h2>
            <span className="rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1 text-xs font-bold text-slate-600 dark:text-slate-400">
              {employees.length} Users
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {isLoading ? (
              <div className="p-8 text-center text-sm text-slate-500">
                Loading employee directory...
              </div>
            ) : employees.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                No employees found. Add your first employee using the form.
              </div>
            ) : (
              employees.map((employee: any) => (
                <div
                  key={employee.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30 gap-4 sm:gap-0"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-950/50 text-lg font-bold text-indigo-600 dark:text-indigo-400">
                      {employee.firstName?.[0] || ""}
                      {employee.lastName?.[0] || ""}
                    </div>
                    <div>
                      <Link
                        to={`/employees/${employee.id}`}
                        className="font-semibold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                      >
                        {employee.firstName} {employee.lastName}
                      </Link>
                      <div className="text-sm text-slate-500 dark:text-slate-400">{employee.workEmail}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-slate-100 dark:border-slate-800 pt-3 sm:pt-0">
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1 text-sm font-semibold text-slate-700 dark:text-slate-350">
                        <Briefcase className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                        {employee.jobTitle || employee.employeeNumber}
                      </div>
                      <div className="mt-0.5 text-xs capitalize text-slate-500 dark:text-slate-400">
                        {employee.employeeNumber}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(employee)}
                      disabled={deleteEmployeeMutation.isPending}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors disabled:opacity-50 ml-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
