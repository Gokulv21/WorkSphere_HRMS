import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { activeSupabase } from "../integrations/supabase/client";

export type SessionPayload = {
  userId: string;
  email: string;
  role: string;
  tenantId?: string | null;
};

interface AuthContextType {
  user: any | null;
  role: string | null;
  tenantId: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSession = async () => {
    try {
      const { data: { session } } = await activeSupabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        // Metadata is where we store roles/tenantId in Supabase JWT / mock session
        setRole(session.user.user_metadata?.role || "STANDARD_EMPLOYEE");
        setTenantId(session.user.user_metadata?.tenant_id || null);
      } else {
        setUser(null);
        setRole(null);
        setTenantId(null);
      }
    } catch (err) {
      console.error("Failed to load auth session:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSession();

    const { data: { subscription } } = activeSupabase.auth.onAuthStateChange(
      async (_event: string, session: any) => {
        if (session?.user) {
          setUser(session.user);
          setRole(session.user.user_metadata?.role || "STANDARD_EMPLOYEE");
          setTenantId(session.user.user_metadata?.tenant_id || null);
        } else {
          setUser(null);
          setRole(null);
          setTenantId(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { data, error } = await activeSupabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      return { error };
    }
    if (data?.user) {
      setUser(data.user);
      setRole(data.user.user_metadata?.role || "STANDARD_EMPLOYEE");
      setTenantId(data.user.user_metadata?.tenant_id || null);
    }
    setLoading(false);
    return { error: null };
  };

  const signOut = async () => {
    setLoading(true);
    await activeSupabase.auth.signOut();
    setUser(null);
    setRole(null);
    setTenantId(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, role, tenantId, loading, signIn, signOut, refresh: loadSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Emulate verifying session on client side for easy route guarding
export async function verifySession(): Promise<SessionPayload | null> {
  const token = localStorage.getItem("worksphere_session");
  if (!token) return null;
  try {
    const session = JSON.parse(token);
    if (!session?.user) return null;
    return {
      userId: session.user.id,
      email: session.user.email,
      role: session.user.user_metadata?.role,
      tenantId: session.user.user_metadata?.tenant_id
    };
  } catch {
    return null;
  }
}
