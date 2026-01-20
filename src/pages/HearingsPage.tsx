import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Calendar, Clock, CheckCircle, AlertCircle, Search, Plus, Filter } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

interface Hearing {
  id: string;
  case_id: string;
  case_number: string;
  hearing_date: string;
  hearing_court: string;
  status: 'pending' | 'disposed' | 'adjourned';
  mention_date?: string;
  listing_date?: string;
  judge_name?: string;
  motion_type?: string;
  created_at: string;
}

export default function HearingsPage() {
  const { user } = useAuth();
  const [hearings, setHearings] = useState<Hearing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'disposed' | 'adjourned'>('all');
  const [showForm, setShowForm] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setIsAdmin(user?.role === 'admin' || user?.role === 'restricted_admin');
    loadHearings();
  }, [user, filterStatus]);

  const loadHearings = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('hearings')
        .select(`
          id,
          case_id,
          hearing_date,
          hearing_court,
          status,
          mention_date,
          listing_date,
          judge_name,
          motion_type,
          created_at,
          cases(case_number)
        `)
        .order('hearing_date', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      // All users can see all hearings
      const { data, error } = await query;

      if (error) throw error;

      const formattedData = data?.map((h: any) => ({
        ...h,
        case_number: h.cases?.case_number || 'N/A'
      })) || [];

      setHearings(formattedData);
    } catch (error: any) {
      console.error('Error loading hearings:', error);
      toast.error('Failed to load hearings');
    } finally {
      setLoading(false);
    }
  };

  const filteredHearings = hearings.filter(h =>
    h.case_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.hearing_court?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get tomorrow's date
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const tomorrowHearings = hearings.filter(h => {
    if (!h.hearing_date) return false;
    const hearingDate = new Date(h.hearing_date);
    hearingDate.setHours(0, 0, 0, 0);
    return hearingDate.getTime() === tomorrow.getTime();
  });

  // Sort filtered hearings: tomorrow's first, then by hearing date
  const sortedFilteredHearings = [...filteredHearings].sort((a, b) => {
    const aDate = new Date(a.hearing_date || '');
    const bDate = new Date(b.hearing_date || '');
    
    const aTomorrow = tomorrowHearings.some(h => h.id === a.id);
    const bTomorrow = tomorrowHearings.some(h => h.id === b.id);
    
    if (aTomorrow && !bTomorrow) return -1;
    if (!aTomorrow && bTomorrow) return 1;
    return aDate.getTime() - bDate.getTime();
  });

  const disposedCount = hearings.filter(h => h.status === 'disposed').length;
  const pendingCount = hearings.filter(h => h.status === 'pending').length;
  const adjournedCount = hearings.filter(h => h.status === 'adjourned').length;
  const tomorrowCount = tomorrowHearings.length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'disposed':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'adjourned':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'disposed':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'adjourned':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Hearings</h1>
          <p className="text-gray-600 mt-1">Monthly Hearings - Disposed vs Pending</p>
        </div>
        {isAdmin && (
          <Link
            to="/cases/new"
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Hearing</span>
          </Link>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <p className="text-gray-600 text-sm font-medium">Total Hearings</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{hearings.length}</p>
        </div>
        <div className="bg-red-50 rounded-lg shadow border border-red-200 p-4">
          <p className="text-red-600 text-sm font-medium">🔴 Tomorrow's Hearings</p>
          <p className="text-2xl font-bold text-red-700 mt-1">{tomorrowCount}</p>
          <p className="text-xs text-red-500 mt-1">Priority List</p>
        </div>
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <p className="text-gray-600 text-sm font-medium">Pending</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">{pendingCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <p className="text-gray-600 text-sm font-medium">Disposed</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{disposedCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <p className="text-gray-600 text-sm font-medium">Adjourned</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{adjournedCount}</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by case number or court..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            {['all', 'pending', 'disposed', 'adjourned'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status as any)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filterStatus === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Hearings Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        {sortedFilteredHearings.length === 0 ? (
          <div className="p-8 text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No hearings found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Case Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Hearing Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Court</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Mention Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Judge</th>
                </tr>
              </thead>
              <tbody>
                {sortedFilteredHearings.map((hearing, index) => {
                  const isTomorrow = tomorrowHearings.some(h => h.id === hearing.id);
                  return (
                    <tr 
                      key={hearing.id} 
                      className={`${
                        isTomorrow ? 'bg-red-50 border-l-4 border-red-500' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}
                    >
                      <td className="px-6 py-4 text-sm">
                        {isTomorrow && (
                          <span className="inline-flex items-center justify-center w-6 h-6 bg-red-500 text-white rounded-full text-xs font-bold" title="Tomorrow's Hearing">
                            !
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-blue-600">
                        <Link to={`/cases/${hearing.case_id}`} className="hover:underline">
                          {hearing.case_number}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(hearing.hearing_date).toLocaleDateString()}
                        {isTomorrow && <span className="ml-2 text-red-600 font-bold">TOMORROW</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{hearing.hearing_court}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(hearing.status)}`}>
                          {getStatusIcon(hearing.status)}
                          <span>{hearing.status.charAt(0).toUpperCase() + hearing.status.slice(1)}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {hearing.mention_date ? new Date(hearing.mention_date).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{hearing.judge_name || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
