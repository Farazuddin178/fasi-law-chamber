import { useEffect, useState } from 'react';
import { auditLogsDB, AuditLog } from '@/lib/database';
import { History, User as UserIcon, Calendar, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

interface AuditHistoryProps {
  caseId: string;
}

export default function AuditHistory({ caseId }: AuditHistoryProps) {
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAuditLogs();
  }, [caseId]);

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await auditLogsDB.getByCaseId(caseId);
      
      if (error) {
        toast.error('Failed to load audit history');
        console.error(error);
        return;
      }
      
      setAuditLogs(data || []);
    } catch (error) {
      console.error('Audit log error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatFieldName = (field: string): string => {
    return field
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (auditLogs.length === 0) {
    return (
      <div className="text-center p-8 bg-gray-50 rounded-lg">
        <History className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">No changes recorded yet</p>
        <p className="text-gray-500 text-sm mt-1">
          Case modifications will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-4">
        <History className="w-5 h-5 text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          Audit History ({auditLogs.length})
        </h3>
      </div>

      <div className="space-y-3">
        {auditLogs.map((log) => (
          <div
            key={log.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-gray-900">
                    {formatFieldName(log.changed_field)}
                  </span>
                  <span className="text-gray-500 text-sm">changed</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-6">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">From:</p>
                    <p className="text-sm text-gray-700 bg-red-50 border border-red-200 rounded px-2 py-1 break-words">
                      {log.old_value || '(empty)'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">To:</p>
                    <p className="text-sm text-gray-700 bg-green-50 border border-green-200 rounded px-2 py-1 break-words">
                      {log.new_value || '(empty)'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <UserIcon className="w-4 h-4" />
                  <span>
                    {log.users?.full_name || log.users?.email || 'Unknown User'}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(log.timestamp)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {auditLogs.length > 0 && (
        <div className="text-center text-sm text-gray-500 pt-4 border-t border-gray-200">
          {auditLogs.length} change{auditLogs.length !== 1 ? 's' : ''} recorded
        </div>
      )}
    </div>
  );
}
