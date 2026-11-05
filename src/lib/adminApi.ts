import { supabase } from "@/integrations/supabase/client";

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-api`;
const DEFAULT_CACHE_TTL_MS = 30_000;

type AdminFetchOptions = {
  cache?: boolean;
  force?: boolean;
  ttlMs?: number;
};

const responseCache = new Map<string, { expiresAt: number; data: any }>();
const inFlightRequests = new Map<string, Promise<any>>();

const buildCacheKey = (action: string, params: Record<string, any>) =>
  `${action}:${JSON.stringify(params)}`;

const clearAdminCache = () => {
  responseCache.clear();
  inFlightRequests.clear();
};

async function adminFetch(action: string, params: Record<string, any> = {}, options: AdminFetchOptions = {}) {
  const { cache = false, force = false, ttlMs = DEFAULT_CACHE_TTL_MS } = options;
  const cacheKey = buildCacheKey(action, params);

  if (cache && !force) {
    const existing = responseCache.get(cacheKey);
    if (existing && existing.expiresAt > Date.now()) return existing.data;

    const inFlight = inFlightRequests.get(cacheKey);
    if (inFlight) return inFlight;
  }

  const requestPromise = (async () => {
    let {
      data: { session },
    } = await supabase.auth.getSession();

    // If session is missing or expired, try to refresh before failing
    const isExpired = session?.expires_at ? session.expires_at * 1000 < Date.now() + 5000 : false;
    if (!session || isExpired) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      session = refreshed.session ?? session;
    }

    if (!session) {
      throw new Error("Your session expired. Please refresh the page and sign in again.");
    }

    const res = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action, ...params }),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Request failed");

    if (cache) {
      responseCache.set(cacheKey, {
        data: json,
        expiresAt: Date.now() + ttlMs,
      });
    }

    return json;
  })();

  if (cache) inFlightRequests.set(cacheKey, requestPromise);

  try {
    return await requestPromise;
  } finally {
    if (cache) inFlightRequests.delete(cacheKey);
  }
}

const withCacheInvalidation = async <T>(fn: () => Promise<T>) => {
  const result = await fn();
  clearAdminCache();
  return result;
};

export const adminApi = {
  prefetchModuleData: async (moduleId: string) => {
    switch (moduleId) {
      case "waitlist":
        await adminFetch("get_waitlist", {}, { cache: true, ttlMs: 60_000 });
        break;
      case "tickets":
        await adminFetch("get_support_tickets", {}, { cache: true, ttlMs: 10_000 });
        break;
      case "users":
        await adminFetch("get_users", {}, { cache: true, ttlMs: 30_000 });
        break;
      case "knowledge":
        await adminFetch("get_knowledge", {}, { cache: true, ttlMs: 30_000 });
        break;
      case "tasks":
        await adminFetch("get_boards", {}, { cache: true, ttlMs: 30_000 });
        break;
      default:
        break;
    }
  },
  getWaitlist: () => adminFetch("get_waitlist", {}, { cache: true, ttlMs: 60_000 }),
  getSupportTickets: () => adminFetch("get_support_tickets", {}, { cache: true, ttlMs: 10_000 }),
  updateTicketStatus: (ticket_id: string, status: string) =>
    withCacheInvalidation(() => adminFetch("update_ticket_status", { ticket_id, status })),
  getUsers: () => adminFetch("get_users", {}, { cache: true, ttlMs: 30_000 }),
  getDownloadTracker: () => adminFetch("get_download_tracker", {}, { cache: false }),
  createUser: (email: string, password: string, role?: string, module_permissions?: Array<{module_name: string; access_level: string}>, first_name?: string, last_name?: string) =>
    withCacheInvalidation(() => adminFetch("create_user", { email, password, role, module_permissions, first_name, last_name })),
  updateUser: (user_id: string, updates: { first_name?: string; last_name?: string; email?: string; phone?: string }) =>
    withCacheInvalidation(() => adminFetch("update_user", { user_id, ...updates })),
  deleteUser: (user_id: string) => withCacheInvalidation(() => adminFetch("delete_user", { user_id })),
  getArchivedUsers: () => adminFetch("get_archived_users", {}, { cache: true, ttlMs: 30_000 }),
  restoreUser: (archive_id: string) => withCacheInvalidation(() => adminFetch("restore_user", { archive_id })),
  permanentlyDeleteArchived: (archive_id: string) => withCacheInvalidation(() => adminFetch("permanently_delete_archived", { archive_id })),
  updateUserRole: (user_id: string, role: string, remove?: boolean) =>
    withCacheInvalidation(() => adminFetch("update_user_role", { user_id, role, remove })),
  updateModulePermissions: (user_id: string, module_permissions: Array<{module_name: string; access_level: string}>) =>
    withCacheInvalidation(() => adminFetch("update_module_permissions", { user_id, module_permissions })),
  changePassword: (new_password: string) =>
    withCacheInvalidation(() => adminFetch("change_password", { new_password })),
  getMyPermissions: () => adminFetch("get_my_permissions", {}, { cache: true, ttlMs: 60_000 }),
  getKnowledge: () => adminFetch("get_knowledge", {}, { cache: true, ttlMs: 30_000 }),
  createKnowledge: (title: string, category: string, content: string, extras?: { links?: string[]; attachments?: { name: string; url: string }[] }) =>
    withCacheInvalidation(() => adminFetch("create_knowledge", { title, category, content, links: extras?.links ?? [], attachments: extras?.attachments ?? [] })),
  updateKnowledge: (article_id: string, updates: Record<string, any>) =>
    withCacheInvalidation(() => adminFetch("update_knowledge", { article_id, ...updates })),
  deleteKnowledge: (article_id: string) =>
    withCacheInvalidation(() => adminFetch("delete_knowledge", { article_id })),
  // Boards
  getBoards: () => adminFetch("get_boards", {}, { cache: true, ttlMs: 30_000 }),
  createBoard: (name: string, description?: string, department?: string) =>
    withCacheInvalidation(() => adminFetch("create_board", { name, description, department })),
  updateBoard: (board_id: string, updates: Record<string, any>) =>
    withCacheInvalidation(() => adminFetch("update_board", { board_id, ...updates })),
  deleteBoard: (board_id: string) => withCacheInvalidation(() => adminFetch("delete_board", { board_id })),
  // Tasks
  getTasks: (board_id: string) => adminFetch("get_tasks", { board_id }, { cache: true, ttlMs: 20_000 }),
  getMyTasks: () => adminFetch("get_my_tasks", {}, { cache: true, ttlMs: 15_000 }),
  getMyInbox: () => adminFetch("get_my_inbox", {}, { cache: true, ttlMs: 10_000 }),
  markInboxSeen: () => withCacheInvalidation(() => adminFetch("mark_inbox_seen", {})),
  markInboxItemRead: (item_key: string) =>
    withCacheInvalidation(() => adminFetch("mark_inbox_item_read", { item_key })),
  createTask: (board_id: string, title: string, opts?: { description?: string; status?: string; priority?: string; assigned_to?: string; assigned_to_user_id?: string; due_date?: string; department?: string }) =>
    withCacheInvalidation(() => adminFetch("create_task", { board_id, title, ...opts })),
  updateTask: (task_id: string, updates: Record<string, any>) =>
    withCacheInvalidation(() => adminFetch("update_task", { task_id, ...updates })),
  deleteTask: (task_id: string) => withCacheInvalidation(() => adminFetch("delete_task", { task_id })),
  // Attachments
  addAttachment: (task_id: string, name: string, type: string, url: string) =>
    withCacheInvalidation(() => adminFetch("add_attachment", { task_id, name, type, url })),
  deleteAttachment: (attachment_id: string) =>
    withCacheInvalidation(() => adminFetch("delete_attachment", { attachment_id })),
  getUploadUrl: (file_name: string) =>
    adminFetch("get_upload_url", { file_name }),
  staffReply: (ticket_id: string, content: string, staff_name: string, attachments?: Array<{ type: string; name: string; url: string }>) =>
    withCacheInvalidation(() => adminFetch("staff_reply", { ticket_id, content, staff_name, attachments: attachments || [] })),
  sendCredentials: (email: string, temp_password: string, login_url: string, phone?: string) =>
    adminFetch("send_credentials", { email, temp_password, login_url, phone }),
  resendCredentials: (user_id: string, channels: Array<"email" | "sms">, login_url?: string) =>
    adminFetch("resend_credentials", { user_id, channels, login_url }),
  getTicketChat: (email: string) =>
    adminFetch("get_ticket_chat", { email }, { cache: true, ttlMs: 4_000 }),
  toggleAi: (session_id: string, enabled: boolean) =>
    withCacheInvalidation(() => adminFetch("toggle_ai", { session_id, enabled })),
  // OKR
  getOkrObjectives: (department?: string) => adminFetch("get_okr_objectives", { department }, { cache: true, ttlMs: 20_000 }),
  createOkrObjective: (title: string, opts?: { description?: string; department?: string; time_period?: string }) =>
    withCacheInvalidation(() => adminFetch("create_okr_objective", { title, ...opts })),
  updateOkrObjective: (objective_id: string, updates: Record<string, any>) =>
    withCacheInvalidation(() => adminFetch("update_okr_objective", { objective_id, ...updates })),
  deleteOkrObjective: (objective_id: string) =>
    withCacheInvalidation(() => adminFetch("delete_okr_objective", { objective_id })),
  getOkrKeyResults: (objective_id: string) => adminFetch("get_okr_key_results", { objective_id }, { cache: true, ttlMs: 15_000 }),
  createOkrKeyResult: (objective_id: string, title: string, opts?: { description?: string; target_value?: number; unit?: string; assigned_to?: string; assignees?: string[] }) =>
    withCacheInvalidation(() => adminFetch("create_okr_key_result", { objective_id, title, ...opts })),
  updateOkrKeyResult: (key_result_id: string, updates: Record<string, any>) =>
    withCacheInvalidation(() => adminFetch("update_okr_key_result", { key_result_id, ...updates })),
  deleteOkrKeyResult: (key_result_id: string) =>
    withCacheInvalidation(() => adminFetch("delete_okr_key_result", { key_result_id })),
  getOkrTasks: (key_result_id: string) => adminFetch("get_okr_tasks", { key_result_id }, { cache: true, ttlMs: 10_000 }),
  createOkrTask: (
    key_result_id: string,
    title: string,
    opts?: {
      description?: string; priority?: string;
      assigned_to?: string; assignees?: string[];
      due_date?: string; reminder_at?: string;
      reminder_frequency?: "daily" | "weekly" | "monthly" | null;
      notify_email?: boolean; notify_sms?: boolean;
      notes?: string;
      links?: string[];
      attachments?: Array<{ name: string; url: string; type?: string }>;
    },
  ) =>
    withCacheInvalidation(() => adminFetch("create_okr_task", { key_result_id, title, ...opts })),
  updateOkrTask: (task_id: string, updates: Record<string, any>) =>
    withCacheInvalidation(() => adminFetch("update_okr_task", { task_id, ...updates })),
  deleteOkrTask: (task_id: string) =>
    withCacheInvalidation(() => adminFetch("delete_okr_task", { task_id })),
  // Supervisors & assignment
  getSupervisors: () => adminFetch("get_supervisors", {}, { cache: true, ttlMs: 30_000 }),
  setSupervisor: (user_id: string, is_supervisor: boolean) =>
    withCacheInvalidation(() => adminFetch("set_supervisor", { user_id, is_supervisor })),
  assignTicket: (ticket_id: string, assignee_user_id: string, level: "supervisor" | "admin") =>
    withCacheInvalidation(() => adminFetch("assign_ticket", { ticket_id, assignee_user_id, level })),
  assignFaqQuestion: (question_id: string, assignee_user_id: string, level: "supervisor" | "admin") =>
    withCacheInvalidation(() => adminFetch("assign_faq_question", { question_id, assignee_user_id, level })),
};
