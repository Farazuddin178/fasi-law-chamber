import { useEffect, useState } from 'react';
import { ExternalLink, Copy, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

interface QuickLink {
  title: string;
  description: string;
  url: string;
  icon: string;
  category: string;
}

export default function LinksPage() {
  const { user } = useAuth();
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const quickLinks: QuickLink[] = [
    {
      title: 'Live Streaming',
      description: 'Watch live court proceedings',
      url: 'https://tshc.vconsol.com/live-courts',
      icon: '📡',
      category: 'Courts',
    },
    {
      title: 'Roster Change',
      description: 'View roster and judge assignments',
      url: 'https://tshc.vconsol.com/live-courts',
      icon: '👥',
      category: 'Courts',
    },
  ];

  const copyToClipboard = (text: string, title: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(title);
    toast.success('Link copied to clipboard!');
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const groupedLinks = quickLinks.reduce((acc, link) => {
    if (!acc[link.category]) {
      acc[link.category] = [];
    }
    acc[link.category].push(link);
    return acc;
  }, {} as Record<string, QuickLink[]>);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Quick Links</h1>
        <p className="text-gray-600 mt-1">Access important resources and live streams</p>
      </div>

      {Object.entries(groupedLinks).map(([category, links]) => (
        <div key={category}>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">{category}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {links.map((link) => (
              <div
                key={link.title}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="text-3xl">{link.icon}</div>
                  {copiedLink === link.title ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <button
                      onClick={() => copyToClipboard(link.url, link.title)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
                      title="Copy link"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-1">{link.title}</h3>
                <p className="text-sm text-gray-600 mb-4">{link.description}</p>

                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                >
                  <span>Open Link</span>
                  <ExternalLink className="w-4 h-4" />
                </a>

                <p className="text-xs text-gray-500 mt-3 break-all">{link.url}</p>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Additional Resources */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Tips & Information</h2>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>Use the live streaming link to watch court proceedings in real-time</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>Check the roster change link for judge assignments and court schedules</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>Copy any link to share with colleagues or clients</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
