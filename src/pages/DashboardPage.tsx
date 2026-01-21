import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { FolderOpen, Gavel, FileText, Users, CheckCircle, Clock, Eye, AlertCircle, TrendingUp, BarChart3, Bell, Search, ThumbsUp, ThumbsDown, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

// Helper function to calculate time remaining
const getTimeRemaining = (dueDate: string) => {
  const now = new Date();
  const due = new Date(dueDate);
  const diff = due.getTime() - now.getTime();
  
  if (diff < 0) return { text: 'Overdue', color: 'text-red-600', urgent: true };
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  
  if (hours < 6) return { text: `${hours}h remaining`, color: 'text-red-600', urgent: true };
  if (hours < 24) return { text: `${hours}h remaining`, color: 'text-orange-600', urgent: true };
  if (days < 2) return { text: `${days} day remaining`, color: 'text-yellow-600', urgent: false };
  return { text: `${days} days remaining`, color: 'text-gray-600', urgent: false };
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalCases: 0,
    hearings: 0,
    draftsPending: 0,
    interns: 0,
    pendingCases: 0,
    filedCases: 0,
    disposedCases: 0,
    closedCases: 0
  });

  const [userCases, setUserCases] = useState<any[]>([]);
  const [filteredCases, setFilteredCases] = useState<any[]>([]);
  const [userTasks, setUserTasks] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isViewer, setIsViewer] = useState(false);
  const [dashboardSearch, setDashboardSearch] = useState('');

  useEffect(() => {
    setIsAdmin(user?.role === 'admin' || user?.role === 'restricted_admin');
    setIsViewer(user?.role === 'viewer');
    loadDashboardData();
  }, [user]);

  useEffect(() => {
    // Filter cases based on search
    if (dashboardSearch) {
      const filtered = userCases.filter(c =>
        c.case_number?.toLowerCase().includes(dashboardSearch.toLowerCase()) ||
        c.primary_petitioner?.toLowerCase().includes(dashboardSearch.toLowerCase()) ||
        c.primary_respondent?.toLowerCase().includes(dashboardSearch.toLowerCase())
      );
      setFilteredCases(filtered);
    } else {
      setFilteredCases(userCases);
    }
  }, [dashboardSearch, userCases]);

  const handleTaskApprove = async (taskId: string) => {
    try {
      // Update task status
      const { error: taskError } = await supabase
        .from('tasks')
        .update({ status: 'in_progress' })
        .eq('id', taskId);

      if (taskError) throw taskError;

      // Record the response
      const { error: responseError } = await supabase
        .from('task_responses')
        .insert({
          task_id: taskId,
          user_id: user?.id,
          response_type: 'accept',
          created_at: new Date().toISOString()
        });

      if (responseError) throw responseError;

      toast.success('Task accepted successfully');
      loadDashboardData(); // Reload to update the UI
    } catch (error: any) {
      toast.error(error.message || 'Failed to accept task');
    }
  };

  const handleTaskPassOn = async (taskId: string) => {
    const reason = prompt('Please provide a reason for passing on this task:');
    if (!reason) return;

    try {
      // Update task status
      const { error: taskError } = await supabase
        .from('tasks')
        .update({ status: 'cancelled' })
        .eq('id', taskId);

      if (taskError) throw taskError;

      // Record the response in task_responses table
      const { error: responseError } = await supabase
        .from('task_responses')
        .insert({
          task_id: taskId,
          user_id: user?.id,
          response_type: 'pass_on',
          reason: reason,
          created_at: new Date().toISOString()
        });

      if (responseError) throw responseError;

      // Also add a comment for visibility
      const { error: commentError } = await supabase
        .from('task_comments')
        .insert({
          task_id: taskId,
          user_id: user?.id,
          comment: `PASSED ON: ${reason}`,
          created_at: new Date().toISOString()
        });

      if (commentError) {
        console.error('Comment error:', commentError);
        // Don't throw - pass on was successful even if comment failed
      }

      toast.success('Task passed on successfully. Admin will be notified.');
      loadDashboardData(); // Reload to update the UI
    } catch (error: any) {
      console.error('Pass on error:', error);
      toast.error(error.message || 'Failed to pass on task');
    }
  };

  // Announcements are now managed on the dedicated Announcements page
  // This section is for displaying announcements on dashboard only

  const loadDashboardData = async () => {
    try {
      // For viewers, show all system stats
      if (user?.role === 'viewer') {
        const [casesRes, tasksRes, docsRes, usersRes] = await Promise.all([
          supabase.from('cases').select('*', { count: 'exact', head: true }),
          supabase.from('tasks').select('*', { count: 'exact', head: true }),
          supabase.from('documents').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'intern')
        ]);

        const allCases = await supabase.from('cases').select('*');
        
        setStats({
          totalCases: casesRes.count || 0,
          hearings: tasksRes.count || 0,
          draftsPending: docsRes.count || 0,
          interns: usersRes.count || 0,
          pendingCases: allCases.data?.filter(c => c.status === 'pending').length || 0,
          filedCases: allCases.data?.filter(c => c.status === 'filed').length || 0,
          disposedCases: allCases.data?.filter(c => c.status === 'disposed').length || 0,
          closedCases: allCases.data?.filter(c => c.status === 'closed').length || 0
        });
      } else {
        // For admin and regular users, show general data
        const [casesRes, tasksRes] = await Promise.all([
          supabase.from('cases').select('*').limit(5),
          supabase.from('tasks').select('*').eq('assigned_to', user?.id).order('created_at', { ascending: false }).limit(10)
        ]);

        // Get all system stats for admin/users
        const [allCasesRes, allTasksRes, docsRes, usersRes] = await Promise.all([
          supabase.from('cases').select('*', { count: 'exact', head: true }),
          supabase.from('tasks').select('*', { count: 'exact', head: true }),
          supabase.from('documents').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'intern')
        ]);

        const allCases = await supabase.from('cases').select('*');

        setStats({
          totalCases: allCasesRes.count || 0,
          hearings: allTasksRes.count || 0,
          draftsPending: docsRes.count || 0,
          interns: usersRes.count || 0,
          pendingCases: allCases.data?.filter(c => c.status === 'pending').length || 0,
          filedCases: allCases.data?.filter(c => c.status === 'filed').length || 0,
          disposedCases: allCases.data?.filter(c => c.status === 'disposed').length || 0,
          closedCases: allCases.data?.filter(c => c.status === 'closed').length || 0
        });

        setUserCases(casesRes.data || []);
        setUserTasks(tasksRes.data || []);
      }

      // Load announcements based on user role
      let announcementsQuery = supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);

      // Filter announcements based on visibility
      if (user?.role !== 'admin' && user?.role !== 'restricted_admin') {
        announcementsQuery = announcementsQuery.eq('visible_to', 'all_users');
      }
      
      const { data: announcementsData } = await announcementsQuery;
      setAnnouncements(announcementsData || []);
    } catch (error: any) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const getTimeRemaining = (dueDate: string) => {
    const now = new Date().getTime();
    const due = new Date(dueDate).getTime();
    const diff = due - now;
    
    if (diff < 0) return { text: 'Overdue', color: 'text-red-600 font-bold', urgent: true };
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return { text: `${days} day${days > 1 ? 's' : ''} left`, color: 'text-gray-600', urgent: false };
    } else if (hours > 0) {
      return { text: `${hours} hour${hours > 1 ? 's' : ''} left`, color: 'text-orange-600 font-semibold', urgent: true };
    } else {
      const minutes = Math.floor(diff / (1000 * 60));
      return { text: `${minutes} min left`, color: 'text-red-600 font-bold', urgent: true };
    }
  };

  const statCards = [
    { 
      title: 'Total Cases', 
      value: stats.totalCases, 
      icon: FolderOpen, 
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      textColor: 'text-blue-900'
    },
    { 
      title: 'Hearings', 
      value: stats.hearings, 
      icon: Gavel, 
      bgColor: 'bg-amber-50',
      iconColor: 'text-amber-600',
      textColor: 'text-amber-900'
    },
    { 
      title: 'Drafts Pending', 
      value: stats.draftsPending, 
      icon: FileText, 
      bgColor: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      textColor: 'text-emerald-900'
    },
    { 
      title: 'Interns', 
      value: stats.interns, 
      icon: Users, 
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
      textColor: 'text-purple-900'
    }
  ];

  const analyticsCards = [
    { 
      title: 'Pending Cases', 
      value: stats.pendingCases, 
      icon: Clock, 
      bgColor: 'bg-yellow-50',
      iconColor: 'text-yellow-600',
      textColor: 'text-yellow-900'
    },
    { 
      title: 'Filed Cases', 
      value: stats.filedCases, 
      icon: FileText, 
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      textColor: 'text-blue-900'
    },
    { 
      title: 'Disposed Cases', 
      value: stats.disposedCases, 
      icon: CheckCircle, 
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      textColor: 'text-green-900'
    },
    { 
      title: 'Closed Cases', 
      value: stats.closedCases, 
      icon: AlertCircle, 
      bgColor: 'bg-gray-50',
      iconColor: 'text-gray-600',
      textColor: 'text-gray-900'
    }
  ];

  // Viewer Dashboard
  if (isViewer) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-xl p-6 sm:p-8 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold mb-2">Welcome, {user?.full_name?.split(' ')[0]}</h1>
              <p className="text-slate-300">Fasi Uddin Law Chamber - Dashboard</p>
            </div>
          </div>
        </div>

        {/* Main Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.title} className={`${card.bgColor} rounded-xl p-6 border-2 border-gray-100 shadow-sm hover:shadow-md transition-shadow`}>
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg bg-white`}>
                    <Icon className={`w-6 h-6 ${card.iconColor}`} />
                  </div>
                </div>
                <p className={`text-sm font-medium ${card.textColor}`}>{card.title}</p>
                <p className={`text-4xl font-bold ${card.textColor}`}>{card.value}</p>
              </div>
            );
          })}
        </div>

        {/* Analytics Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-slate-900 rounded-lg">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Case Analytics</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {analyticsCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.title} className={`${card.bgColor} rounded-xl p-6 border-2 border-gray-100`}>
                  <div className="flex items-center justify-between mb-3">
                    <Icon className={`w-6 h-6 ${card.iconColor}`} />
                  </div>
                  <p className={`text-sm font-medium ${card.textColor} mb-1`}>{card.title}</p>
                  <p className={`text-3xl font-bold ${card.textColor}`}>{card.value}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Admin/Regular User Dashboard
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-xl p-6 sm:p-8 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-2">Welcome, {user?.full_name}</h1>
            <p className="text-slate-300">Fasi Uddin Law Chamber</p>
          </div>
        </div>
      </div>

      {/* Announcements Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Bell className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Recent Announcements</h2>
          </div>
          <Link to="/announcements" className="text-blue-600 hover:underline text-sm">View All →</Link>
        </div>

        {announcements.length > 0 ? (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <div key={announcement.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-900">{announcement.title}</h3>
                  <span className="text-xs text-gray-500">
                    {new Date(announcement.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-gray-700 text-sm whitespace-pre-wrap line-clamp-3">{announcement.content}</p>
                <Link
                  to="/announcements"
                  className="text-blue-600 hover:underline text-sm mt-2 inline-block"
                >
                  Read more →
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Bell className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>No announcements at this time</p>
          </div>
        )}
      </div>

      {/* My Tasks Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-bold text-gray-900">My Tasks</h2>
          </div>
          <Link to="/tasks" className="text-blue-600 hover:underline text-sm">View All Tasks →</Link>
        </div>

        {userTasks.length > 0 ? (
          <div className="space-y-4">
            {userTasks.slice(0, 5).map((task) => {
              const linkedCase = userCases.find(c => c.id === task.case_id);
              const timeRemaining = task.due_date ? getTimeRemaining(task.due_date) : null;
              
              return (
                <div key={task.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{task.title}</h3>
                      {task.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{task.description}</p>
                      )}
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ml-2 ${
                      task.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                      task.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                      task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {task.priority.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-3">
                    {linkedCase && (
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Case:</span>
                        <span>{linkedCase.case_number}</span>
                      </div>
                    )}
                    {task.due_date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                      </div>
                    )}
                    {timeRemaining && (
                      <div className={`flex items-center gap-1 ${timeRemaining.color} ${timeRemaining.urgent ? 'animate-pulse' : ''}`}>
                        <Clock className="w-4 h-4" />
                        <span className="font-semibold">{timeRemaining.text}</span>
                      </div>
                    )}
                  </div>

                  {user?.role === 'restricted_admin' && task.assigned_to === user.id && task.status === 'pending' && (
                    <div className="flex gap-2 pt-3 border-t border-gray-200">
                      <button
                        onClick={() => handleTaskApprove(task.id)}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2 text-sm"
                      >
                        <ThumbsUp className="w-4 h-4" />
                        Accept
                      </button>
                      <button
                        onClick={() => handleTaskPassOn(task.id)}
                        className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition flex items-center justify-center gap-2 text-sm"
                      >
                        <ThumbsDown className="w-4 h-4" />
                        Pass On
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>No tasks assigned to you</p>
          </div>
        )}
      </div>

      {/* Task List on Dashboard */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Gavel className="w-6 h-6 text-amber-600" />
          <h2 className="text-xl font-bold text-gray-900">Task List on Dashboard</h2>
        </div>

        {/* Search Bar for Task List */}
        <div className="mb-4 flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-lg border border-gray-300">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by case number, petitioner, or respondent..."
            value={dashboardSearch}
            onChange={(e) => setDashboardSearch(e.target.value)}
            className="flex-1 bg-transparent outline-none text-gray-700"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Case Number</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Petitioner Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Respondent Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Filing Date</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Listing Date</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Hearing Court</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Hearing Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredCases.length > 0 ? (
                filteredCases.map((caseItem, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900 font-medium">{caseItem.case_number || '-'}</td>
                    <td className="px-4 py-3 text-gray-700">{caseItem.primary_petitioner || '-'}</td>
                    <td className="px-4 py-3 text-gray-700">{caseItem.primary_respondent || '-'}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {caseItem.filing_date ? new Date(caseItem.filing_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {caseItem.listing_date ? new Date(caseItem.listing_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                        caseItem.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        caseItem.status === 'filed' ? 'bg-blue-100 text-blue-800' :
                        caseItem.status === 'disposed' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {caseItem.status?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{caseItem.hearing_court || '-'}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {caseItem.hearing_date ? new Date(caseItem.hearing_date).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    No cases assigned to you
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { 
            title: 'Total Cases', 
            value: stats.totalCases, 
            icon: FolderOpen, 
            bgColor: 'bg-blue-50',
            iconColor: 'text-blue-600',
            textColor: 'text-blue-900'
          },
          { 
            title: 'Hearings', 
            value: stats.hearings, 
            icon: Gavel, 
            bgColor: 'bg-amber-50',
            iconColor: 'text-amber-600',
            textColor: 'text-amber-900'
          },
          { 
            title: 'Drafts Pending', 
            value: stats.draftsPending, 
            icon: FileText, 
            bgColor: 'bg-emerald-50',
            iconColor: 'text-emerald-600',
            textColor: 'text-emerald-900'
          },
          { 
            title: 'Interns', 
            value: stats.interns, 
            icon: Users, 
            bgColor: 'bg-purple-50',
            iconColor: 'text-purple-600',
            textColor: 'text-purple-900'
          }
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className={`${card.bgColor} rounded-xl p-6 border-2 border-gray-100 shadow-sm hover:shadow-md transition-shadow`}>
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg bg-white`}>
                  <Icon className={`w-6 h-6 ${card.iconColor}`} />
                </div>
              </div>
              <p className={`text-sm font-medium ${card.textColor}`}>{card.title}</p>
              <p className={`text-4xl font-bold ${card.textColor}`}>{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Analytics Overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-slate-900 rounded-lg">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Case Statistics</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { 
              title: 'Pending Cases', 
              value: stats.pendingCases, 
              icon: Clock, 
              bgColor: 'bg-yellow-50',
              iconColor: 'text-yellow-600',
              textColor: 'text-yellow-900'
            },
            { 
              title: 'Filed Cases', 
              value: stats.filedCases, 
              icon: FileText, 
              bgColor: 'bg-blue-50',
              iconColor: 'text-blue-600',
              textColor: 'text-blue-900'
            },
            { 
              title: 'Disposed Cases', 
              value: stats.disposedCases, 
              icon: CheckCircle, 
              bgColor: 'bg-green-50',
              iconColor: 'text-green-600',
              textColor: 'text-green-900'
            },
            { 
              title: 'Closed Cases', 
              value: stats.closedCases, 
              icon: AlertCircle, 
              bgColor: 'bg-gray-50',
              iconColor: 'text-gray-600',
              textColor: 'text-gray-900'
            }
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.title} className={`${card.bgColor} rounded-lg p-4 border border-gray-100 text-center`}>
                <Icon className={`w-6 h-6 ${card.iconColor} mx-auto mb-2`} />
                <p className={`text-sm font-medium ${card.textColor} mb-1`}>{card.title}</p>
                <p className={`text-2xl font-bold ${card.textColor}`}>{card.value}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}