import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://hugtbhdqcxjumljglbnc.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1Z3RiaGRxY3hqdW1samdsYm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxMzg3NTcsImV4cCI6MjA3NzcxNDc1N30.sN-TU7CrcJ0Mej8oJcGhWcSyg31HWNqfREW_J1LRqr8";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database Types
export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: 'admin' | 'restricted_admin' | 'viewer';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Case {
  id: string;
  case_number?: string;
  flc_number?: string;
  sr_number?: string;
  cnr?: string;
  client_name?: string;
  referred_by?: string;
  referred_by_case_number?: string;
  district?: string;
  subject?: string;
  memo?: string;
  connected_case?: string;
  primary_petitioner?: string;
  primary_respondent?: string;
  petitioner_adv?: string;
  respondent_adv?: string;
  petitioners?: any[];
  respondents?: any[];
  category?: string;
  sub_category?: string;
  sub_sub_category?: string;
  purpose?: string;
  jud_name?: string;
  filing_date?: string;
  registration_date?: string;
  listing_date?: string;
  return_date?: string;
  disp_date?: string;
  disp_type?: string;
  prayer?: string;
  ia_details?: any[];
  ia_sr_details?: any[];
  usr_details?: any[];
  submission_dates?: any[];
  connected_matters?: any[];
  vakalath?: any[];
  lower_court_details?: any[];
  orders?: any[];
  other_documents?: any[];

  status: 'pending' | 'filed' | 'disposed' | 'closed';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  case_id?: string;
  title: string;
  description?: string;
  assigned_to?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'unaccepted';
  due_date?: string;
  decline_reason?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  comment: string;
  created_at: string;
}

export interface Document {
  id: string;
  case_id?: string;
  task_id?: string;
  file_name: string;
  file_path: string;
  file_size?: number;
  file_type?: string;
  category?: string;
  description?: string;
  uploaded_by: string;
  created_at: string;
}

export interface Expense {
  id: string;
  case_id?: string;
  amount: number;
  category: string;
  description?: string;
  expense_date: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_by: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface LoginLog {
  id: string;
  user_id: string;
  login_time: string;
  logout_time?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  visible_to: 'all_users' | 'restricted_admins_only';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TaskResponse {
  id: string;
  task_id: string;
  user_id: string;
  status: 'accepted' | 'passed_on';
  reason?: string;
  created_at: string;
  updated_at: string;
}

// Courts & tracked cases (Supreme Court + High Courts for now)
export interface Court {
  id: string;
  court_code: string;
  court_name: string;
  court_type: 'supreme_court' | 'high_court' | 'district_court';
  state?: string | null;
  website_url?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface TrackedCase {
  id: string;
  user_id: string;
  court_id: string;
  case_number: string;
  case_type?: string | null;
  case_year?: number | null;
  case_title?: string | null;
  petitioner_name?: string | null;
  respondent_name?: string | null;
  petitioner_advocate?: string | null;
  respondent_advocate?: string | null;
  filing_date?: string | null;
  registration_date?: string | null;
  first_hearing_date?: string | null;
  next_hearing_date?: string | null;
  case_status?: string | null;
  court_number?: string | null;
  judge_name?: string | null;
  bench_type?: string | null;
  case_url?: string | null;
  last_scraped_at?: string | null;
  scrape_status?: string | null;
  scrape_error?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CaseEventRecord {
  id: string;
  tracked_case_id: string;
  event_date?: string | null;
  event_type?: string | null;
  event_description?: string | null;
  judge_name?: string | null;
  next_date?: string | null;
  business_on_date?: string | null;
  document_url?: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'task' | 'announcement' | 'sitting_arrangement' | 'general';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  is_read: boolean;
  read_at?: string | null;
  related_id?: any;
  related_type?: string | null;
  metadata?: any;
  data?: any;
  created_at: string;
}
