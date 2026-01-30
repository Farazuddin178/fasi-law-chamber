import { useState, useEffect } from 'react';
import { RefreshCw, Bell, Download, AlertCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

interface SittingArrangement {
  title: string;
  link: string;
  timestamp: string;
}

export default function SittingArrangementsPage() {
  const [arrangements, setArrangements] = useState<SittingArrangement[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [previousCount, setPreviousCount] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchArrangements = async () => {
    setLoading(true);
    try {
      const backendURL = window.location.hostname === 'localhost' 
        ? 'http://localhost:5001'
        : ''; // Empty string = use same domain
      const response = await fetch(`${backendURL}/getSittingArrangements`);
      const data = await response.json();
      
      const newArrangements = data.arrangements || [];
      
      // Check if new items were added
      if (previousCount > 0 && newArrangements.length > previousCount) {
        const newCount = newArrangements.length - previousCount;
        toast.success(`🆕 ${newCount} new sitting arrangement(s) added!`, {
          duration: 5000,
          icon: '📋'
        });
        
        // Send notification to all users about new arrangements
        const { notificationManager } = await import('@/lib/notificationManager');
        const latestArrangement = newArrangements[0];
        await notificationManager.notifySittingArrangementChange(
          latestArrangement.title,
          latestArrangement.link
        );
      }
      
      setArrangements(newArrangements);
      setPreviousCount(newArrangements.length);
      setLastUpdate(new Date().toLocaleTimeString());
      
      if (previousCount === 0 && newArrangements.length > 0) {
        setPreviousCount(newArrangements.length);
      }
    } catch (error) {
      toast.error('Failed to fetch sitting arrangements');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh every 5 minutes
  useEffect(() => {
    fetchArrangements();
    
    let interval: NodeJS.Timeout | null = null;
    if (autoRefresh) {
      interval = setInterval(fetchArrangements, 5 * 60 * 1000); // 5 minutes
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const downloadPDF = (link: string) => {
    if (!link.startsWith('http')) {
      link = 'https://tshc.gov.in' + link;
    }
    window.open(link, '_blank');
  };

  return (
    <div>
      <div className="flex items-center space-x-4 mb-6">
        <Link to="/links" className="text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Sitting Arrangements</h1>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">High Court Roster</h2>
              <p className="text-gray-600 mt-1">Latest sitting arrangements and judge rosters</p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm font-medium text-gray-700">Auto-refresh (5 min)</span>
              </label>
              <button
                onClick={fetchArrangements}
                disabled={loading}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh Now
              </button>
            </div>
          </div>

          {lastUpdate && (
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
              <Bell className="w-4 h-4 text-blue-600" />
              Last updated: <span className="font-semibold">{lastUpdate}</span>
            </div>
          )}
        </div>

        {arrangements.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 flex items-center gap-4">
            <AlertCircle className="w-8 h-8 text-yellow-600 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-yellow-900">No arrangements found</h3>
              <p className="text-yellow-700 text-sm">Click "Refresh Now" to load the latest sitting arrangements</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 text-white">
              <h3 className="text-xl font-bold flex items-center gap-2">
                📋 Recent Arrangements ({arrangements.length})
              </h3>
            </div>
            <div className="divide-y divide-gray-200">
              {arrangements.map((arr, idx) => (
                <div key={idx} className="p-5 hover:bg-blue-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-gray-900">{arr.title}</h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span>📅 {new Date(arr.timestamp).toLocaleDateString()}</span>
                        <span>🕐 {new Date(arr.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => downloadPDF(arr.link)}
                      className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg font-semibold"
                    >
                      <Download className="w-4 h-4" />
                      Download PDF
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-900">
            <span className="font-semibold">💡 Tip:</span> Enable auto-refresh to get automatic notifications when new sitting arrangements are published.
          </p>
        </div>
      </div>
    </div>
  );
}
