// @ts-nocheck
import { useEffect, useState } from 'react';
import { supabase, Case } from '@/lib/supabase';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, FileText, CheckCircle, Clock, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AnalyticsPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  useEffect(() => {
    loadCases();
  }, []);

  const loadCases = async () => {
    try {
      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .order('filing_date', { ascending: true });

      if (error) throw error;
      setCases(data || []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load cases');
    } finally {
      setLoading(false);
    }
  };

  // Filter cases
  const filteredCases = cases.filter(c => {
    if (yearFilter !== 'all' && c.filing_date) {
      const year = new Date(c.filing_date).getFullYear().toString();
      if (year !== yearFilter) return false;
    }
    if (categoryFilter !== 'all' && c.category !== categoryFilter) return false;
    return true;
  });

  // Status breakdown
  const statusData = [
    { name: 'Pending', value: filteredCases.filter(c => c.status === 'pending').length, color: '#fbbf24' },
    { name: 'Filed', value: filteredCases.filter(c => c.status === 'filed').length, color: '#3b82f6' },
    { name: 'Disposed', value: filteredCases.filter(c => c.status === 'disposed').length, color: '#10b981' },
    { name: 'Closed', value: filteredCases.filter(c => c.status === 'closed').length, color: '#6b7280' },
  ].filter(item => item.value > 0); // Only include statuses that have cases

  // Cases by year
  const casesByYear: { [key: string]: { pending: number; filed: number; disposed: number; closed: number } } = {};
  filteredCases.forEach(c => {
    if (c.filing_date && c.status) {
      const year = new Date(c.filing_date).getFullYear().toString();
      if (!casesByYear[year]) {
        casesByYear[year] = { pending: 0, filed: 0, disposed: 0, closed: 0 };
      }
      // Only count if status is one of the expected values
      if (['pending', 'filed', 'disposed', 'closed'].includes(c.status)) {
        casesByYear[year][c.status]++;
      }
    }
  });

  const yearlyData = Object.keys(casesByYear)
    .sort()
    .map(year => {
      const yearData = casesByYear[year];
      return {
        year,
        pending: yearData.pending || 0,
        filed: yearData.filed || 0,
        disposed: yearData.disposed || 0,
        closed: yearData.closed || 0,
        total: (yearData.pending || 0) + (yearData.filed || 0) + (yearData.disposed || 0) + (yearData.closed || 0),
      };
    });

  // Cases by month (current year)
  const currentYear = new Date().getFullYear();
  const casesByMonth: { [key: string]: number } = {};
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  months.forEach(month => casesByMonth[month] = 0);

  const targetYear = yearFilter === 'all' ? currentYear : parseInt(yearFilter);
  filteredCases.forEach(c => {
    if (c.filing_date) {
      const date = new Date(c.filing_date);
      if (date.getFullYear() === targetYear) {
        const month = months[date.getMonth()];
        casesByMonth[month]++;
      }
    }
  });

  const monthlyData = months.map(month => ({
    month,
    cases: casesByMonth[month],
  }));

  // Category breakdown
  const categories = [...new Set(filteredCases.map(c => c.category).filter(Boolean))];
  const categoryData = categories.map(cat => ({
    name: cat || 'Uncategorized',
    value: filteredCases.filter(c => c.category === cat).length,
  })).filter(item => item.value > 0); // Only include categories with cases

  // Statistics
  const stats = [
    {
      title: 'Total Cases',
      value: filteredCases.length,
      icon: FileText,
      color: 'bg-blue-500',
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Pending Cases',
      value: filteredCases.filter(c => c.status === 'pending').length,
      icon: Clock,
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      title: 'Filed Cases',
      value: filteredCases.filter(c => c.status === 'filed').length,
      icon: TrendingUp,
      color: 'bg-indigo-500',
      textColor: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
    {
      title: 'Disposed Cases',
      value: filteredCases.filter(c => c.status === 'disposed').length,
      icon: CheckCircle,
      color: 'bg-green-500',
      textColor: 'text-green-600',
      bgColor: 'bg-green-50',
    },
  ];

  // Get available years
  const availableYears = [...new Set(cases.map(c => {
    if (c.filing_date) {
      return new Date(c.filing_date).getFullYear().toString();
    }
    return null;
  }).filter(Boolean))].sort().reverse();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="text-gray-600 mt-1">Comprehensive case statistics and trends</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Years</option>
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat || 'Uncategorized'}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className={`text-3xl font-bold ${stat.textColor} mt-2`}>{stat.value}</p>
              </div>
              <div className={`${stat.bgColor} p-3 rounded-lg`}>
                <stat.icon className={`w-6 h-6 ${stat.textColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Breakdown Pie Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Case Status Breakdown</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Cases by Category */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Cases by Category</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 gap-6">
        {/* Cases by Year */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Cases by Year (Pending vs Filed)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={yearlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="pending" fill="#fbbf24" name="Pending" />
              <Bar dataKey="filed" fill="#3b82f6" name="Filed" />
              <Bar dataKey="disposed" fill="#10b981" name="Disposed" />
              <Bar dataKey="closed" fill="#6b7280" name="Closed" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Trend */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Monthly Case Trend ({yearFilter === 'all' ? currentYear : yearFilter})
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="cases" stroke="#3b82f6" strokeWidth={2} name="Cases Filed" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Yearly Summary</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Year
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pending
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Filed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Disposed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Closed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {yearlyData.map((row) => (
                <tr key={row.year} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {row.year}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {row.pending}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {row.filed}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {row.disposed}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {row.closed}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    {row.total}
                  </td>
                </tr>
              ))}
              {yearlyData.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
