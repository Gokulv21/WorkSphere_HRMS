import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Mail, ArrowRight, KeyRound, ShieldCheck, Users } from "lucide-react";

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [loginType, setLoginType] = useState<"ADMIN" | "USER">("USER");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setPending(true);

    try {
      const { error } = await signIn(email, password);
      if (error) {
        setErrorMsg(error.message || "Invalid credentials.");
      } else {
        const sessionStr = localStorage.getItem("worksphere_session");
        if (sessionStr) {
          const session = JSON.parse(sessionStr);
          const role = session?.user?.user_metadata?.role;
          
          if (role === "SUPER_ADMIN") {
            navigate("/super-admin");
          } else if (role === "COMPANY_OWNER" || role === "HR_ADMIN") {
            navigate("/admin");
          } else {
            navigate("/user");
          }
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans transition-colors duration-300">
      {/* Animated Glowing Spots */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-indigo-500/10 dark:bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-violet-500/10 dark:bg-violet-600/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md bg-white/70 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl dark:shadow-2xl transition-all duration-300">
        
        {/* Toggle Admin / User */}
        <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl mb-8 border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setLoginType("USER")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              loginType === "USER"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
            }`}
          >
            <Users className="w-4 h-4" /> User Sign In
          </button>
          <button
            type="button"
            onClick={() => setLoginType("ADMIN")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              loginType === "ADMIN"
                ? "bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
            }`}
          >
            <ShieldCheck className="w-4 h-4" /> Admin Sign In
          </button>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-1">
            {loginType === "ADMIN" ? "Admin Portal" : "Employee Portal"}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {loginType === "ADMIN" 
              ? "Sign in to manage HR and operations" 
              : "Sign in to mark attendance and view payroll"}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/25 rounded-xl text-rose-600 dark:text-rose-400 text-sm font-semibold animate-fade-in">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Work Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm font-medium"
                placeholder="name@company.com"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Account Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <KeyRound className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm font-medium"
                placeholder="Password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={pending}
            className={`w-full flex items-center justify-center gap-2 text-white py-3.5 rounded-xl font-bold transition-all shadow-lg hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed text-sm mt-6 ${
              loginType === "ADMIN" 
                ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20 hover:shadow-rose-600/30"
                : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20 hover:shadow-indigo-600/30"
            }`}
          >
            {pending ? "Authenticating..." : "Sign In to Workspace"}
            {!pending && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
