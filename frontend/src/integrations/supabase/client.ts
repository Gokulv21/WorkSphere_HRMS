import { createClient } from "@supabase/supabase-js";
import { mockDb } from "../../lib/mockDb";
import PocketBase from "pocketbase";

const VITE_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const VITE_SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const isConfigured =
  !!VITE_SUPABASE_URL &&
  !!VITE_SUPABASE_PUBLISHABLE_KEY &&
  !VITE_SUPABASE_URL.includes("your_project") &&
  !VITE_SUPABASE_PUBLISHABLE_KEY.includes("your_anon");

export const supabase = isConfigured
  ? createClient(VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY)
  : (null as any);

export const isMockMode = !isConfigured;

// Initialize PocketBase
export const pb = new PocketBase("http://127.0.0.1:8090");

class MockQueryBuilder {
  private table: string;
  private filters: Array<(item: any) => boolean> = [];
  private filterList: Array<{ col: string; val: any }> = [];
  private orderCol: string | null = null;
  private orderAscending = true;
  private selectCols = "*";
  private limitCount: number | null = null;

  constructor(table: string) {
    this.table = table;
  }

  select(cols = "*") {
    this.selectCols = cols;
    return this;
  }

  eq(col: string, val: any) {
    const camelCol = col.includes("_") ? col.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()) : col;
    this.filters.push((item) => item[camelCol] === val);
    
    this.filterList.push({ col, val });
    return this;
  }

  maybeSingle() {
    return this.execute("single");
  }

  single() {
    return this.execute("single");
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  order(col: string, { ascending = true } = {}) {
    this.orderCol = col.includes("_") ? col.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()) : col;
    this.orderAscending = ascending;
    return this;
  }

  async insert(record: any) {
    try {
      const records = Array.isArray(record) ? record : [record];
      const pbPromises = records.map(async (rec) => {
        const pbRecord: any = {};
        Object.entries(rec).forEach(([k, v]) => {
          const camelKey = k.includes("_") ? k.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()) : k;
          pbRecord[camelKey] = v;
        });
        return await pb.collection(this.table).create(pbRecord);
      });
      const data = await Promise.all(pbPromises);
      return { data: Array.isArray(record) ? data : data[0], error: null };
    } catch (pbErr) {
      console.warn(`[PocketBase] insert failed, falling back to LocalStorage:`, pbErr);
      try {
        const records = Array.isArray(record) ? record : [record];
        const inserted = records.map(rec => {
          const camelRecord: any = {};
          Object.entries(rec).forEach(([k, v]) => {
            const key = k.includes("_") ? k.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()) : k;
            camelRecord[key] = v;
          });
          return mockDb.insert(this.table, camelRecord);
        });
        return { data: Array.isArray(record) ? inserted : inserted[0], error: null };
      } catch (err: any) {
        return { data: null, error: err };
      }
    }
  }

  async update(updates: any) {
    try {
      const pbRecords = await this.queryPocketBase();
      const pbUpdatesPromises = pbRecords.map(async (item: any) => {
        const pbUpdates: any = {};
        Object.entries(updates).forEach(([k, v]) => {
          const key = k.includes("_") ? k.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()) : k;
          pbUpdates[key] = v;
        });
        return await pb.collection(this.table).update(item.id, pbUpdates);
      });
      const data = await Promise.all(pbUpdatesPromises);
      return { data, error: null };
    } catch (pbErr) {
      console.warn(`[PocketBase] update failed, falling back to LocalStorage:`, pbErr);
      try {
        const camelUpdates: any = {};
        Object.entries(updates).forEach(([k, v]) => {
          const key = k.includes("_") ? k.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()) : k;
          camelUpdates[key] = v;
        });

        const list = mockDb.getAll(this.table);
        const matching = list.filter(item => this.filters.every(fn => fn(item)));

        const updated = matching.map(item => mockDb.update(this.table, item.id, camelUpdates));
        return { data: updated, error: null };
      } catch (err: any) {
        return { data: null, error: err };
      }
    }
  }

  async delete() {
    try {
      const pbRecords = await this.queryPocketBase();
      const pbDeletePromises = pbRecords.map(async (item: any) => {
        await pb.collection(this.table).delete(item.id);
        return item;
      });
      const data = await Promise.all(pbDeletePromises);
      return { data, error: null };
    } catch (pbErr) {
      console.warn(`[PocketBase] delete failed, falling back to LocalStorage:`, pbErr);
      try {
        const list = mockDb.getAll(this.table);
        const matching = list.filter(item => this.filters.every(fn => fn(item)));
        matching.forEach(item => mockDb.delete(this.table, item.id));
        return { data: matching, error: null };
      } catch (err: any) {
        return { data: null, error: err };
      }
    }
  }

  private async queryPocketBase(): Promise<any[]> {
    let filterString = "";
    if (this.filterList.length > 0) {
      filterString = this.filterList
        .map(f => {
          const pbCol = f.col.includes("_") ? f.col.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()) : f.col;
          const valEscaped = typeof f.val === "string" ? `"${f.val.replace(/"/g, '\\"')}"` : f.val;
          return `${pbCol} = ${valEscaped}`;
        })
        .join(" && ");
    }

    const options: any = {};
    if (filterString) {
      options.filter = filterString;
    }
    if (this.orderCol) {
      options.sort = `${this.orderAscending ? "" : "-"}${this.orderCol}`;
    }
    if (this.limitCount !== null) {
      options.limit = this.limitCount;
    }

    const result = await pb.collection(this.table).getList(1, 100, options);
    return result.items || [];
  }

  async execute(type: "all" | "single" = "all") {
    try {
      let list = await this.queryPocketBase();

      if (this.selectCols.includes("employee") && this.table === "attendance_records") {
        list = await Promise.all(list.map(async item => {
          try {
            const emp = await pb.collection("employees").getOne(item.employeeId);
            return { ...item, employee: emp };
          } catch {
            return item;
          }
        }));
      }
      if (this.selectCols.includes("users") && this.table === "tenants") {
        list = await Promise.all(list.map(async item => {
          try {
            const usersList = await pb.collection("users").getList(1, 100, { filter: `tenantId = "${item.id}"` });
            return { ...item, users: usersList.items };
          } catch {
            return item;
          }
        }));
      }
      if (this.selectCols.includes("employee") && this.table === "leave_requests") {
        list = await Promise.all(list.map(async item => {
          try {
            const emp = await pb.collection("employees").getOne(item.employeeId);
            const lt = await pb.collection("leave_types").getOne(item.leaveTypeId);
            return { ...item, employee: emp, leaveType: lt };
          } catch {
            return item;
          }
        }));
      }

      if (type === "single") {
        return { data: list[0] || null, error: null };
      }
      return { data: list, error: null };
    } catch (pbErr) {
      console.warn(`[PocketBase] query failed for table ${this.table}, falling back to LocalStorage:`, pbErr);
      try {
        let list = mockDb.getAll(this.table);

        list = list.filter(item => this.filters.every(fn => fn(item)));

        if (this.orderCol) {
          list.sort((a, b) => {
            const valA = a[this.orderCol!];
            const valB = b[this.orderCol!];
            if (valA < valB) return this.orderAscending ? -1 : 1;
            if (valA > valB) return this.orderAscending ? 1 : -1;
            return 0;
          });
        }

        if (this.limitCount !== null) {
          list = list.slice(0, this.limitCount);
        }

        if (this.selectCols.includes("employee") && this.table === "attendance_records") {
          list = list.map(item => ({
            ...item,
            employee: mockDb.getById("employees", item.employeeId)
          }));
        }
        if (this.selectCols.includes("users") && this.table === "tenants") {
          list = list.map(item => ({
            ...item,
            users: mockDb.getAll("users").filter(u => u.tenantId === item.id)
          }));
        }
        if (this.selectCols.includes("employee") && this.table === "leave_requests") {
          list = list.map(item => ({
            ...item,
            employee: mockDb.getById("employees", item.employeeId),
            leaveType: mockDb.getById("leave_types", item.leaveTypeId)
          }));
        }

        if (type === "single") {
          return { data: list[0] || null, error: null };
        }
        return { data: list, error: null };
      } catch (err: any) {
        return { data: null, error: err };
      }
    }
  }

  then(onfulfilled: (value: any) => any) {
    return this.execute("all").then(onfulfilled);
  }
}

const mockSupabase = {
  from(table: string) {
    return new MockQueryBuilder(table);
  },
  auth: {
    async getSession() {
      if (pb.authStore.isValid && pb.authStore.model) {
        const session = {
          user: {
            id: pb.authStore.model.id,
            email: pb.authStore.model.email,
            user_metadata: {
              role: pb.authStore.model.role || "STANDARD_EMPLOYEE",
              tenant_id: pb.authStore.model.tenantId || null
            }
          },
          access_token: pb.authStore.token
        };
        return { data: { session }, error: null };
      }

      const token = localStorage.getItem("worksphere_session");
      if (token) {
        const session = JSON.parse(token);
        return { data: { session }, error: null };
      }
      return { data: { session: null }, error: null };
    },
    async signInWithPassword({ email, password }: any) {
      try {
        const authData = await pb.collection("users").authWithPassword(email, password);
        const session = {
          user: {
            id: authData.record.id,
            email: authData.record.email,
            user_metadata: {
              role: authData.record.role || "STANDARD_EMPLOYEE",
              tenant_id: authData.record.tenantId || null
            }
          },
          access_token: authData.token
        };
        localStorage.setItem("worksphere_session", JSON.stringify(session));
        return { data: session, error: null };
      } catch (pbErr) {
        console.warn("[PocketBase] signInWithPassword failed, falling back to LocalStorage:", pbErr);
        const users = mockDb.getAll("users");
        const user = users.find(u => u.email === email && u.password === password);
        if (user) {
          const session = {
            user: { id: user.id, email: user.email, user_metadata: { role: user.role, tenant_id: user.tenantId } },
            access_token: "mock-jwt-token"
          };
          localStorage.setItem("worksphere_session", JSON.stringify(session));
          return { data: session, error: null };
        }
        return { data: null, error: new Error("Invalid credentials") };
      }
    },
    async signOut() {
      pb.authStore.clear();
      localStorage.removeItem("worksphere_session");
      return { error: null };
    },
    onAuthStateChange(callback: any) {
      pb.authStore.onChange((token, model) => {
        if (model) {
          const session = {
            user: {
              id: model.id,
              email: model.email,
              user_metadata: {
                role: model.role || "STANDARD_EMPLOYEE",
                tenant_id: model.tenantId || null
              }
            },
            access_token: token
          };
          callback("SIGNED_IN", session);
        } else {
          callback("SIGNED_OUT", null);
        }
      });

      this.getSession().then(({ data: { session } }) => {
        callback("SIGNED_IN", session);
      });

      return { data: { subscription: { unsubscribe() { } } } };
    }
  }
};

export const activeSupabase = isConfigured ? supabase : mockSupabase;
export { mockSupabase };

