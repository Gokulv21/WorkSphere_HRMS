// Client-side LocalStorage DB Engine for mock/fallback mode
import { verifySession } from "./auth";

const SEED_DATA = {
  tenants: [
    {
      id: "tenant-1",
      legalName: "WorkSphere Enterprise Ltd",
      displayName: "WorkSphere Enterprise",
      slug: "worksphere",
      planCode: "ENTERPRISE",
      status: "ACTIVE",
      createdAt: new Date("2026-06-01").toISOString(),
      updatedAt: new Date("2026-06-01").toISOString(),
    }
  ],
  users: [
    {
      id: "super-admin-id",
      email: "gokie210402@gmail.com",
      password: "Gokulman@21", // In mock mode, we do raw string matches for simplicity
      role: "SUPER_ADMIN",
      tenantId: null,
      createdAt: new Date("2026-06-01").toISOString(),
      updatedAt: new Date("2026-06-01").toISOString(),
    },
    {
      id: "owner-id",
      email: "admin@example.com",
      password: "ChangeMe123!",
      role: "COMPANY_OWNER",
      tenantId: "tenant-1",
      createdAt: new Date("2026-06-02").toISOString(),
      updatedAt: new Date("2026-06-02").toISOString(),
    },
    {
      id: "employee-1-id",
      email: "john.doe@worksphere.com",
      password: "Password123!",
      role: "STANDARD_EMPLOYEE",
      tenantId: "tenant-1",
      createdAt: new Date("2026-06-03").toISOString(),
      updatedAt: new Date("2026-06-03").toISOString(),
    }
  ],
  employees: [
    {
      id: "employee-owner-profile-id",
      tenantId: "tenant-1",
      employeeNumber: "EMP-001",
      firstName: "Super",
      lastName: "Owner",
      workEmail: "admin@example.com",
      department: "Management",
      jobTitle: "Founder & CEO",
      joiningDate: new Date("2026-06-02").toISOString(),
      status: "ACTIVE",
      userId: "owner-id",
      createdAt: new Date("2026-06-02").toISOString(),
      updatedAt: new Date("2026-06-02").toISOString(),
    },
    {
      id: "employee-1-profile-id",
      tenantId: "tenant-1",
      employeeNumber: "EMP-002",
      firstName: "John",
      lastName: "Doe",
      workEmail: "john.doe@worksphere.com",
      department: "Engineering",
      jobTitle: "Software Engineer",
      joiningDate: new Date("2026-06-03").toISOString(),
      status: "ACTIVE",
      userId: "employee-1-id",
      createdAt: new Date("2026-06-03").toISOString(),
      updatedAt: new Date("2026-06-03").toISOString(),
    }
  ],
  attendance_records: [
    {
      id: "att-1",
      tenantId: "tenant-1",
      employeeId: "employee-1-profile-id",
      date: new Date("2026-06-11").toISOString(),
      checkIn: new Date("2026-06-11T09:00:00Z").toISOString(),
      checkOut: new Date("2026-06-11T17:30:00Z").toISOString(),
      status: "PRESENT",
      workHours: 8.5,
      idleHours: 0.0,
      locationIp: "127.0.0.1"
    }
  ],
  leave_types: [
    { id: "lt-1", tenantId: "tenant-1", code: "AL", name: "Annual Leave", daysAllowed: 18, carryForward: true },
    { id: "lt-2", tenantId: "tenant-1", code: "SL", name: "Sick Leave", daysAllowed: 12, carryForward: false }
  ],
  leave_balances: [
    { id: "lb-1", tenantId: "tenant-1", employeeId: "employee-1-profile-id", leaveTypeId: "lt-1", year: 2026, totalAllocated: 18, used: 2, pendingApproval: 1 },
    { id: "lb-2", tenantId: "tenant-1", employeeId: "employee-1-profile-id", leaveTypeId: "lt-2", year: 2026, totalAllocated: 12, used: 0, pendingApproval: 0 }
  ],
  leave_requests: [
    {
      id: "lr-1",
      tenantId: "tenant-1",
      employeeId: "employee-1-profile-id",
      leaveTypeId: "lt-1",
      startDate: new Date("2026-06-15").toISOString(),
      endDate: new Date("2026-06-17").toISOString(),
      daysRequested: 3,
      reason: "Family trip",
      status: "PENDING",
      createdAt: new Date("2026-06-10").toISOString(),
    }
  ],
  claims: [
    {
      id: "claim-1",
      tenantId: "tenant-1",
      employeeId: "employee-1-profile-id",
      title: "Client Dinner Reimbursement",
      description: "Business dinner with Acme clients",
      totalAmount: 120.50,
      currency: "USD",
      status: "PENDING",
      submittedAt: new Date("2026-06-10").toISOString()
    }
  ],
  claim_items: [
    {
      id: "ci-1",
      claimId: "claim-1",
      date: new Date("2026-06-09").toISOString(),
      category: "Meals",
      amount: 120.50,
      description: "Steakhouse dinner"
    }
  ],
  tickets: [
    {
      id: "t-1",
      tenantId: "tenant-1",
      requesterId: "employee-1-profile-id",
      assigneeId: null,
      subject: "VPN credentials not working",
      category: "IT",
      priority: "HIGH",
      status: "OPEN",
      createdAt: new Date("2026-06-11").toISOString(),
      updatedAt: new Date("2026-06-11").toISOString(),
    }
  ],
  ticket_messages: [
    {
      id: "tm-1",
      ticketId: "t-1",
      senderId: "employee-1-id",
      content: "Hi IT team, I cannot log in using the standard credentials provided yesterday.",
      createdAt: new Date("2026-06-11").toISOString(),
    }
  ],
  compensations: [
    { id: "comp-1", employeeId: "employee-1-profile-id", baseSalary: 6500, currency: "USD", effectiveDate: new Date("2026-06-03").toISOString() }
  ],
  incentives: [],
  gift_cards: [],
  performance_reviews: [
    {
      id: "pr-1",
      employeeId: "employee-1-profile-id",
      reviewerId: "employee-owner-profile-id",
      reviewPeriod: "Q1 2026",
      rating: 5,
      comments: "Exceptional performance on migrating core systems to Vite!",
      reviewDate: new Date("2026-06-05").toISOString()
    }
  ],
  job_postings: [
    {
      id: "jp-1",
      tenantId: "tenant-1",
      title: "Senior React Engineer",
      description: "We are looking for a senior front-end engineer to lead Vite and React design systems.",
      department: "Engineering",
      location: "Remote",
      type: "FULL_TIME",
      status: "OPEN",
      createdAt: new Date("2026-06-01").toISOString()
    }
  ],
  candidates: [
    {
      id: "cand-1",
      tenantId: "tenant-1",
      firstName: "Jane",
      lastName: "Smith",
      email: "jane.smith@candidate.com",
      phone: "+1234567890",
      createdAt: new Date("2026-06-04").toISOString()
    }
  ],
  applications: [
    {
      id: "app-1",
      jobPostingId: "jp-1",
      candidateId: "cand-1",
      status: "IN_REVIEW",
      appliedAt: new Date("2026-06-04").toISOString()
    }
  ],
  notifications: [],
  audit_logs: []
};

// Initialize localStorage if empty
Object.entries(SEED_DATA).forEach(([table, data]) => {
  const key = `worksphere_db_${table}`;
  if (!localStorage.getItem(key)) {
    localStorage.setItem(key, JSON.stringify(data));
  }
});

export const mockDb = {
  read(table: string): any[] {
    const data = localStorage.getItem(`worksphere_db_${table}`);
    return data ? JSON.parse(data) : [];
  },

  write(table: string, data: any[]) {
    localStorage.setItem(`worksphere_db_${table}`, JSON.stringify(data));
  },

  getAll(table: string): any[] {
    return this.read(table);
  },

  getById(table: string, id: string): any | null {
    return this.read(table).find(item => item.id === id) || null;
  },

  insert(table: string, record: any): any {
    const list = this.read(table);
    const newRecord = {
      id: record.id || Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...record
    };
    list.push(newRecord);
    this.write(table, list);
    return newRecord;
  },

  update(table: string, id: string, updates: any): any {
    const list = this.read(table);
    const idx = list.findIndex(item => item.id === id);
    if (idx === -1) throw new Error(`Record with id ${id} not found in table ${table}`);
    
    const updated = {
      ...list[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    list[idx] = updated;
    this.write(table, list);
    return updated;
  },

  delete(table: string, id: string): boolean {
    const list = this.read(table);
    const filtered = list.filter(item => item.id !== id);
    if (filtered.length === list.length) return false;
    this.write(table, filtered);
    return true;
  }
};
