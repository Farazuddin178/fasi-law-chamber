"""
Notification Service for Case Management System
Handles WhatsApp, Email, and Push Notifications
"""
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Try to import Twilio
try:
    from twilio.rest import Client
    TWILIO_AVAILABLE = True
except ImportError:
    TWILIO_AVAILABLE = False
    logger.warning("Twilio not installed. WhatsApp notifications will be disabled.")

# ============================================================================
# CONFIGURATION - Set these in environment variables
# ============================================================================
TWILIO_ACCOUNT_SID = os.getenv('TWILIO_ACCOUNT_SID', '')
TWILIO_AUTH_TOKEN = os.getenv('TWILIO_AUTH_TOKEN', '')
TWILIO_WHATSAPP_NUMBER = os.getenv('TWILIO_WHATSAPP_NUMBER', 'whatsapp:+14155238886')

SMTP_HOST = os.getenv('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = int(os.getenv('SMTP_PORT', '587'))
SMTP_USER = os.getenv('SMTP_USER', '')
SMTP_PASSWORD = os.getenv('SMTP_PASSWORD', '')
ADMIN_EMAIL = os.getenv('ADMIN_EMAIL', 'admin@example.com')

APP_URL = os.getenv('APP_URL', 'http://localhost:5173')


class NotificationService:
    """Centralized notification service for WhatsApp, Email, and Push"""
    
    def __init__(self):
        # Initialize Twilio client if credentials are available
        self.twilio_enabled = False
        if TWILIO_AVAILABLE and TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
            try:
                self.twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
                self.twilio_enabled = True
                logger.info("Twilio client initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Twilio: {e}")
                self.twilio_enabled = False
        elif not TWILIO_AVAILABLE:
            logger.warning("Twilio package not installed - WhatsApp disabled")
        else:
            logger.warning("Twilio credentials not configured - WhatsApp disabled")
        
        # Check email configuration
        self.email_enabled = bool(SMTP_USER and SMTP_PASSWORD)
        if self.email_enabled:
            logger.info("Email service configured")
        else:
            logger.warning("Email service not configured - set SMTP credentials")
    
    def send_whatsapp(self, to_number: str, message: str) -> Dict:
        """
        Send WhatsApp message via Twilio
        
        Args:
            to_number: Recipient's WhatsApp number (with country code, e.g., +919876543210)
            message: Message content (max 1600 characters)
        
        Returns:
            Dict with success status and message ID or error
        """
        if not self.twilio_enabled:
            logger.warning("Twilio not configured - WhatsApp not sent")
            return {'success': False, 'error': 'Twilio not configured'}
        
        try:
            # Clean and format the phone number
            # Remove any existing whatsapp: prefix
            clean_number = to_number.replace('whatsapp:', '').strip()
            
            # Ensure it starts with +
            if not clean_number.startswith('+'):
                # If it's just the number without country code, add +91
                if len(clean_number) == 10:
                    clean_number = f'+91{clean_number}'
                else:
                    clean_number = f'+{clean_number}'
            
            # Add whatsapp: prefix
            formatted_number = f'whatsapp:{clean_number}'
            
            message_obj = self.twilio_client.messages.create(
                from_=TWILIO_WHATSAPP_NUMBER,
                body=message,
                to=formatted_number
            )
            
            logger.info(f"WhatsApp sent to {formatted_number}, SID: {message_obj.sid}")
            return {
                'success': True,
                'message_sid': message_obj.sid,
                'status': message_obj.status
            }
        except Exception as e:
            logger.error(f"WhatsApp send failed to {formatted_number if 'formatted_number' in locals() else to_number}: {e}")
            return {'success': False, 'error': str(e)}
    
    def send_email(self, to_email: str, subject: str, html_content: str, 
                   text_content: Optional[str] = None) -> Dict:
        """
        Send email via SMTP
        
        Args:
            to_email: Recipient's email address
            subject: Email subject
            html_content: HTML email body
            text_content: Plain text fallback (optional)
        
        Returns:
            Dict with success status or error
        """
        if not self.email_enabled:
            logger.warning("Email not configured - email not sent")
            return {'success': False, 'error': 'Email not configured'}
        
        try:
            msg = MIMEMultipart('alternative')
            msg['From'] = SMTP_USER
            msg['To'] = to_email
            msg['Subject'] = subject
            
            # Attach plain text and HTML
            if text_content:
                part1 = MIMEText(text_content, 'plain')
                msg.attach(part1)
            
            part2 = MIMEText(html_content, 'html')
            msg.attach(part2)
            
            # Send email
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
                server.starttls()
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.send_message(msg)
            
            logger.info(f"Email sent to {to_email}")
            return {'success': True}
        except Exception as e:
            logger.error(f"Email send failed to {to_email}: {e}")
            return {'success': False, 'error': str(e)}
    
    def send_task_assignment_notification(self, task_data: Dict, assignee: Dict, 
                                          assigner_name: str) -> Dict:
        """
        Send notification when a task is assigned
        
        Args:
            task_data: Task details (id, title, description, due_date, etc.)
            assignee: User details (email, phone, full_name)
            assigner_name: Name of person who assigned the task
        
        Returns:
            Dict with WhatsApp and Email send results
        """
        task_id = task_data.get('id', 'N/A')
        title = task_data.get('title', 'Untitled Task')
        description = task_data.get('description', '')
        due_date = task_data.get('due_date', 'Not specified')
        case_number = task_data.get('case_number', 'N/A')
        hearing_date = task_data.get('hearing_date', 'Not scheduled')
        priority = task_data.get('priority', 'medium').upper()
        
        # Format WhatsApp message
        whatsapp_msg = f"""🔔 *NEW TASK ASSIGNED*

*Task:* {title}
*Description:* {description}
*Due Date:* {due_date}
*Priority:* {priority}
*Assigned by:* {assigner_name}

📁 *Case:* {case_number}
⚖️ *Next Hearing:* {hearing_date}

View task: {APP_URL}/tasks/{task_id}

Please acknowledge receipt.
"""
        
        # Format HTML email
        email_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: #2563eb; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; background: #f9f9f9; }}
                .task-details {{ background: white; padding: 15px; border-left: 4px solid #2563eb; margin: 10px 0; }}
                .priority-{priority.lower()} {{ color: #dc2626; font-weight: bold; }}
                .button {{ display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
                .footer {{ text-align: center; color: #666; font-size: 12px; margin-top: 20px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>📋 New Task Assigned</h1>
                </div>
                <div class="content">
                    <p>Hi {assignee.get('full_name', 'there')},</p>
                    <p><strong>{assigner_name}</strong> has assigned you a new task:</p>
                    
                    <div class="task-details">
                        <h2>{title}</h2>
                        <p><strong>Description:</strong> {description}</p>
                        <p><strong>Due Date:</strong> {due_date}</p>
                        <p><strong>Priority:</strong> <span class="priority-{priority.lower()}">{priority}</span></p>
                        <hr>
                        <p><strong>Case Number:</strong> {case_number}</p>
                        <p><strong>Next Hearing:</strong> {hearing_date}</p>
                    </div>
                    
                    <a href="{APP_URL}/tasks/{task_id}" class="button">View Task Details</a>
                    
                    <p>Please review and acknowledge this task at your earliest convenience.</p>
                </div>
                <div class="footer">
                    <p>This is an automated notification from the Case Management System.</p>
                    <p>Do not reply to this email.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        results = {}
        
        # Send WhatsApp if phone number available
        if assignee.get('phone'):
            results['whatsapp'] = self.send_whatsapp(assignee['phone'], whatsapp_msg)
        else:
            results['whatsapp'] = {'success': False, 'error': 'No phone number'}
        
        # Send Email if email available
        if assignee.get('email'):
            results['email'] = self.send_email(
                assignee['email'],
                f"New Task Assigned: {title}",
                email_html
            )
        else:
            results['email'] = {'success': False, 'error': 'No email address'}
        
        return results
    
    def send_hearing_reminder(self, case_data: Dict, assignees: List[Dict]) -> List[Dict]:
        """
        Send hearing reminders to all assigned users
        
        Args:
            case_data: Case details (case_number, hearing_date, court, etc.)
            assignees: List of users to notify (email, phone, full_name)
        
        Returns:
            List of notification results for each assignee
        """
        case_number = case_data.get('case_number', 'N/A')
        hearing_date = case_data.get('hearing_date', 'Not specified')
        court = case_data.get('court', 'Not specified')
        case_id = case_data.get('id', '')
        judge_name = case_data.get('judge_name', 'Not specified')
        
        # Format WhatsApp message
        whatsapp_msg = f"""⚖️ *HEARING REMINDER*

*Case:* {case_number}
*Hearing Date:* {hearing_date} (TOMORROW)
*Court:* {court}
*Judge:* {judge_name}

🔔 *Action Required:*
• Review case files
• Prepare documents
• Check latest updates

View case: {APP_URL}/cases/{case_id}

Good luck!
"""
        
        # Format HTML email
        email_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: #dc2626; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; background: #f9f9f9; }}
                .hearing-box {{ background: white; padding: 20px; border-left: 4px solid #dc2626; margin: 10px 0; }}
                .urgent {{ background: #fef2f2; border: 2px solid #dc2626; padding: 15px; margin: 10px 0; }}
                .button {{ display: inline-block; padding: 12px 24px; background: #dc2626; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>⚖️ Hearing Reminder</h1>
                </div>
                <div class="content">
                    <div class="urgent">
                        <h2 style="color: #dc2626; margin-top: 0;">HEARING TOMORROW</h2>
                    </div>
                    
                    <div class="hearing-box">
                        <h3>Case: {case_number}</h3>
                        <p><strong>Hearing Date:</strong> {hearing_date}</p>
                        <p><strong>Court:</strong> {court}</p>
                        <p><strong>Judge:</strong> {judge_name}</p>
                    </div>
                    
                    <h3>Action Required:</h3>
                    <ul>
                        <li>Review case files and documents</li>
                        <li>Prepare necessary arguments</li>
                        <li>Check for any last-minute updates</li>
                        <li>Arrive at court on time</li>
                    </ul>
                    
                    <a href="{APP_URL}/cases/{case_id}" class="button">View Case Details</a>
                </div>
            </div>
        </body>
        </html>
        """
        
        results = []
        for assignee in assignees:
            result = {
                'user': assignee.get('full_name', 'Unknown'),
                'whatsapp': {'success': False},
                'email': {'success': False}
            }
            
            # Send WhatsApp
            if assignee.get('phone'):
                result['whatsapp'] = self.send_whatsapp(assignee['phone'], whatsapp_msg)
            
            # Send Email
            if assignee.get('email'):
                result['email'] = self.send_email(
                    assignee['email'],
                    f"🚨 Hearing Tomorrow: {case_number}",
                    email_html
                )
            
            results.append(result)
        
        return results
    
    def send_announcement_notification(self, announcement: Dict, recipients: List[Dict]) -> List[Dict]:
        """
        Send announcement notifications to specified users
        
        Args:
            announcement: Announcement details (title, content, created_by)
            recipients: List of users to notify
        
        Returns:
            List of notification results
        """
        title = announcement.get('title', 'Announcement')
        content = announcement.get('content', '')
        posted_by = announcement.get('posted_by', 'Admin')
        
        whatsapp_msg = f"""📢 *NEW ANNOUNCEMENT*

*{title}*

{content}

Posted by: {posted_by}
Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}

View in app: {APP_URL}/announcements
"""
        
        email_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: #f59e0b; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; background: #f9f9f9; }}
                .announcement-box {{ background: white; padding: 20px; border-left: 4px solid #f59e0b; margin: 10px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>📢 New Announcement</h1>
                </div>
                <div class="content">
                    <div class="announcement-box">
                        <h2>{title}</h2>
                        <p>{content}</p>
                        <hr>
                        <p><small>Posted by: {posted_by}</small></p>
                    </div>
                    <a href="{APP_URL}/announcements" class="button">View All Announcements</a>
                </div>
            </div>
        </body>
        </html>
        """
        
        results = []
        for recipient in recipients:
            result = {
                'user': recipient.get('full_name', 'Unknown'),
                'whatsapp': {'success': False},
                'email': {'success': False}
            }
            
            if recipient.get('phone'):
                result['whatsapp'] = self.send_whatsapp(recipient['phone'], whatsapp_msg)
            
            if recipient.get('email'):
                result['email'] = self.send_email(
                    recipient['email'],
                    f"Announcement: {title}",
                    email_html
                )
            
            results.append(result)
        
        return results
    
    def notify_admin_task_status_change(self, task_data: Dict, user_name: str, 
                                        new_status: str) -> Dict:
        """
        Notify admin when a user changes task status
        
        Args:
            task_data: Task details
            user_name: Name of user who changed status
            new_status: New task status
        
        Returns:
            Dict with notification results
        """
        task_id = task_data.get('id', 'N/A')
        title = task_data.get('title', 'Task')
        
        status_emoji = {
            'completed': '✅',
            'accepted': '👍',
            'passed_on': '➡️',
            'in_progress': '🔄'
        }.get(new_status.lower(), '📝')
        
        whatsapp_msg = f"""{status_emoji} *TASK STATUS UPDATE*

*Task:* {title}
*Status:* {new_status.upper()}
*Updated by:* {user_name}

View task: {APP_URL}/tasks/{task_id}
"""
        
        email_html = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2>{status_emoji} Task Status Updated</h2>
                <p><strong>Task:</strong> {title}</p>
                <p><strong>New Status:</strong> {new_status.upper()}</p>
                <p><strong>Updated by:</strong> {user_name}</p>
                <a href="{APP_URL}/tasks/{task_id}" style="display: inline-block; padding: 10px 20px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px;">View Task</a>
            </div>
        </body>
        </html>
        """
        
        # Send to admin
        return {
            'email': self.send_email(ADMIN_EMAIL, f"Task Status: {new_status}", email_html)
        }


# Singleton instance
notification_service = NotificationService()
