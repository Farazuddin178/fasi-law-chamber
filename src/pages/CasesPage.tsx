import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, Case } from '@/lib/supabase';
import { Plus, Eye, Edit, Trash, Download, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

export default function CasesPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [filteredCases, setFilteredCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { user } = useAuth();

  useEffect(() => {
    loadCases();
  }, []);

  useEffect(() => {
    let filtered = cases;
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(c =>
        c.case_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.primary_petitioner?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.primary_respondent?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.cnr?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => c.status === statusFilter);
    }

    setFilteredCases(filtered);
  }, [searchTerm, statusFilter, cases]);

  const loadCases = async () => {
    try {
      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCases(data || []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load cases');
    } finally {
      setLoading(false);
    }
  };

  const deleteCase = async (id: string) => {
    if (!confirm('Are you sure you want to delete this case?')) return;

    try {
      const { error } = await supabase.from('cases').delete().eq('id', id);
      if (error) throw error;
      toast.success('Case deleted successfully');
      loadCases();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete case');
    }
  };

  const handleBulkExport = () => {
    if (cases.length === 0) {
      toast.error('No cases to export');
      return;
    }

    const exportData = {
      export_date: new Date().toISOString(),
      total_cases: cases.length,
      cases: cases
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `all-cases-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    toast.success(`Exported ${cases.length} cases successfully`);
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>;
  }

  const canEdit = user?.role === 'admin' || user?.role === 'restricted_admin';
  const canDelete = user?.role === 'admin';

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Cases</h1>
        <div className="flex gap-3">
          <button
            onClick={handleBulkExport}
            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            <Download className="w-5 h-5" />
            <span>Export All ({cases.length})</span>
          </button>
          {canEdit && (
            <Link
              to="/cases/new"
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-5 h-5" />
              <span>Add Case</span>
            </Link>
          )}
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-lg border border-gray-300">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by case number, petitioner, respondent, or CNR..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent outline-none text-gray-700"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="filed">Filed</option>
            <option value="disposed">Disposed</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        {searchTerm && (
          <p className="text-sm text-gray-600 mt-2">
            Found {filteredCases.length} case{filteredCases.length !== 1 ? 's' : ''} matching your search
          </p>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-300px)] min-h-[500px]">
        <div className="overflow-auto flex-1 w-full">
          <table className="min-w-full divide-y divide-gray-200 relative">
            <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 whitespace-nowrap w-[15%]">
                  Case Number
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 w-[20%]">
                  Petitioner
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 w-[20%]">
                  Respondent
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 whitespace-nowrap w-[15%]">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 whitespace-nowrap w-[15%]">
                  Filing Date
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 whitespace-nowrap w-[15%]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No cases found {searchTerm && `matching "${searchTerm}"`}
                  </td>
                </tr>
              ) : (
                filteredCases.map((caseItem) => (
                  <tr key={caseItem.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {caseItem.case_number}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500 break-words max-w-[200px]">
                      {caseItem.primary_petitioner || '-'}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500 break-words max-w-[200px]">
                      {caseItem.primary_respondent || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${caseItem.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          caseItem.status === 'filed' ? 'bg-blue-100 text-blue-800' :
                          caseItem.status === 'disposed' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'}`}>
                        {caseItem.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {caseItem.filing_date ? new Date(caseItem.filing_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link
                          to={`/cases/${caseItem.id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Eye className="w-5 h-5" />
                        </Link>
                        {canEdit && (
                          <Link
                            to={`/cases/${caseItem.id}/edit`}
                            className="text-green-600 hover:text-green-900"
                          >
                            <Edit className="w-5 h-5" />
                          </Link>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => deleteCase(caseItem.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
