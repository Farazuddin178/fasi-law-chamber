import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { FolderOpen, Gavel, FileText, Users, CheckCircle, Clock, Eye, AlertCircle, TrendingUp, BarChart3, Bell, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

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
          supabase.from('tasks').select('*').order('created_at', { ascending: false }).limit(5)
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
    } catch (error) {
      console.error('Error loading dashboard data:', error);
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

      {/* Announcement Info - View Only */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-center space-x-3">
          <Bell className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="font-bold text-gray-900">Announcements</h2>
            <p className="text-sm text-gray-600">View announcements on the <a href="/announcements" className="text-blue-600 hover:underline">Announcements page</a></p>
          </div>
        </div>
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