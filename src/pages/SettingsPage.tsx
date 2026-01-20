import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AlertTriangle, Trash2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

const SUPABASE_URL = 'https://hugtbhdqcxjumljglbnc.supabase.co';

export default function SettingsPage() {
  const [showResetModal, setShowResetModal] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState('');
  const [resetting, setResetting] = useState(false);
  const { user } = useAuth();

  const handleDatabaseReset = async () => {
    if (confirmationCode !== 'RESET_ALL_DATA_CONFIRM') {
      toast.error('Invalid confirmation code');
      return;
    }

    setResetting(true);

    try {
      // Call the database-reset edge function  
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${SUPABASE_URL}/functions/v1/database-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({
          adminId: user?.id,
          confirmationCode: 'RESET_ALL_DATA_CONFIRM',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to reset database');
      }

      toast.success('Database reset successfully. Redirecting to login...');
      
      // Logout and redirect
      setTimeout(() => {
        localStorage.clear();
        window.location.href = '/login';
      }, 2000);
    } catch (error: any) {
      toast.error(error.message || 'Failed to reset database');
    } finally {
      setResetting(false);
      setShowResetModal(false);
      setConfirmationCode('');
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <AlertTriangle className="w-16 h-16 text-gray-400 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600">Only administrators can access settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
        <p className="text-gray-600 mt-1">Manage system configuration and data</p>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-xl shadow-sm border border-red-200">
        <div className="bg-red-50 px-6 py-4 border-b border-red-200 rounded-t-xl">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <h2 className="text-xl font-bold text-red-900">Danger Zone</h2>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Database Reset */}
          <div className="border border-red-200 rounded-lg p-6 bg-red-50">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Trash2 className="w-6 h-6 text-red-600" />
                  <h3 className="text-lg font-bold text-red-900">Reset Database</h3>
                </div>
                <p className="text-sm text-red-800 mb-4">
                  This action will permanently delete <strong>ALL</strong> data from the database including:
                </p>
                <ul className="text-sm text-red-800 space-y-1 mb-4 ml-6 list-disc">
                  <li>All cases and case details</li>
                  <li>All tasks and task comments</li>
                  <li>All documents and files (from storage)</li>
                  <li>All expenses and approval records</li>
                  <li>All users except the default admin</li>
                  <li>All login logs and admin logs</li>
                </ul>
                <div className="bg-red-100 border border-red-300 rounded-lg p-4 mb-4">
                  <p className="text-sm font-semibold text-red-900 mb-2">⚠️ WARNING:</p>
                  <ul className="text-sm text-red-800 space-y-1 ml-4 list-disc">
                    <li>This action cannot be undone</li>
                    <li>All data will be permanently lost</li>
                    <li>You will be logged out after reset</li>
                    <li>The system admin will need to reconfigure access</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowResetModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
              >
                <Trash2 className="w-5 h-5" />
                Reset Database
              </button>
            </div>
          </div>

          {/* System Information */}
          <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
            <div className="flex items-center gap-3 mb-4">
              <RefreshCw className="w-6 h-6 text-gray-600" />
              <h3 className="text-lg font-bold text-gray-900">System Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">Database:</span>
                <p className="text-gray-900">Supabase PostgreSQL</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Storage:</span>
                <p className="text-gray-900">Supabase Storage</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Authentication:</span>
                <p className="text-gray-900">Custom Auth System</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Environment:</span>
                <p className="text-gray-900">Production</p>
              </div>
            </div>
          </div>

          {/* Admin Notes */}
          <div className="border border-blue-200 rounded-lg p-6 bg-blue-50">
            <h3 className="text-lg font-bold text-blue-900 mb-3">Admin Notes</h3>
            <div className="space-y-2 text-sm text-blue-800">
              <p><strong>Database Reset Use Cases:</strong></p>
              <ul className="ml-6 list-disc space-y-1">
                <li>Testing and development purposes</li>
                <li>Clearing demo data</li>
                <li>Starting fresh after migration</li>
                <li>Emergency data cleanup</li>
              </ul>
              <p className="mt-4"><strong>Before Resetting:</strong></p>
              <ul className="ml-6 list-disc space-y-1">
                <li>Export important data if needed</li>
                <li>Notify all active users</li>
                <li>Backup critical documents manually</li>
                <li>Ensure you have the default admin credentials</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border-4 border-red-600">
            <div className="bg-red-600 text-white px-6 py-4 rounded-t-lg">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8" />
                <h2 className="text-2xl font-bold">CONFIRM DATABASE RESET</h2>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                <p className="text-red-900 font-bold text-lg mb-2">
                  ⚠️ FINAL WARNING ⚠️
                </p>
                <p className="text-red-800 text-sm mb-3">
                  You are about to <strong>permanently delete ALL data</strong> from the system. 
                  This action <strong>CANNOT BE UNDONE</strong>.
                </p>
                <p className="text-red-800 text-sm font-semibold">
                  All users, cases, tasks, documents, expenses, and logs will be permanently erased.
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  To confirm, type: <span className="text-red-600">RESET_ALL_DATA_CONFIRM</span>
                </label>
                <input
                  type="text"
                  value={confirmationCode}
                  onChange={(e) => setConfirmationCode(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent font-mono text-sm"
                  placeholder="Type the confirmation code..."
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowResetModal(false);
                    setConfirmationCode('');
                  }}
                  disabled={resetting}
                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDatabaseReset}
                  disabled={resetting || confirmationCode !== 'RESET_ALL_DATA_CONFIRM'}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {resetting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Resetting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-5 h-5" />
                      RESET DATABASE
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
