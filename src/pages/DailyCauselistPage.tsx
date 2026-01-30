import { useState, useEffect } from 'react';
import { ArrowLeft, RefreshCw, Bell, BellOff, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

interface CauselistCase {
  sl_no: string;
  case: string;
  party_details: string;
  petitioner_advocate: string;
  respondent_advocate: string;
  district: string;
}

interface CauselistData {
  cases: CauselistCase[];
  totalCases: number;
  lastUpdated: string;
}

export default function DailyCauselistPage() {
  const [advCode, setAdvCode] = useState('19272');
  const [listDate, setListDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CauselistData | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastCaseCount, setLastCaseCount] = useState(0);

  const fetchCauselist = async () => {
    if (!advCode.trim()) {
      toast.error('Please enter advocate code');
      return;
    }

    setLoading(true);
    try {
      const backendURL = window.location.hostname === 'localhost' 
        ? 'http://localhost:5001'
        : ''; // Empty string = use same domain
      // Match the court website parameter names: advocateCode and listDate
      let url = `${backendURL}/getDailyCauselist?advocateCode=${encodeURIComponent(advCode.trim())}`;
      if (listDate.trim()) {
        url += `&listDate=${encodeURIComponent(listDate.trim())}`;
      }
      
      console.log('Fetching from:', url);
      const resp = await fetch(url);
      
      if (!resp.ok) {
        let errorMsg = `Server error: ${resp.status}`;
        try {
          const errData = await resp.json();
          errorMsg = errData.error || errorMsg;
        } catch {
          errorMsg = await resp.text() || errorMsg;
        }
        throw new Error(errorMsg);
      }
      
      const result = await resp.json();
      
      if (result.error) {
        throw new Error(result.error || 'Server returned an error');
      }

      // Check for changes and notify
      if (data && result.totalCases !== lastCaseCount && lastCaseCount > 0) {
        const diff = result.totalCases - lastCaseCount;
        if (diff > 0) {
          toast.success(`🔔 ${diff} new case(s) added to your daily list!`, { duration: 5000 });
        } else if (diff < 0) {
          toast(`${Math.abs(diff)} case(s) removed from your daily list`, { duration: 5000 });
        }
      }

      setData(result);
      setLastCaseCount(result.totalCases);
      
      if (!autoRefresh) {
        toast.success(`Causelist loaded successfully (${result.totalCases} cases)`);
      }
    } catch (e: any) {
      console.error('Fetch error:', e);
      toast.error(e?.message || 'Failed to load causelist. Check browser console.');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchCauselist();
      }, 5 * 60 * 1000); // 5 minutes

      return () => clearInterval(interval);
    }
  }, [autoRefresh, advCode, listDate]);

  useEffect(() => {
    fetchCauselist();
  }, []);

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-7xl">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link to="/links" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Daily Causelist</h2>
              <p className="text-gray-600">View tomorrow's hearing list for your advocate code</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Advocate Code (e.g., 19272)"
              value={advCode}
              onChange={(e) => setAdvCode(e.target.value)}
              className="w-40 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="date"
              value={listDate}
              onChange={(e) => setListDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={fetchCauselist}
              disabled={loading}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
              <span>{loading ? 'Loading...' : 'Fetch'}</span>
            </button>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${
                autoRefresh
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-gray-50 border-gray-200 text-gray-700'
              }`}
            >
              {autoRefresh ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              <span>{autoRefresh ? 'Monitoring' : 'Monitor Off'}</span>
            </button>
          </div>
        </div>

        {data && (
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-sm text-blue-600 font-semibold">Total Cases</p>
                <p className="text-2xl font-bold text-gray-900">{data.totalCases}</p>
              </div>
              <div className="h-12 w-px bg-blue-200"></div>
              <div>
                <p className="text-sm text-blue-600 font-semibold">Last Updated</p>
                <p className="text-sm text-gray-700">{new Date(data.lastUpdated).toLocaleString()}</p>
              </div>
            </div>
            {autoRefresh && (
              <div className="text-sm text-emerald-600 font-medium">
                🔔 Auto-refreshing every 5 minutes
              </div>
            )}
          </div>
        )}
      </div>

      {data && data.cases.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <h3 className="text-xl font-bold text-gray-900">Tomorrow's Hearing List</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Sl.No.
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Case
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Party Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Petitioner Advocate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Respondent Advocate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    District/Remarks
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.cases.map((c, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{c.sl_no}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{c.case}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{c.party_details}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{c.petitioner_advocate}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{c.respondent_advocate}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{c.district}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data && data.cases.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Cases Scheduled</h3>
          <p className="text-gray-600">No cases found for this advocate code in tomorrow's causelist.</p>
        </div>
      )}

      {!data && !loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">💡 Daily Causelist Tips</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Enter your advocate code and click "Fetch" to see tomorrow's hearing list</li>
            <li>• Enable monitoring to get automatic updates every 5 minutes</li>
            <li>• You'll receive notifications when new cases are added or removed</li>
            <li>• Keep this tab open to stay updated with real-time changes</li>
          </ul>
        </div>
      )}
    </div>
  );
}
