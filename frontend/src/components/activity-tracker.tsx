import { createContext, useContext, useEffect, useState, ReactNode, useRef } from "react";
import { useAuth } from "../lib/auth";
import { useNavigate } from "react-router-dom";

interface ActivityContextType {
  activeSeconds: number;
  idleSeconds: number;
  countdown: number;
}

const ActivityContext = createContext<ActivityContextType | undefined>(undefined);

export function ActivityProvider({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  const [activeSeconds, setActiveSeconds] = useState(0);
  const [idleSeconds, setIdleSeconds] = useState(0);
  const [countdown, setCountdown] = useState(600); // 10 minutes = 600 seconds
  
  const lastActivityRef = useRef<number>(Date.now());
  const activeSecondsRef = useRef(0);
  const idleSecondsRef = useRef(0);
  const activityKey = useRef("");

  useEffect(() => {
    if (!user?.id) return;
    
    // Set up unique key for today's activity tracking
    const todayStr = new Date().toISOString().split("T")[0];
    activityKey.current = `worksphere_activity_${user.id}_${todayStr}`;
    
    // Load existing activity counts
    const saved = localStorage.getItem(activityKey.current);
    if (saved) {
      const parsed = JSON.parse(saved);
      setActiveSeconds(parsed.activeSeconds || 0);
      setIdleSeconds(parsed.idleSeconds || 0);
      activeSecondsRef.current = parsed.activeSeconds || 0;
      idleSecondsRef.current = parsed.idleSeconds || 0;
    } else {
      setActiveSeconds(0);
      setIdleSeconds(0);
      activeSecondsRef.current = 0;
      idleSecondsRef.current = 0;
    }
    
    lastActivityRef.current = Date.now();
    setCountdown(600);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    // Monitor active events
    const resetTimer = () => {
      lastActivityRef.current = Date.now();
    };

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach(e => document.addEventListener(e, resetTimer));

    // Secondary interval running every second to count active/idle times
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsedSinceActivity = Math.max(0, Math.floor((now - lastActivityRef.current) / 1000));
      
      // Countdown for logout
      const currentCountdown = Math.max(0, 600 - elapsedSinceActivity);
      setCountdown(currentCountdown);

      if (currentCountdown <= 0) {
        clearInterval(interval);
        signOut().then(() => {
          navigate("/login");
          alert("Logged out due to 10 minutes of inactivity.");
        });
        return;
      }

      // Update active/idle counters
      // If user has been inactive for more than 60 seconds (1 minute), count as idle
      let isIdle = elapsedSinceActivity > 60;

      if (isIdle) {
        idleSecondsRef.current += 1;
        setIdleSeconds(idleSecondsRef.current);
      } else {
        activeSecondsRef.current += 1;
        setActiveSeconds(activeSecondsRef.current);
      }

      // Save counts periodically to localStorage
      if (activityKey.current) {
        localStorage.setItem(
          activityKey.current,
          JSON.stringify({
            activeSeconds: activeSecondsRef.current,
            idleSeconds: idleSecondsRef.current
          })
        );
      }
    }, 1000);

    return () => {
      events.forEach(e => document.removeEventListener(e, resetTimer));
      clearInterval(interval);
    };
  }, [user?.id, signOut, navigate]);

  return (
    <ActivityContext.Provider value={{ activeSeconds, idleSeconds, countdown }}>
      {children}
    </ActivityContext.Provider>
  );
}

export function useActivity() {
  const context = useContext(ActivityContext);
  if (context === undefined) {
    throw new Error("useActivity must be used within an ActivityProvider");
  }
  return context;
}
export { ActivityContext };
