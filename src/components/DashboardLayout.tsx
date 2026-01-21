import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  LayoutDashboard,
  FolderOpen,
  ListTodo,
  FileText,
  BarChart3,
  Receipt,
  Users,
  Clock,
  Settings,
  LogOut,
  Menu,
  X,
  Scale,
  HardDrive,
  Github,
  Mail,
  ChevronLeft,
  ChevronRight,
  Gavel,
  Bell
} from 'lucide-react';
import { useState, useEffect } from 'react';

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pendingCounts, setPendingCounts] = useState<{ tasks: number; cases: number }>({ tasks: 0, cases: 0 });

  useEffect(() => {
    loadPendingCounts();
    const interval = setInterval(loadPendingCounts, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const loadPendingCounts = async () => {
    try {
      const [tasksRes, casesRes] = await Promise.all([
        supabase.from('tasks').select('*', { count: 'exact', head: true }).in('status', ['pending', 'in_progress']),
        supabase.from('cases').select('*', { count: 'exact', head: true }).not('disp_type', 'is', null).eq('disp_type', '')
      ]);
      setPendingCounts({
        tasks: tasksRes.count || 0,
        cases: casesRes.count || 0
      });
    } catch (error) {
      console.error('Failed to load pending counts:', error);
    }
  };

  const navItems: NavItem[] = [
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { name: 'Cases', path: '/cases', icon: <FolderOpen className="w-5 h-5" /> },
    { name: 'Hearings', path: '/hearings', icon: <Gavel className="w-5 h-5" /> },
    { name: 'Tasks', path: '/tasks', icon: <ListTodo className="w-5 h-5" /> },
    { name: 'Documents', path: '/documents', icon: <FileText className="w-5 h-5" /> },
    { name: 'Messages', path: '/messages', icon: <Mail className="w-5 h-5" /> },
    { name: 'Announcements', path: '/announcements', icon: <Bell className="w-5 h-5" />, adminOnly: true },
    { name: 'Analytics', path: '/analytics', icon: <BarChart3 className="w-5 h-5" /> },
    { name: 'Expenses', path: '/expenses', icon: <Receipt className="w-5 h-5" /> },
    { name: 'Users', path: '/users', icon: <Users className="w-5 h-5" />, adminOnly: true },
    { name: 'Login Logs', path: '/logs', icon: <Clock className="w-5 h-5" />, adminOnly: true },
    { name: 'Storage', path: '/storage', icon: <HardDrive className="w-5 h-5" />, adminOnly: true },
    { name: 'GitHub', path: '/github', icon: <Github className="w-5 h-5" />, adminOnly: true },
    { name: 'Links', path: '/links', icon: <Bell className="w-5 h-5" /> },
    { name: 'Settings', path: '/settings', icon: <Settings className="w-5 h-5" /> },
  ];

  const filteredNavItems = navItems.filter(item => {
    if (item.adminOnly && user?.role !== 'admin') {
      return false;
    }
    return true;
  });

  const handleLogout = async () => {
    await logout();
  };

  const getUserInitials = () => {
    if (user?.full_name) {
      return user.full_name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return 'U';
  };

  return (
    <div className="min-h-screen bg-gray-50 lg:flex">
      {/* Mobile header */}
      <div className="lg:hidden bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-amber-600 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg hover:bg-slate-700 text-white transition-colors"
          title="Toggle Menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        <div className="flex items-center space-x-2">
          <Scale className="w-8 h-8 text-amber-500" />
          <span className="text-lg font-bold text-white">Fasi Law Chamber</span>
        </div>
        <div className="w-8" />
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border-r border-amber-600 transform transition-all duration-300 ease-in-out lg:static lg:translate-x-0 ${
          sidebarOpen ? 'w-64' : 'w-20'
        } ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className="hidden lg:flex items-center justify-between px-6 py-6 border-b border-amber-600">
            {sidebarOpen && (
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">
                  Fasi Law Chamber
                </h1>
                <p className="text-xs text-slate-400">Professional Services</p>
              </div>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1 hover:bg-slate-700 rounded-lg text-amber-500 transition-colors"
              title={sidebarOpen ? 'Collapse' : 'Expand'}
            >
              {sidebarOpen ? (
                <ChevronLeft className="w-5 h-5" />
              ) : (
                <ChevronRight className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
            {filteredNavItems.map((item) => {
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
              const badge = item.name === 'Tasks' ? pendingCounts.tasks : item.name === 'Cases' ? pendingCounts.cases : 0;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`
                    flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-all duration-200 group relative
                    ${isActive
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 font-semibold shadow-lg'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-amber-400'
                    }
                  `}
                  title={!sidebarOpen ? item.name : ''}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  {sidebarOpen && <span className="font-medium">{item.name}</span>}
                  {badge > 0 && sidebarOpen && (
                    <span className="ml-auto px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">
                      {badge}
                    </span>
                  )}
                  {badge > 0 && !sidebarOpen && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 text-xs font-bold bg-red-500 text-white rounded-full flex items-center justify-center">
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User info */}
          <div className="border-t border-amber-600 p-4 space-y-4">
            {sidebarOpen && (
              <>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center text-slate-900 font-bold mx-auto mb-2">
                    {getUserInitials()}
                  </div>
                  <p className="text-sm font-semibold text-slate-200 truncate">{user?.full_name}</p>
                  <p className="text-xs text-slate-400 truncate capitalize">{user?.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 text-sm text-slate-900 bg-gradient-to-r from-amber-500 to-amber-600 rounded-lg hover:from-amber-600 hover:to-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-slate-800 transition-all font-semibold shadow-lg"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 min-h-screen bg-gray-50">
        <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}