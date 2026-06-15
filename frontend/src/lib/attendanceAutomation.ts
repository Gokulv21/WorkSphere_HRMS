import { activeSupabase } from "../integrations/supabase/client";

// MOCKED OFFICE IP RANGE FOR VERIFICATION
const OFFICE_IPS = ["122.160.10.15", "192.168.1.1", "127.0.0.1", "::1"];

export async function checkIPAndNetworkStatus(): Promise<{ ip: string; isOfficeNetwork: boolean }> {
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const data = await res.json();
    const userIp = data.ip || "127.0.0.1";
    
    // Check if user IP matches office IP ranges
    const isOfficeNetwork = OFFICE_IPS.includes(userIp);
    return { ip: userIp, isOfficeNetwork };
  } catch (err) {
    // If offline or fetch fails, assume local developer ip
    return { ip: "127.0.0.1", isOfficeNetwork: true };
  }
}

export async function runDailyAttendanceCheck(tenantId: string) {
  if (!tenantId) return;

  try {
    const today = new Date();
    const currentHour = today.getHours();
    
    // Auto-absent cut-off is 11:00 AM
    if (currentHour < 11) {
      console.log("[AttendanceAutomation] Before 11:00 AM. Skipping auto-absent scanning.");
      return;
    }

    console.log("[AttendanceAutomation] Running daily auto-absent scan for tenant:", tenantId);

    // 1. Get all active employees
    const { data: employees } = await activeSupabase
      .from("employees")
      .eq("tenant_id", tenantId)
      .eq("status", "ACTIVE");

    if (!employees || employees.length === 0) return;

    // 2. Fetch today's attendance logs
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const { data: todayRecords } = await activeSupabase
      .from("attendance_records")
      .eq("tenant_id", tenantId);

    // Filter today's records client side for ease of date comparisons
    const activeEmployeeIdsWithRecords = new Set(
      (todayRecords || [])
        .filter((rec: any) => new Date(rec.date) >= startOfToday)
        .map((rec: any) => rec.employeeId)
    );

    // 3. Fetch approved leaves for today
    const { data: leaves } = await activeSupabase
      .from("leave_requests")
      .eq("tenant_id", tenantId)
      .eq("status", "APPROVED");

    const employeesOnLeaveToday = new Set(
      (leaves || [])
        .filter((req: any) => {
          const start = new Date(req.startDate);
          const end = new Date(req.endDate);
          return today >= start && today <= end;
        })
        .map((req: any) => req.employeeId)
    );

    // 4. Mark un-logged employees as ABSENT
    const absentInserts = employees
      .filter((emp: any) => {
        // Skip if they already checked-in or if they have an approved leave request
        return !activeEmployeeIdsWithRecords.has(emp.id) && !employeesOnLeaveToday.has(emp.id);
      })
      .map(async (emp: any) => {
        console.log(`[AttendanceAutomation] Auto-marking absent employee: ${emp.firstName} ${emp.lastName}`);
        return await activeSupabase.from("attendance_records").insert({
          tenantId,
          employeeId: emp.id,
          date: startOfToday.toISOString(),
          status: "ABSENT"
        });
      });

    await Promise.all(absentInserts);
    console.log("[AttendanceAutomation] Daily attendance check completed.");
  } catch (err) {
    console.error("[AttendanceAutomation] Error during attendance check:", err);
  }
}
