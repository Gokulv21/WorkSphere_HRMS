// Client-side LocalStorage DB Engine for mock/fallback mode
import { verifySession } from "./auth";

const SEED_DATA = {
  tenants: [],
  users: [
    {
      id: "super-admin-id",
      email: "superadmin@worksphere.com",
      password: "super", // Hardcoded Super Admin Credential
      role: "SUPER_ADMIN",
      tenantId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ],
  employees: [],
  attendance_records: [],
  leave_types: [],
  leave_balances: [],
  leave_requests: [],
  claims: [],
  claim_items: [],
  tickets: [],
  ticket_messages: [],
  compensations: [],
  incentives: [],
  gift_cards: [],
  performance_reviews: [],
  job_postings: [],
  candidates: [],
  applications: [],
  notifications: [],
  audit_logs: []
};

// Use a new prefix v3 to force a clean database reset for the user
const DB_PREFIX = "worksphere_db_v3_";

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
