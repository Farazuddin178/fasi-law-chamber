/**
 * Centralized Database Connection & Operations
 * All database-related code for Supabase is maintained in this file
 */

import { supabase, Case, Task, User, TaskComment, Document, Expense, LoginLog, Court, TrackedCase, CaseEventRecord } from './supabase';
import toast from 'react-hot-toast';

// ============================================================================
// CASES OPERATIONS
// ============================================================================

export const casesDB = {
  // Get all cases
  async getAll() {
    try {
      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error: any) {
      return { data: [], error: error.message };
    }
  },

  // Get case by ID
  async getById(id: string) {
    try {
      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },

  // Check if case exists
  async exists(caseNumber: string) {
    try {
      const { data, error } = await supabase
        .from('cases')
        .select('id')
        .eq('case_number', caseNumber.trim())
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return { exists: !!data, error: null };
    } catch (error: any) {
      return { exists: false, error: error.message };
    }
  },

  // Get case by FLC Number
  async getByFlcNumber(flcNumber: string) {
    try {
      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .eq('flc_number', flcNumber.trim())
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return { data: data || null, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },

  // Create case
  async create(caseData: Partial<Case>, userId: string) {
    try {
      const { data, error } = await supabase
        .from('cases')
        .insert([
          {
            ...caseData,
            created_by: userId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },

  // Update case
  async update(id: string, caseData: Partial<Case>) {
    try {
      const { data, error } = await supabase
        .from('cases')
        .update({
          ...caseData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },

  // Delete case
  async delete(id: string) {
    try {
      const { error } = await supabase.from('cases').delete().eq('id', id);
      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  },

  // Filter cases by status
  async filterByStatus(status: string) {
    try {
      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error: any) {
      return { data: [], error: error.message };
    }
  },

  // Search cases
  async search(searchTerm: string) {
    try {
      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .or(
          `case_number.ilike.%${searchTerm}%,primary_petitioner.ilike.%${searchTerm}%,primary_respondent.ilike.%${searchTerm}%,cnr.ilike.%${searchTerm}%,flc_number.ilike.%${searchTerm}%`
        )
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error: any) {
      return { data: [], error: error.message };
    }
  },
};

// ============================================================================
// TASKS OPERATIONS
// ============================================================================

export const tasksDB = {
  // Get all tasks
  async getAll() {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error: any) {
      return { data: [], error: error.message };
    }
  },

  // Get task by ID
  async getById(id: string) {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },

  // Create task
  async create(taskData: Partial<Task>, userId: string) {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([
          {
            ...taskData,
            created_by: userId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },

  // Update task
  async update(id: string, taskData: Partial<Task>) {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update({
          ...taskData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },

  // Delete task
  async delete(id: string) {
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  },

  // Search tasks
  async search(searchTerm: string) {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .or(
          `title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`
        )
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error: any) {
      return { data: [], error: error.message };
    }
  },

  // Get tasks by status
  async getByStatus(status: string) {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error: any) {
      return { data: [], error: error.message };
    }
  },

  // Get tasks assigned to user
  async getAssignedTo(userId: string) {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('assigned_to', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error: any) {
      return { data: [], error: error.message };
    }
  },

  // Create task response (accept/pass-on)
  async createTaskResponse(
    taskId: string,
    userId: string,
    status: 'accepted' | 'passed_on',
    reason?: string
  ) {
    // task_responses table removed; perform direct task update instead
    return { data: null, error: 'task_responses table removed; use tasks.status update' };
  },

  // Get task responses
  async getTaskResponses(taskId: string) {
    // task_responses table removed; no responses to fetch
    return { data: [], error: null };
  },
};

// ============================================================================
// TASK COMMENTS OPERATIONS
// ============================================================================

export const taskCommentsDB = {
  // Get comments for task
  async getByTaskId(taskId: string) {
    try {
      const { data, error } = await supabase
        .from('task_comments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error: any) {
      return { data: [], error: error.message };
    }
  },

  // Create comment
  async create(taskId: string, userId: string, comment: string) {
    try {
      const { data, error } = await supabase
        .from('task_comments')
        .insert([
          {
            task_id: taskId,
            user_id: userId,
            comment,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },

  // Delete comment
  async delete(id: string) {
    try {
      const { error } = await supabase.from('task_comments').delete().eq('id', id);
      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  },
};

// ============================================================================
// ANNOUNCEMENTS OPERATIONS
// ============================================================================

export const announcementsDB = {
  // Get all announcements
  async getAll() {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error: any) {
      return { data: [], error: error.message };
    }
  },

  // Create announcement
  async create(
    title: string,
    content: string,
    visibleTo: 'all_users' | 'restricted_admins_only',
    createdBy: string
  ) {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .insert([
          {
            title,
            content,
            visible_to: visibleTo,
            created_by: createdBy,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },

  // Delete announcement
  async delete(id: string) {
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  },

  // Get announcements for user based on role
  async getForUser(userRole: 'admin' | 'restricted_admin' | 'viewer') {
    try {
      let query = supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (userRole === 'viewer') {
        query = query.eq('visible_to', 'all_users');
      }
      // Admin and restricted_admin can see both

      const { data, error } = await query;

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error: any) {
      return { data: [], error: error.message };
    }
  },
};

// ============================================================================
// USERS OPERATIONS
// ============================================================================

export const usersDB = {
  // Get all users
  async getAll() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error: any) {
      return { data: [], error: error.message };
    }
  },

  // Get users by role
  async getByRole(role: string) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', role)
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error: any) {
      return { data: [], error: error.message };
    }
  },

  // Get restricted admins
  async getRestrictedAdmins() {
    return this.getByRole('restricted_admin');
  },
};

// ============================================================================
// DOCUMENTS OPERATIONS
// ============================================================================

export const documentsDB = {
  // Get documents for case
  async getByCaseId(caseId: string) {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error: any) {
      return { data: [], error: error.message };
    }
  },

  // Create document
  async create(documentData: Partial<Document>, userId: string) {
    try {
      const { data, error } = await supabase
        .from('documents')
        .insert([
          {
            ...documentData,
            uploaded_by: userId,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },

  // Delete document
  async delete(id: string) {
    try {
      const { error } = await supabase.from('documents').delete().eq('id', id);
      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  },
};

// ============================================================================
// EXPENSES OPERATIONS
// ============================================================================

export const expensesDB = {
  // Get all expenses
  async getAll() {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error: any) {
      return { data: [], error: error.message };
    }
  },

  // Create expense
  async create(expenseData: Partial<Expense>, userId: string) {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .insert([
          {
            ...expenseData,
            submitted_by: userId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },
};

// ============================================================================
// LOGIN LOGS OPERATIONS
// ============================================================================

export const loginLogsDB = {
  // Get all login logs
  async getAll() {
    try {
      const { data, error } = await supabase
        .from('login_logs')
        .select('*')
        .order('login_time', { ascending: false });

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error: any) {
      return { data: [], error: error.message };
    }
  },
};

// ============================================================================
// COURTS OPERATIONS (Supreme + High Courts)
// ============================================================================

export const courtsDB = {
  async getTopCourts() {
    try {
      const { data, error } = await supabase
        .from('courts')
        .select('*')
        .in('court_type', ['supreme_court', 'high_court'])
        .eq('is_active', true)
        .order('court_type', { ascending: true })
        .order('court_name', { ascending: true });

      if (error) throw error;
      return { data: (data as Court[]) || [], error: null };
    } catch (error: any) {
      return { data: [], error: error.message };
    }
  },

  async getById(id: string) {
    try {
      const { data, error } = await supabase
        .from('courts')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return { data: (data as Court) || null, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }
};

// ============================================================================
// TRACKED CASES (Supreme + High Courts only for now)
// ============================================================================

export const trackedCasesDB = {
  async listForUser(userId: string) {
    try {
      const { data, error } = await supabase
        .from('tracked_cases')
        .select('*, courts:court_id(*)')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return { data: (data as any[]) || [], error: null };
    } catch (error: any) {
      return { data: [], error: error.message };
    }
  },

  async create(payload: Partial<TrackedCase>, userId: string) {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('tracked_cases')
        .insert([
          {
            ...payload,
            user_id: userId,
            created_at: now,
            updated_at: now,
          },
        ])
        .select('*, courts:court_id(*)')
        .single();

      if (error) throw error;
      return { data: data as any, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },

  async update(id: string, payload: Partial<TrackedCase>) {
    try {
      const { data, error } = await supabase
        .from('tracked_cases')
        .update({
          ...payload,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*, courts:court_id(*)')
        .single();

      if (error) throw error;
      return { data: data as any, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },

  async delete(id: string) {
    try {
      const { error } = await supabase.from('tracked_cases').delete().eq('id', id);
      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  },
};

// ============================================================================
// CASE EVENTS (per tracked case)
// ============================================================================

export const caseEventsDB = {
  async getByTrackedCase(trackedCaseId: string) {
    try {
      const { data, error } = await supabase
        .from('case_events')
        .select('*')
        .eq('tracked_case_id', trackedCaseId)
        .order('event_date', { ascending: false });

      if (error) throw error;
      return { data: (data as CaseEventRecord[]) || [], error: null };
    } catch (error: any) {
      return { data: [], error: error.message };
    }
  },

  async addEvent(trackedCaseId: string, payload: Partial<CaseEventRecord>) {
    try {
      const { data, error } = await supabase
        .from('case_events')
        .insert([
          {
            ...payload,
            tracked_case_id: trackedCaseId,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return { data: data as CaseEventRecord, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },
};

// ============================================================================
// REALTIME SUBSCRIPTIONS
// ============================================================================

export const subscriptions = {
  // Subscribe to cases changes
  subscribeToCases(callback: () => void) {
    const channel = supabase
      .channel('cases_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cases' },
        () => callback()
      )
      .subscribe();
    return channel;
  },

  // Subscribe to tasks changes
  subscribeToTasks(callback: () => void) {
    const channel = supabase
      .channel('tasks_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        () => callback()
      )
      .subscribe();
    return channel;
  },

  // Subscribe to announcements
  subscribeToAnnouncements(callback: () => void) {
    const channel = supabase
      .channel('announcements_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'announcements' },
        () => callback()
      )
      .subscribe();
    return channel;
  },

  // Unsubscribe from channel
  unsubscribe(channel: any) {
    return supabase.removeChannel(channel);
  },
};
