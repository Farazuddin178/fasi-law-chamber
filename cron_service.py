"""
Cron Job Service for scheduled tasks
Handles hearing reminders, notifications, etc.
"""
from datetime import datetime, timedelta
import logging

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
    
    def stop(self):
        """Stop the scheduler"""
        if self.scheduler:
            self.scheduler.shutdown()
            logger.info("Cron job scheduler stopped")


# Singleton instance
cron_service = CronJobService()
