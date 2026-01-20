import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { HardDrive, Database, FileText, FolderOpen, AlertTriangle, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

interface StorageStats {
  total_cases: number;
  total_documents: number;
  total_storage_bytes: number;
  total_users: number;
  storage_limit_bytes: number;
  storage_percentage: number;
}

export default function StorageMonitoringPage() {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user?.role === 'admin') {
      loadStorageStats();
    }
  }, [user]);

  const loadStorageStats = async () => {
    try {
      setLoading(true);

      // Get counts from each table
      const [casesRes, docsRes, usersRes, storageRes] = await Promise.all([
        supabase.from('cases').select('id', { count: 'exact', head: true }),
        supabase.from('documents').select('file_size', { count: 'exact' }),
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('storage_stats').select('*').order('last_updated', { ascending: false }).limit(1)
      ]);

      // Calculate total storage from documents
      const totalStorage = docsRes.data?.reduce((sum, doc) => sum + (doc.file_size || 0), 0) || 0;
      
      // Supabase free tier limit: 500MB = 524,288,000 bytes
      const storageLimit = 524288000;
      const storagePercentage = (totalStorage / storageLimit) * 100;

      const storageStats: StorageStats = {
        total_cases: casesRes.count || 0,
        total_documents: docsRes.count || 0,
        total_storage_bytes: totalStorage,
        total_users: usersRes.count || 0,
        storage_limit_bytes: storageLimit,
        storage_percentage: storagePercentage
      };

      // Update storage_stats table
      await supabase.from('storage_stats').upsert({
        id: 1,
        total_cases: storageStats.total_cases,
        total_documents: storageStats.total_documents,
        total_storage_bytes: storageStats.total_storage_bytes,
        last_updated: new Date().toISOString()
      });

      setStats(storageStats);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load storage stats');
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getStorageStatusColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600 bg-red-50 border-red-200';
    if (percentage >= 75) return 'text-orange-600 bg-orange-50 border-orange-200';
    if (percentage >= 50) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <AlertTriangle className="w-16 h-16 text-gray-400 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600">Only administrators can access storage monitoring.</p>
      </div>
    );
  }

  if (loading) {
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
          <h1 className="text-3xl font-bold text-gray-900">Storage Monitoring</h1>
          <p className="text-gray-600 mt-1">Monitor database and storage usage</p>
        </div>
        <button
          onClick={loadStorageStats}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <TrendingUp className="w-5 h-5" />
          Refresh Stats
        </button>
      </div>

      {/* Storage Alert */}
      {stats && stats.storage_percentage >= 75 && (
        <div className={`border-2 rounded-xl p-6 ${getStorageStatusColor(stats.storage_percentage)}`}>
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-8 h-8 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-bold mb-2">
                {stats.storage_percentage >= 90 ? 'Critical Storage Alert' : 'Storage Warning'}
              </h3>
              <p className="text-sm mb-3">
                {stats.storage_percentage >= 90
                  ? 'You are approaching your storage limit. Consider archiving old cases or upgrading your plan.'
                  : 'Your storage usage is getting high. Consider reviewing and optimizing your data.'}
              </p>
              <ul className="text-sm space-y-1 ml-4 list-disc">
                <li>Current Usage: {formatBytes(stats.total_storage_bytes)} / {formatBytes(stats.storage_limit_bytes)}</li>
                <li>Percentage Used: {stats.storage_percentage.toFixed(2)}%</li>
                <li>Remaining: {formatBytes(stats.storage_limit_bytes - stats.total_storage_bytes)}</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <FolderOpen className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">Total Cases</p>
          <p className="text-3xl font-bold text-gray-900">{stats?.total_cases || 0}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <FileText className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">Total Documents</p>
          <p className="text-3xl font-bold text-gray-900">{stats?.total_documents || 0}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <HardDrive className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">Storage Used</p>
          <p className="text-2xl font-bold text-gray-900">{stats && formatBytes(stats.total_storage_bytes)}</p>
          <p className="text-xs text-gray-500 mt-1">of {stats && formatBytes(stats.storage_limit_bytes)}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-100 rounded-lg">
              <Database className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">Storage Percentage</p>
          <p className="text-3xl font-bold text-gray-900">{stats?.storage_percentage.toFixed(1)}%</p>
        </div>
      </div>

      {/* Storage Progress Bar */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Storage Usage Overview</h3>
        <div className="space-y-3">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Used: {stats && formatBytes(stats.total_storage_bytes)}</span>
            <span>Available: {stats && formatBytes(stats.storage_limit_bytes - stats.total_storage_bytes)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className={`h-4 rounded-full transition-all duration-500 ${
                stats && stats.storage_percentage >= 90
                  ? 'bg-red-600'
                  : stats && stats.storage_percentage >= 75
                  ? 'bg-orange-600'
                  : stats && stats.storage_percentage >= 50
                  ? 'bg-yellow-600'
                  : 'bg-green-600'
              }`}
              style={{ width: `${stats?.storage_percentage || 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Admin Guidance */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Storage Management Guidance</h3>
        <div className="space-y-4">
          <div className="border-l-4 border-blue-500 pl-4">
            <h4 className="font-semibold text-gray-900 mb-2">Data Optimization Tips</h4>
            <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
              <li>Regularly archive closed cases to reduce database load</li>
              <li>Delete unnecessary documents and duplicate files</li>
              <li>Compress large PDF files before uploading</li>
              <li>Use the GitHub integration for long-term data backup</li>
            </ul>
          </div>

          <div className="border-l-4 border-green-500 pl-4">
            <h4 className="font-semibold text-gray-900 mb-2">When to Archive Data</h4>
            <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
              <li>Cases older than 5 years with "Closed" status</li>
              <li>Completed tasks with no recent activity</li>
              <li>Approved expenses from previous fiscal years</li>
              <li>Old login logs (keep last 90 days only)</li>
            </ul>
          </div>

          <div className="border-l-4 border-orange-500 pl-4">
            <h4 className="font-semibold text-gray-900 mb-2">GitHub Backup Strategy</h4>
            <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
              <li>Configure GitHub integration in Settings page</li>
              <li>Export cases as JSON for version control</li>
              <li>Schedule regular backups to GitHub repository</li>
              <li>Use GitHub for historical case data storage</li>
            </ul>
          </div>

          <div className="border-l-4 border-red-500 pl-4">
            <h4 className="font-semibold text-gray-900 mb-2">Critical Actions Required</h4>
            <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
              <li>If storage exceeds 90%, immediate action required</li>
              <li>Contact support for storage upgrade options</li>
              <li>Export and delete old documents from storage</li>
              <li>Consider migrating to dedicated database solution</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
