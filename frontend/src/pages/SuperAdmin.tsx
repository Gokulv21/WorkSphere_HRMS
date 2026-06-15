import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Building2, LogOut, Plus, Users } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { activeSupabase } from "../integrations/supabase/client";

export default function SuperAdmin() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Basic Info
  const [companyName, setCompanyName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [planCode, setPlanCode] = useState("BASIC");

  // Extended Indian Corporate Info
  const [employerName, setEmployerName] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyType, setCompanyType] = useState("PRIVATE_LIMITED");

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  // Fetch tenants
  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ["super-admin-tenants"],
    queryFn: async () => {
      // Get tenants
      const { data: tenantsList } = await activeSupabase.from("tenants").select("*");
      
      // Get owner and employee details for each tenant
      const enriched = await Promise.all(
        (tenantsList || []).map(async (tenant: any) => {
          const { data: usersList } = await activeSupabase
            .from("users")
            .eq("tenant_id", tenant.id)
            .eq("role", "COMPANY_OWNER");
            
          const { data: employeesList } = await activeSupabase
            .from("employees")
            .eq("tenant_id", tenant.id);

          return {
            ...tenant,
            ownerEmail: usersList?.[0]?.email || "Unknown",
            employeeCount: employeesList?.length || 0
          };
        })
      );
      return enriched;
    }
  });

  // Create company mutation
  const createCompanyMutation = useMutation({
    mutationFn: async () => {
      setErrorMsg("");
      setSuccessMsg("");

      if (!companyName || !ownerEmail || !ownerPassword || !employerName || !gstNumber || !panNumber) {
        throw new Error("All critical fields are required.");
      }

      // Check if user exists
      const { data: existingUser } = await activeSupabase
        .from("users")
        .eq("email", ownerEmail)
        .maybeSingle();

      if (existingUser) {
        throw new Error("User with this email already exists.");
      }

      // Create Tenant
      const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const { data: tenant, error: tenantErr } = await activeSupabase
        .from("tenants")
        .insert({
          legalName: companyName,
          displayName: companyName,
          slug,
          planCode,
          status: "ACTIVE",
          employerName,
          gstNumber,
          panNumber,
          companyAddress,
          companyType
        })
        .select()
        .single();

      if (tenantErr || !tenant) {
        throw new Error(tenantErr?.message || "Failed to create tenant");
      }

      // Create Owner User
      const { data: user, error: userErr } = await activeSupabase
        .from("users")
        .insert({
          email: ownerEmail,
          password: ownerPassword, // LocalStorage mock accepts plain password, Supabase Auth hashes it
          role: "COMPANY_OWNER",
          tenantId: tenant.id
        })
        .select()
        .single();

      if (userErr || !user) {
        // Rollback tenant in case of user creation failure
        await activeSupabase.from("tenants").delete().eq("id", tenant.id);
        throw new Error(userErr?.message || "Failed to create company owner");
      }

      // Extract first/last name from employerName
      const nameParts = employerName.trim().split(" ");
      const firstName = nameParts[0] || "Company";
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "Owner";

      // Create initial owner employee record
      await activeSupabase.from("employees").insert({
        tenantId: tenant.id,
        employeeNumber: "EMP-001",
        firstName,
        lastName,
        workEmail: ownerEmail,
        department: "Management",
        jobTitle: "Founder & CEO",
        status: "ACTIVE",
        userId: user.id,
        joiningDate: new Date().toISOString()
      });

      return { tenant, user };
    },
    onSuccess: () => {
      setSuccessMsg("Company and Owner created successfully.");
      setCompanyName("");
      setOwnerEmail("");
      setOwnerPassword("");
      setEmployerName("");
      setGstNumber("");
      setPanNumber("");
      setCompanyAddress("");
      setCompanyType("PRIVATE_LIMITED");
      queryClient.invalidateQueries({ queryKey: ["super-admin-tenants"] });
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Failed to create company.");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCompanyMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <nav className="bg-slate-900 text-white p-4 shadow-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-500 rounded flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">WorkSphere Super Admin</span>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
        {/* Left Col: Create Company Form */}
        <div className="lg:col-span-5">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
            <h2 className="text-xl font-bold mb-6 text-slate-900 dark:text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-500" />
              Onboard New Client
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {errorMsg && <div className="p-3 bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/50 rounded-xl text-sm font-semibold">{errorMsg}</div>}
              {successMsg && <div className="p-3 bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900/50 rounded-xl text-sm font-semibold">{successMsg}</div>}

              {/* Company Identity */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">Company Identity</h3>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-350 mb-1">Company / Organization Name *</label>
                  <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm" placeholder="Acme Corp" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-350 mb-1">Company Type *</label>
                  <select value={companyType} onChange={(e) => setCompanyType(e.target.value)} className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm">
                    <option value="PRIVATE_LIMITED">Private Limited Company</option>
                    <option value="PUBLIC_LIMITED">Public Limited Company</option>
                    <option value="LLP">Limited Liability Partnership (LLP)</option>
                    <option value="PROPRIETORSHIP">Sole Proprietorship</option>
                    <option value="PARTNERSHIP">Partnership Firm</option>
                  </select>
                </div>
              </div>

              {/* Owner Credentials */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">Owner Credentials</h3>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-350 mb-1">Employer / Owner Full Name *</label>
                  <input value={employerName} onChange={(e) => setEmployerName(e.target.value)} required className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm" placeholder="John Doe" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-350 mb-1">Login Email *</label>
                    <input type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} required className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm" placeholder="owner@acme.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-350 mb-1">Password *</label>
                    <input type="password" value={ownerPassword} onChange={(e) => setOwnerPassword(e.target.value)} required className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm" placeholder="Temporary pass" />
                  </div>
                </div>
              </div>

              {/* Regulatory Data */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">Regulatory Information</h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-350 mb-1">GSTIN *</label>
                    <input value={gstNumber} onChange={(e) => setGstNumber(e.target.value.toUpperCase())} required className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm uppercase" placeholder="22AAAAA0000A1Z5" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-350 mb-1">Company PAN *</label>
                    <input value={panNumber} onChange={(e) => setPanNumber(e.target.value.toUpperCase())} required className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm uppercase" placeholder="ABCDE1234F" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-350 mb-1">Registered Address</label>
                  <textarea value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm resize-none h-20" placeholder="Block A, Phase 1, Tech Park..." />
                </div>
              </div>

              {/* Subscription */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-350 mb-1">Subscription Plan</label>
                <select value={planCode} onChange={(e) => setPlanCode(e.target.value)} className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm">
                  <option value="BASIC">Basic</option>
                  <option value="PRO">Pro</option>
                  <option value="ENTERPRISE">Enterprise</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={createCompanyMutation.isPending}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50 text-sm shadow-md"
              >
                {createCompanyMutation.isPending ? "Creating Company..." : "Register Client"}
              </button>
            </form>
          </div>
        </div>

        {/* Right Col: Companies List */}
        <div className="lg:col-span-7 space-y-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Registered Companies</h2>
          {isLoading ? (
            <div className="bg-white dark:bg-slate-900 p-8 text-center text-slate-500 dark:text-slate-400 rounded-2xl border border-slate-200 dark:border-slate-800 transition-colors">
              Loading companies...
            </div>
          ) : tenants.length === 0 ? (
            <div className="bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center text-slate-500 dark:text-slate-400">
              No companies registered yet. Create your first client!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tenants.map((tenant: any) => (
                <div key={tenant.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-md transition-all duration-300 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg text-slate-900 dark:text-white">{tenant.displayName}</h3>
                      <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500">{tenant.companyType?.replace("_", " ")}</span>
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 mb-4 flex flex-col gap-1.5">
                      <span className="flex items-center gap-1.5"><strong className="text-slate-700 dark:text-slate-300">Owner:</strong> {tenant.employerName} ({tenant.ownerEmail})</span>
                      <span className="flex items-center gap-1.5"><strong className="text-slate-700 dark:text-slate-300">GST:</strong> <span className="font-mono">{tenant.gstNumber}</span></span>
                      <span className="flex items-center gap-1.5"><strong className="text-slate-700 dark:text-slate-300">PAN:</strong> <span className="font-mono">{tenant.panNumber}</span></span>
                      <span className="flex items-center gap-1.5"><strong className="text-slate-700 dark:text-slate-300">Plan:</strong> <span className="text-indigo-600 dark:text-indigo-400 font-bold">{tenant.planCode}</span></span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-3 py-1.5 rounded-lg text-xs font-semibold border border-indigo-100 dark:border-indigo-900/50">
                      <Users className="w-3.5 h-3.5" />
                      {tenant.employeeCount} Employees Enrolled
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
