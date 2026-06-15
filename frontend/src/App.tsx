import { ReactNode, useEffect } from "react";
import { HashRouter, Route, Routes, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./lib/auth";
import { Loader2 } from "lucide-react";

// Pages
import Login from "./pages/Login";
import SuperAdmin from "./pages/SuperAdmin";
import DashboardHome from "./pages/DashboardHome";
import UserManagement from "./pages/UserManagement";
import EmployeeDetail from "./pages/EmployeeDetail";
import Attendance from "./pages/Attendance";
import Leaves from "./pages/Leaves";
import Performance from "./pages/Performance";
import Claims from "./pages/Claims";
import Payroll from "./pages/Payroll";
import Recruitment from "./pages/Recruitment";
import Helpdesk from "./pages/Helpdesk";

// User Portal Pages
import UserDashboard from "./pages/user/UserDashboard";
import UserLeaves from "./pages/user/UserLeaves";
import UserPayroll from "./pages/user/UserPayroll";

// Layouts
import AppShell from "./components/layout/app-shell";
import UserAppShell from "./components/layout/user-app-shell";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function ProtectedRoute({ children, allowedRoles }: { children: ReactNode; allowedRoles?: string[] }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role === "SUPER_ADMIN") {
    return <Navigate to="/super-admin" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role || "")) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function RoleBasedRedirect() {
  const { user, role, loading } = useAuth();
  
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  if (role === "SUPER_ADMIN") {
    return <Navigate to="/super-admin" replace />;
  }

  if (role === "COMPANY_OWNER" || role === "HR_ADMIN") {
    return <Navigate to="/admin" replace />;
  }

  return <Navigate to="/user" replace />;
}

function SuperAdminRoute({ children }: { children: ReactNode }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!user || role !== "SUPER_ADMIN") {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: ReactNode }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (user) {
    if (role === "SUPER_ADMIN") return <Navigate to="/super-admin" replace />;
    if (role === "COMPANY_OWNER" || role === "HR_ADMIN") return <Navigate to="/admin" replace />;
    return <Navigate to="/user" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  useEffect(() => {
    const isDark = localStorage.getItem("worksphere_theme") === "dark" ||
      (!localStorage.getItem("worksphere_theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <AuthProvider>
          <Routes>
            {/* Public Access */}
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

            {/* Smart Root Redirect */}
            <Route path="/" element={<RoleBasedRedirect />} />

            {/* Super Admin Access */}
            <Route path="/super-admin" element={<SuperAdminRoute><SuperAdmin /></SuperAdminRoute>} />

            {/* Admin Application Console (Owner / HR) */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={["COMPANY_OWNER", "HR_ADMIN"]}>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardHome />} />
              <Route path="attendance" element={<Attendance />} />
              <Route path="claims" element={<Claims />} />
              <Route path="employees/:id" element={<EmployeeDetail />} />
              <Route path="helpdesk" element={<Helpdesk />} />
              <Route path="leaves" element={<Leaves />} />
              
              <Route
                path="users"
                element={
                  <ProtectedRoute allowedRoles={["COMPANY_OWNER"]}>
                    <UserManagement />
                  </ProtectedRoute>
                }
              />
              <Route path="payroll" element={<Payroll />} />
              <Route path="performance" element={<Performance />} />
              <Route path="recruitment" element={<Recruitment />} />
            </Route>

            {/* User Application Console (Standard Employee / Manager) */}
            <Route
              path="/user"
              element={
                <ProtectedRoute allowedRoles={["STANDARD_EMPLOYEE", "MANAGER"]}>
                  <UserAppShell />
                </ProtectedRoute>
              }
            >
              <Route index element={<UserDashboard />} />
              <Route path="leaves" element={<UserLeaves />} />
              <Route path="payroll" element={<UserPayroll />} />
              <Route path="helpdesk" element={<Helpdesk />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </HashRouter>
    </QueryClientProvider>
  );
}
