"""
Flask routes for notification system
Handles task assignments, hearing reminders, announcements, etc.
"""
from flask import Blueprint, request, jsonify
from notification_service import notification_service
from supabase_client import supabase_client
import logging

logger = logging.getLogger(__name__)

notifications_bp = Blueprint('notifications', __name__, url_prefix='/api/notifications')


@notifications_bp.route('/task-assigned', methods=['POST'])
def notify_task_assigned():
    """
    Send notifications when a task is assigned
    
    Expected payload:
    {
        "task_id": "uuid",
        "assignee_id": "uuid",
        "assigner_name": "John Doe"
    }
    """
    try:
        data = request.get_json()
        task_id = data.get('task_id')
        assignee_id = data.get('assignee_id')
        assigner_name = data.get('assigner_name', 'Admin')
        
        if not task_id or not assignee_id:
            return jsonify({'error': 'task_id and assignee_id required'}), 400
        
        # Fetch task details from Supabase
        task = supabase_client.get_task(task_id)
        if not task:
            return jsonify({'error': 'Task not found'}), 404
        
        # Fetch assignee details
        assignee = supabase_client.get_user(assignee_id)
        if not assignee:
            return jsonify({'error': 'Assignee not found'}), 404
        
        # Fetch case details if task is linked to a case
        if task.get('case_id'):
            case = supabase_client.get_case(task['case_id'])
            if case:
                task['case_number'] = case.get('case_number', 'N/A')
                task['hearing_date'] = case.get('listing_date') or case.get('filing_date', 'Not scheduled')
        
        # Send notifications
        results = notification_service.send_task_assignment_notification(
            task, assignee, assigner_name
        )
        
        return jsonify({
            'success': True,
            'results': results,
            'task_id': task_id
        }), 200
    
    except Exception as e:
        logger.error(f"Task assignment notification failed: {e}")
        return jsonify({'error': str(e)}), 500


@notifications_bp.route('/hearing-reminder', methods=['POST'])
def notify_hearing_reminder():
    """
    Send hearing reminders for a specific case
    
    Expected payload:
    {
        "case_id": "uuid",
        "assignee_ids": ["uuid1", "uuid2"]
    }
    """
    try:
        data = request.get_json()
        case_id = data.get('case_id')
        assignee_ids = data.get('assignee_ids', [])
        
        if not case_id:
            return jsonify({'error': 'case_id required'}), 400
        
        # Fetch case details
        case = supabase_client.get_case(case_id)
        if not case:
            return jsonify({'error': 'Case not found'}), 404
        
        # Fetch assignees
        assignees = []
        for user_id in assignee_ids:
            user = supabase_client.get_user(user_id)
            if user:
                assignees.append(user)
        
        if not assignees:
            return jsonify({'error': 'No valid assignees found'}), 400
        
        # Send reminders
        results = notification_service.send_hearing_reminder(case, assignees)
        
        return jsonify({
            'success': True,
            'results': results,
            'case_id': case_id
        }), 200
    
    except Exception as e:
        logger.error(f"Hearing reminder failed: {e}")
        return jsonify({'error': str(e)}), 500


@notifications_bp.route('/announcement', methods=['POST'])
def notify_announcement():
    """
    Send announcement notifications
    
    Expected payload:
    {
        "title": "Announcement Title",
        "content": "Announcement content",
        "posted_by": "Admin Name",
        "target_users": "all" | ["uuid1", "uuid2"]
    }
    """
    try:
        data = request.get_json()
        title = data.get('title')
        content = data.get('content')
        posted_by = data.get('posted_by', 'Admin')
        target_users = data.get('target_users', 'all')
        
        if not title or not content:
            return jsonify({'error': 'title and content required'}), 400
        
        announcement = {
            'title': title,
            'content': content,
            'posted_by': posted_by
        }
        
        # Determine recipients
        if target_users == 'all':
            recipients = supabase_client.get_all_active_users()
        else:
            recipients = []
            for user_id in target_users:
                user = supabase_client.get_user(user_id)
                if user:
                    recipients.append(user)
        
        if not recipients:
            return jsonify({'error': 'No recipients found'}), 400
        
        # Send notifications
        results = notification_service.send_announcement_notification(
            announcement, recipients
        )
        
        return jsonify({
            'success': True,
            'results': results,
            'recipients_count': len(recipients)
        }), 200
    
    except Exception as e:
        logger.error(f"Announcement notification failed: {e}")
        return jsonify({'error': str(e)}), 500


@notifications_bp.route('/task-status-update', methods=['POST'])
def notify_task_status_update():
    """
    Notify admin when task status is updated
    
    Expected payload:
    {
        "task_id": "uuid",
        "user_name": "John Doe",
        "new_status": "completed"
    }
    """
    try:
        data = request.get_json()
        task_id = data.get('task_id')
        user_name = data.get('user_name', 'User')
        new_status = data.get('new_status')
        
        if not task_id or not new_status:
            return jsonify({'error': 'task_id and new_status required'}), 400
        
        # Fetch task details
        task = supabase_client.get_task(task_id)
        if not task:
            return jsonify({'error': 'Task not found'}), 404
        
        # Send notification to admin
        results = notification_service.notify_admin_task_status_change(
            task, user_name, new_status
        )
        
        return jsonify({
            'success': True,
            'results': results
        }), 200
    
    except Exception as e:
        logger.error(f"Task status notification failed: {e}")
        return jsonify({'error': str(e)}), 500


@notifications_bp.route('/test-whatsapp', methods=['POST'])
def test_whatsapp():
    """Test WhatsApp notification"""
    try:
        data = request.get_json()
        phone = data.get('phone')
        message = data.get('message', 'Test message from Case Management System')
        
        if not phone:
            return jsonify({'error': 'phone number required'}), 400
        
        result = notification_service.send_whatsapp(phone, message)
        return jsonify(result), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@notifications_bp.route('/test-email', methods=['POST'])
def test_email():
    """Test email notification"""
    try:
        data = request.get_json()
        email = data.get('email')
        subject = data.get('subject', 'Test Email')
        content = data.get('content', 'Test email from Case Management System')
        
        if not email:
            return jsonify({'error': 'email address required'}), 400
        
        html_content = f"<html><body><p>{content}</p></body></html>"
        result = notification_service.send_email(email, subject, html_content)
        return jsonify(result), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
