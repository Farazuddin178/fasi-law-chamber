import { useEffect, useState } from 'react';
import { Clock, X } from 'lucide-react';

interface RecentAnnouncementProps {
  announcement: {
    id: string;
    title: string;
    content: string;
    created_at: string;
  } | null;
}

export default function RecentAnnouncement24hr({ announcement }: RecentAnnouncementProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const endTime = announcement
    ? new Date(new Date(announcement.created_at).getTime() + 24 * 60 * 60 * 1000).toLocaleString()
    : '';

  useEffect(() => {
    if (!announcement) {
      setIsExpired(false);
      return;
    }

    const updateTimer = () => {
      const createdTime = new Date(announcement.created_at).getTime();
      const twentyFourHours = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      const expiryTime = createdTime + twentyFourHours;
      const now = new Date().getTime();
      const timeLeft = expiryTime - now;

      if (timeLeft <= 0) {
        setIsExpired(true);
        setTimeRemaining('Expired');
      } else {
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
        setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
        setIsExpired(false);
      }
    };

    // Update immediately
    updateTimer();

    // Update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [announcement]);

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  if (!announcement || isDismissed) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
              <Clock className="w-3 h-3" />
              24hr Timer
            </span>
            <span
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                isExpired
                  ? 'bg-gray-400 text-white'
                  : 'bg-gradient-to-r from-red-400 to-red-600 text-white animate-pulse'
              }`}
            >
              {timeRemaining}
            </span>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">{announcement.title}</h3>
          <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap line-clamp-4">
            {announcement.content}
          </p>
          <p className="text-xs text-gray-500 mt-3">
            Posted: {new Date(announcement.created_at).toLocaleString()} · Ends: {endTime}
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 hover:bg-white p-2 rounded-lg transition"
          title="Dismiss this announcement"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
