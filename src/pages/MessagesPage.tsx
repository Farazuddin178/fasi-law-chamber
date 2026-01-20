import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Send, Inbox, Mail, User, Users, AlertCircle, Clock, CheckCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

interface Email {
  id: string;
  sender_id: string;
  recipient_id: string | null;
  recipient_role: string | null;
  subject: string;
  body: string;
  priority: 'high' | 'medium' | 'low';
  status: 'sent' | 'read' | 'replied';
  created_at: string;
  read_at: string | null;
  sender?: { full_name: string; email: string; role: string };
  recipient?: { full_name: string; email: string; role: string };
}

interface UserOption {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

export default function MessagesPage() {
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent'>('inbox');
  const [emails, setEmails] = useState<Email[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const { user } = useAuth();

  const [composeForm, setComposeForm] = useState({
    recipient_type: 'user',
    recipient_id: '',
    recipient_role: '',
    subject: '',
    body: '',
    priority: 'medium' as 'high' | 'medium' | 'low'
  });

  useEffect(() => {
    loadEmails();
    loadUsers();
  }, [activeTab, user]);

  const loadEmails = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      let query = supabase
        .from('email_communications')
        .select(`
          *,
          sender:users!sender_id(full_name, email, role),
          recipient:users!recipient_id(full_name, email, role)
        `)
        .order('created_at', { ascending: false });

      if (activeTab === 'inbox') {
        query = query.eq('recipient_id', user.id);
      } else {
        query = query.eq('sender_id', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setEmails(data || []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load emails');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, role')
        .neq('id', user?.id || '')
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error('Failed to load users:', error);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!composeForm.subject || !composeForm.body) {
      toast.error('Subject and body are required');
      return;
    }

    if (composeForm.recipient_type === 'user' && !composeForm.recipient_id) {
      toast.error('Please select a recipient');
      return;
    }

    if (composeForm.recipient_type === 'role' && !composeForm.recipient_role) {
      toast.error('Please select a recipient role');
      return;
    }

    try {
      // If sending to role, send to all users with that role
      if (composeForm.recipient_type === 'role') {
        const usersWithRole = users.filter(u => u.role === composeForm.recipient_role);
        
        for (const recipient of usersWithRole) {
          const { error } = await supabase.from('email_communications').insert({
            sender_id: user?.id,
            recipient_id: recipient.id,
            recipient_role: composeForm.recipient_role,
            subject: composeForm.subject,
            body: composeForm.body,
            priority: composeForm.priority,
            status: 'sent'
          });

          if (error) throw error;
        }
        
        toast.success(`Email sent to ${usersWithRole.length} ${composeForm.recipient_role}(s)`);
      } else {
        // Send to specific user
        const { error } = await supabase.from('email_communications').insert({
          sender_id: user?.id,
          recipient_id: composeForm.recipient_id,
          subject: composeForm.subject,
          body: composeForm.body,
          priority: composeForm.priority,
          status: 'sent'
        });

        if (error) throw error;
        toast.success('Email sent successfully');
      }

      setShowCompose(false);
      setComposeForm({
        recipient_type: 'user',
        recipient_id: '',
        recipient_role: '',
        subject: '',
        body: '',
        priority: 'medium'
      });
      loadEmails();
    } catch (error: any) {
      toast.error(error.message || 'Failed to send email');
    }
  };

  const markAsRead = async (emailId: string) => {
    try {
      const { error } = await supabase
        .from('email_communications')
        .update({ status: 'read', read_at: new Date().toISOString() })
        .eq('id', emailId);

      if (error) throw error;
      loadEmails();
    } catch (error: any) {
      console.error('Failed to mark as read:', error);
    }
  };

  const openEmail = (email: Email) => {
    setSelectedEmail(email);
    if (activeTab === 'inbox' && email.status === 'sent') {
      markAsRead(email.id);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'read': return <CheckCheck className="w-4 h-4 text-blue-600" />;
      case 'replied': return <Mail className="w-4 h-4 text-green-600" />;
      default: return <Mail className="w-4 h-4 text-gray-400" />;
    }
  };

  if (loading && emails.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
          <p className="text-gray-600 mt-1">Internal communication system</p>
        </div>
        <button
          onClick={() => setShowCompose(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Send className="w-5 h-5" />
          Compose Email
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('inbox')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'inbox'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Inbox className="w-5 h-5" />
              Inbox ({emails.filter(e => e.status === 'sent').length})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'sent'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Send className="w-5 h-5" />
              Sent
            </div>
          </button>
        </div>

        <div className="p-6">
          {emails.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No emails in {activeTab}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {emails.map((email) => (
                <div
                  key={email.id}
                  onClick={() => openEmail(email)}
                  className={`border rounded-lg p-4 cursor-pointer transition hover:shadow-md ${
                    email.status === 'sent' && activeTab === 'inbox'
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        {activeTab === 'inbox' ? (
                          <User className="w-8 h-8 text-gray-400" />
                        ) : (
                          <Send className="w-8 h-8 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-gray-900 truncate">
                            {activeTab === 'inbox'
                              ? email.sender?.full_name || 'Unknown'
                              : email.recipient?.full_name || email.recipient_role || 'Unknown'}
                          </p>
                          <span className={`px-2 py-0.5 text-xs rounded-full border ${getPriorityColor(email.priority)}`}>
                            {email.priority}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-900 mb-1">{email.subject}</p>
                        <p className="text-sm text-gray-600 truncate">{email.body.substring(0, 100)}...</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 ml-4">
                      {getStatusIcon(email.status)}
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        {new Date(email.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
              <h2 className="text-xl font-bold text-gray-900">Compose Email</h2>
            </div>

            <form onSubmit={handleSendEmail} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Send To</label>
                <div className="flex gap-4 mb-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="user"
                      checked={composeForm.recipient_type === 'user'}
                      onChange={(e) => setComposeForm({ ...composeForm, recipient_type: e.target.value as 'user' | 'role' })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Specific User</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="role"
                      checked={composeForm.recipient_type === 'role'}
                      onChange={(e) => setComposeForm({ ...composeForm, recipient_type: e.target.value as 'user' | 'role' })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">All Users in Role</span>
                  </label>
                </div>

                {composeForm.recipient_type === 'user' ? (
                  <select
                    value={composeForm.recipient_id}
                    onChange={(e) => setComposeForm({ ...composeForm, recipient_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select User...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name} ({u.role}) - {u.email}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={composeForm.recipient_role}
                    onChange={(e) => setComposeForm({ ...composeForm, recipient_role: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Role...</option>
                    <option value="admin">All Admins</option>
                    <option value="restricted_admin">All Restricted Admins</option>
                    <option value="viewer">All Viewers</option>
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                <select
                  value={composeForm.priority}
                  onChange={(e) => setComposeForm({ ...composeForm, priority: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                <input
                  type="text"
                  value={composeForm.subject}
                  onChange={(e) => setComposeForm({ ...composeForm, subject: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Email subject"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                <textarea
                  value={composeForm.body}
                  onChange={(e) => setComposeForm({ ...composeForm, body: e.target.value })}
                  rows={8}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Type your message here..."
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCompose(false)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Send Email
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Email Modal */}
      {selectedEmail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">{selectedEmail.subject}</h2>
                <button
                  onClick={() => setSelectedEmail(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <AlertCircle className="w-6 h-6" />
                </button>
              </div>
              <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>
                    {activeTab === 'inbox'
                      ? `From: ${selectedEmail.sender?.full_name}`
                      : `To: ${selectedEmail.recipient?.full_name || selectedEmail.recipient_role}`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{new Date(selectedEmail.created_at).toLocaleString()}</span>
                </div>
                <span className={`px-2 py-0.5 text-xs rounded-full border ${getPriorityColor(selectedEmail.priority)}`}>
                  {selectedEmail.priority}
                </span>
              </div>
            </div>

            <div className="p-6">
              <div className="prose max-w-none">
                <p className="whitespace-pre-wrap text-gray-900">{selectedEmail.body}</p>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
              <button
                onClick={() => setSelectedEmail(null)}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
