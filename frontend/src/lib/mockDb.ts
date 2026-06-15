// Client-side LocalStorage DB Engine for mock/fallback mode
import { verifySession } from "./auth";

const SEED_DATA = {
  tenants: [
    {
      id: "tenant-1",
      legalName: "Acme Corporation",
      displayName: "Acme Corp",
      slug: "acme",
      planCode: "ENTERPRISE",
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ],
  users: [
    {
      id: "super-admin-id",
      email: "superadmin@worksphere.com",
      password: "super",
      role: "SUPER_ADMIN",
      tenantId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "owner-id",
      email: "owner@acme.com",
      password: "owner",
      role: "COMPANY_OWNER",
      tenantId: "tenant-1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "hr-id",
      email: "hr@acme.com",
      password: "hr",
      role: "HR_ADMIN",
      tenantId: "tenant-1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "dev-id",
      email: "dev@acme.com",
      password: "dev",
      role: "STANDARD_EMPLOYEE",
      tenantId: "tenant-1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ],
  employees: [
    {
      id: "employee-owner-profile-id",
      tenantId: "tenant-1",
      employeeNumber: "EMP-001",
      firstName: "Company",
      lastName: "Owner",
      workEmail: "owner@acme.com",
      department: "Management",
      jobTitle: "Founder & CEO",
      joiningDate: new Date().toISOString(),
      status: "ACTIVE",
      userId: "owner-id",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "employee-hr-profile-id",
      tenantId: "tenant-1",
      employeeNumber: "EMP-002",
      firstName: "Human",
      lastName: "Resources",
      workEmail: "hr@acme.com",
      department: "HR",
      jobTitle: "HR Manager",
      joiningDate: new Date().toISOString(),
      status: "ACTIVE",
      userId: "hr-id",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "employee-dev-profile-id",
      tenantId: "tenant-1",
      employeeNumber: "EMP-003",
      firstName: "Software",
      lastName: "Developer",
      workEmail: "dev@acme.com",
      department: "Engineering",
      jobTitle: "Senior Developer",
      joiningDate: new Date().toISOString(),
      status: "ACTIVE",
      userId: "dev-id",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ],
  attendance_records: [],
  leave_types: [
    { id: "lt-1", tenantId: "tenant-1", code: "AL", name: "Annual Leave", daysAllowed: 18, carryForward: true },
    { id: "lt-2", tenantId: "tenant-1", code: "SL", name: "Sick Leave", daysAllowed: 12, carryForward: false }
  ],
  leave_balances: [],
  leave_requests: [],
  claims: [],
  claim_items: [],
  tickets: [],
  ticket_messages: [],
  compensations: [
    { id: "comp-1", employeeId: "employee-dev-profile-id", baseSalary: 120000, currency: "USD", effectiveDate: new Date().toISOString() }
  ],
  incentives: [],
  gift_cards: [],
  performance_reviews: [],
  job_postings: [],
  candidates: [],
  applications: [],
  notifications: [],
  audit_logs: []
};

// Use a new prefix v2 to force a clean database reset for the user
const DB_PREFIX = "worksphere_db_v2_";

// Initialize localStorage if empty
Object.entries(SEED_DATA).forEach(([table, data]) => {
  const key = `${DB_PREFIX}${table}`;
  if (!localStorage.getItem(key)) {
    localStorage.setItem(key, JSON.stringify(data));
  }
});

export const mockDb = {
  read(table: string): any[] {
    const data = localStorage.getItem(`${DB_PREFIX}${table}`);
    return data ? JSON.parse(data) : [];
  },

  write(table: string, data: any[]) {
    localStorage.setItem(`${DB_PREFIX}${table}`, JSON.stringify(data));
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
