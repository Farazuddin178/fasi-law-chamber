"""
Cron Job Service for scheduled tasks
Handles hearing reminders, notifications, etc.
"""
from datetime import datetime, timedelta
import logging
import os
import requests

logger = logging.getLogger(__name__)

# Try to import APScheduler
try:
    from apscheduler.schedulers.background import BackgroundScheduler
    from apscheduler.triggers.cron import CronTrigger
    SCHEDULER_AVAILABLE = True
except ImportError:
    SCHEDULER_AVAILABLE = False
    logger.warning("APScheduler not installed - cron jobs will be disabled")

try:
    from notification_service import notification_service
    from supabase_client import supabase_client
except ImportError as e:
    logger.warning(f"Failed to import notification dependencies: {e}")


class CronJobService:
    """Manages scheduled background tasks"""
    
    def __init__(self):
        if not SCHEDULER_AVAILABLE:
            logger.warning("Scheduler not available - cron jobs disabled")
            self.scheduler = None
            return
            
        try:
            self.scheduler = BackgroundScheduler()
            self.scheduler.start()
            logger.info("Cron job scheduler started")
        except Exception as e:
            logger.error(f"Failed to start scheduler: {e}")
            self.scheduler = None
    
    def start_all_jobs(self):
        """Start all scheduled jobs"""
        if not self.scheduler:
            logger.warning("Scheduler not available - cannot start jobs")
            return
            
        try:
            # Daily hearing reminders at 8:00 AM
            self.scheduler.add_job(
                self.send_daily_hearing_reminders,
                CronTrigger(hour=8, minute=0),
                id='daily_hearing_reminders',
                name='Daily Hearing Reminders',
                replace_existing=True
            )
            logger.info("Scheduled: Daily hearing reminders at 8:00 AM")
        except Exception as e:
            logger.error(f"Failed to schedule jobs: {e}")

        # Daily causelist save
        advocate_code = os.getenv('CAUSELIST_ADVOCATE_CODE', '').strip()
        save_hour = int(os.getenv('CAUSELIST_SAVE_HOUR', '6'))
        save_minute = int(os.getenv('CAUSELIST_SAVE_MINUTE', '0'))
        if advocate_code:
            try:
                self.scheduler.add_job(
                    self.save_daily_causelist,
                    CronTrigger(hour=save_hour, minute=save_minute),
                    id='daily_causelist_save',
                    name='Daily Causelist Save',
                    replace_existing=True
                )
                logger.info(f"Scheduled: Daily causelist save at {save_hour:02d}:{save_minute:02d}")
            except Exception as e:
                logger.error(f"Failed to schedule daily causelist save: {e}")
        else:
            logger.warning("CAUSELIST_ADVOCATE_CODE not set - daily causelist save disabled")
        
        # You can add more jobs here
        # Example: Weekly reports every Monday at 9 AM
        # self.scheduler.add_job(
        #     self.send_weekly_reports,
        #     CronTrigger(day_of_week='mon', hour=9, minute=0),
        #     id='weekly_reports'
        # )
    
    def send_daily_hearing_reminders(self):
        """
        Check for hearings tomorrow and send reminders
        Runs daily at 8:00 AM
        """
        try:
            logger.info("Running daily hearing reminder job...")
            
            # Get all hearings (cases listed) for tomorrow
            tomorrow_hearings = supabase_client.get_tomorrow_hearings()
            
            if not tomorrow_hearings:
                logger.info("No hearings tomorrow")
                return
            
            logger.info(f"Found {len(tomorrow_hearings)} hearings tomorrow")
            
            # Process each case
            for case in tomorrow_hearings:
                try:
                    case_id = case.get('id')
                    case_number = case.get('case_number', 'Unknown')
                    
                    # Prepare data for notification
                    case['hearing_date'] = case.get('listing_date')
                    # Ensure judge/court fields are present if available in case record
                    
                    # Get users assigned to this case
                    assignees = supabase_client.get_case_assignees(case_id)
                    
                    if not assignees:
                        logger.warning(f"No assignees found for case {case_number}")
                        continue
                    
                    # 1. Send External Reminders (Email/WhatsApp)
                    results = notification_service.send_hearing_reminder(case, assignees)
                    
                    # 2. Send In-App Reminders (Supabase)
                    for user in assignees:
                         supabase_client.create_notification(
                             user['id'],
                             f"⚖️ Hearing Reminder: {case_number}",
                             f"Case {case_number} is listed for tomorrow ({case.get('listing_date')}). Please prepare.",
                             'task',
                             'high'
                         )
                    
                    logger.info(f"Sent hearing reminders for case {case_number}: {len(results)} notifications")
                    
                except Exception as e:
                    logger.error(f"Failed to process hearing for case {case.get('id')}: {e}")
                    continue
            
        except Exception as e:
            logger.error(f"Daily hearing reminder job failed: {e}")

    def save_daily_causelist(self):
        """Fetch and save daily causelist to causelist_history"""
        try:
            if not supabase_client:
                logger.warning("Supabase client not available - cannot save causelist")
                return

            advocate_code = os.getenv('CAUSELIST_ADVOCATE_CODE', '').strip()
            if not advocate_code:
                logger.warning("CAUSELIST_ADVOCATE_CODE not set - skipping causelist save")
                return

            date_str = datetime.now().strftime('%d-%m-%Y')
            existing = supabase_client.get_causelist_history(advocate_code, date_str)
            if existing:
                logger.info("Causelist already saved for today")
                return

            base_url = os.getenv('APP_URL', 'http://127.0.0.1:10000').rstrip('/')
            api_url = f"{base_url}/getDailyCauselist?advocateCode={advocate_code}&listDate={date_str}"

            logger.info(f"Fetching causelist: {api_url}")
            response = requests.get(api_url, timeout=60, verify=False)
            response.raise_for_status()
            result = response.json()

            cases = result.get('cases', []) if isinstance(result, dict) else []
            payload = {
                'advocate_code': result.get('advocate_code', advocate_code) if isinstance(result, dict) else advocate_code,
                'date': result.get('date', date_str) if isinstance(result, dict) else date_str,
                'total_cases': result.get('count', len(cases)) if isinstance(result, dict) else len(cases),
                'cases': cases,
                'saved_at': datetime.now().isoformat(),
                'saved_by': 'cron'
            }

            if supabase_client.save_causelist_history(payload):
                logger.info("Daily causelist saved successfully")
            else:
                logger.error("Failed to save daily causelist")

        except Exception as e:
            logger.error(f"Daily causelist save failed: {e}")
    
    def stop(self):
        """Stop the scheduler"""
        if self.scheduler:
            self.scheduler.shutdown()
            logger.info("Cron job scheduler stopped")


# Singleton instance
cron_service = CronJobService()
