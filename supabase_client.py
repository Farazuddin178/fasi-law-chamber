"""
Supabase Client for Python Backend
Handles database operations for notifications
"""
import os
from typing import Optional, Dict, List
import logging

logger = logging.getLogger(__name__)

# Try to import supabase
try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False
    logger.warning("Supabase package not installed")

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')


class SupabaseClient:
    """Wrapper for Supabase operations"""
    
    def __init__(self):
        if not SUPABASE_AVAILABLE:
            logger.error("Supabase package not available")
            self.client = None
            return
        
        try:
            self.client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
            logger.info("Supabase client initialized")
        except Exception as e:
            logger.error(f"Failed to initialize Supabase client: {e}")
            self.client = None
    
    def get_task(self, task_id: str) -> Optional[Dict]:
        """Get task by ID"""
        if not self.client:
            return None
        try:
            response = self.client.table('tasks').select('*').eq('id', task_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Failed to fetch task {task_id}: {e}")
            return None
    
    def get_case(self, case_id: str) -> Optional[Dict]:
        """Get case by ID"""
        if not self.client:
            return None
        try:
            response = self.client.table('cases').select('*').eq('id', case_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Failed to fetch case {case_id}: {e}")
            return None
    
    def get_user(self, user_id: str) -> Optional[Dict]:
        """Get user by ID"""
        if not self.client:
            return None
        try:
            response = self.client.table('users').select('*').eq('id', user_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Failed to fetch user {user_id}: {e}")
            return None
    
    def get_all_active_users(self) -> List[Dict]:
        """Get all active users"""
        if not self.client:
            return []
        try:
            logger.info("Fetching all active users from Supabase...")
            response = self.client.table('users').select('*').eq('is_active', True).execute()
            data = response.data if response.data else []
            
            # Fallback: If no users have 'is_active=true', fetch ALL users
            if len(data) == 0:
                logger.warning("No users found with is_active=True. Fetching ALL users as fallback.")
                response = self.client.table('users').select('*').execute()
                data = response.data if response.data else []
                
            logger.info(f"Found {len(data)} users for broadcast")
            return data
        except Exception as e:
            logger.error(f"Failed to fetch active users: {e}")
            return []
    
    def create_notification(self, user_id: str, title: str, message: str, type_val: str, priority: str = 'medium') -> bool:
        """Create in-app notification"""
        if not self.client:
            return False
        try:
            data = {
                'user_id': user_id,
                'title': title,
                'message': message,
                'type': type_val,
                'priority': priority,
                'is_read': False,
                'related_id': None,
                # 'created_at' is handled by default or we can pass 'now()'
            }
            self.client.table('notifications').insert(data).execute()
            return True
        except Exception as e:
            logger.error(f"Failed to create notification: {e}")
            return False

    def get_tomorrow_hearings(self) -> List[Dict]:
        """Get cases listed for tomorrow"""
        if not self.client:
            return []
        from datetime import date, timedelta
        try:
            tomorrow = (date.today() + timedelta(days=1)).isoformat()
            # Use 'cases' table and 'listing_date' column
            response = self.client.table('cases').select('*').eq('listing_date', tomorrow).execute()
            return response.data if response.data else []
        except Exception as e:
            logger.error(f"Failed to fetch tomorrow's hearings: {e}")
            return []
    
    def get_case_assignees(self, case_id: str) -> List[Dict]:
        """Get users assigned to a case (via tasks)"""
        if not self.client:
            return []
        try:
            # Get tasks for this case
            tasks_response = self.client.table('tasks').select('assigned_to').eq('case_id', case_id).execute()
            
            if not tasks_response.data:
                return []
            
            # Get unique user IDs
            user_ids = list(set([t['assigned_to'] for t in tasks_response.data if t.get('assigned_to')]))
            
            # Fetch user details
            users = []
            for user_id in user_ids:
                user = self.get_user(user_id)
                if user:
                    users.append(user)
            
            return users
        except Exception as e:
            logger.error(f"Failed to fetch case assignees: {e}")
            return []
    
    def create_audit_log(self, case_id: str, field: str, old_value: str, 
                         new_value: str, changed_by: str) -> bool:
        """Create an audit log entry"""
        if not self.client:
            return False
        try:
            self.client.table('audit_logs').insert({
                'case_id': case_id,
                'changed_field': field,
                'old_value': old_value,
                'new_value': new_value,
                'changed_by': changed_by,
                'timestamp': 'now()'
            }).execute()
            return True
        except Exception as e:
            logger.error(f"Failed to create audit log: {e}")
            return False
    
    def get_audit_logs(self, case_id: str) -> List[Dict]:
        """Get audit logs for a case"""
        if not self.client:
            return []
        try:
            response = self.client.table('audit_logs').select('*').eq('case_id', case_id).order('timestamp', desc=True).execute()
            return response.data if response.data else []
        except Exception as e:
            logger.error(f"Failed to fetch audit logs: {e}")
            return []


# Singleton instance
supabase_client = SupabaseClient()
