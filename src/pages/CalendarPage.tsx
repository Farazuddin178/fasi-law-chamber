import { useEffect, useState } from 'react';
import { supabase, Task, User, Case } from '@/lib/supabase';
import { ChevronLeft, ChevronRight, Calendar, Clock, MapPin, AlertCircle, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'task' | 'hearing' | 'case';
  status?: string;
  details?: string;
  assignedTo?: string;
  location?: string;
  data: any;
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 0, 23)); // January 23, 2026
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      // Load tasks with due dates
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .order('due_date', { ascending: true });

      // Load cases
      const { data: casesData } = await supabase
        .from('cases')
        .select('*')
        .order('created_at', { ascending: false });

      // Load users
      const { data: usersData } = await supabase
        .from('users')
        .select('*')
        .eq('is_active', true);

      setTasks(tasksData || []);
      setCases(casesData || []);
      setUsers(usersData || []);

      // Build calendar events
      const calendarEvents: CalendarEvent[] = [];

      // Add tasks with due dates
      (tasksData || []).forEach((task: Task) => {
        if (task.due_date) {
          calendarEvents.push({
            id: `task-${task.id}`,
            title: task.title,
            date: new Date(task.due_date),
            type: 'task',
            status: task.status,
            assignedTo: task.assigned_to,
            data: task,
          });
        }
      });

      setEvents(calendarEvents);
    } catch (error: any) {
      toast.error('Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getEventsForDate = (day: number): CalendarEvent[] => {
    const dateToCheck = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.getDate() === day &&
        eventDate.getMonth() === currentDate.getMonth() &&
        eventDate.getFullYear() === currentDate.getFullYear();
    });
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const handlePrintAgenda = () => {
    window.print();
  };

  const monthNames = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ];
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const getTaskStatusColor = (status?: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'unaccepted': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
          <p className="text-gray-600 mt-1">Track your tasks and case hearings</p>
        </div>
        <button
          onClick={handlePrintAgenda}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Printer className="w-5 h-5" />
          Print Agenda
        </button>
      </div>

      {/* Main Calendar Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-gray-900 text-center min-w-[200px]">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {dayNames.map(day => (
              <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {/* Empty cells for days before month starts */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square bg-gray-50 rounded-lg"></div>
            ))}

            {/* Day cells */}
            {daysArray.map(day => {
              const dayEvents = getEventsForDate(day);
              const isToday = 
                day === 23 && 
                currentDate.getMonth() === 0 && 
                currentDate.getFullYear() === 2026;

              return (
                <div
                  key={day}
                  className={`aspect-square rounded-lg border-2 p-2 cursor-pointer transition hover:shadow-md ${
                    isToday
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-blue-300'
                  }`}
                >
                  <p className={`text-sm font-semibold mb-1 ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                    {day}
                  </p>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 2).map(event => (
                      <div
                        key={event.id}
                        onClick={() => setSelectedEvent(event)}
                        className={`text-xs px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80 transition ${getTaskStatusColor(event.status)}`}
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <p className="text-xs text-gray-500 px-1">
                        +{dayEvents.length - 2} more
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-sm font-semibold text-gray-700 mb-3">Status Legend</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300"></div>
                <span>Pending</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-100 border border-blue-300"></div>
                <span>In Progress</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-green-100 border border-green-300"></div>
                <span>Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-red-100 border border-red-300"></div>
                <span>Declined</span>
              </div>
            </div>
          </div>
        </div>

        {/* Event Details Sidebar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-fit">
          {selectedEvent ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{selectedEvent.title}</h3>
                <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${getTaskStatusColor(selectedEvent.status)}`}>
                  {selectedEvent.status?.replace('_', ' ').toUpperCase() || 'TASK'}
                </span>
              </div>

              <div className="space-y-3 border-t border-gray-200 pt-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Due Date</p>
                  <p className="text-gray-900">
                    {new Date(selectedEvent.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>

                {selectedEvent.assignedTo && (
                  <div>
                    <p className="text-sm font-medium text-gray-600">Assigned To</p>
                    <p className="text-gray-900">
                      {users.find(u => u.id === selectedEvent.assignedTo)?.full_name || 'Unknown'}
                    </p>
                  </div>
                )}

                {selectedEvent.data?.description && (
                  <div>
                    <p className="text-sm font-medium text-gray-600">Description</p>
                    <p className="text-sm text-gray-700">{selectedEvent.data.description}</p>
                  </div>
                )}

                {selectedEvent.data?.priority && (
                  <div>
                    <p className="text-sm font-medium text-gray-600">Priority</p>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                      selectedEvent.data.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                      selectedEvent.data.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                      selectedEvent.data.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {selectedEvent.data.priority.toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              <button className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                View Full Details
              </button>
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Select a task to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Events List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Upcoming Tasks & Events</h2>
        <div className="space-y-3">
          {events
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(0, 10)
            .map(event => (
              <div
                key={event.id}
                onClick={() => setSelectedEvent(event)}
                className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:shadow-md transition cursor-pointer"
              >
                <div className={`w-1 h-12 rounded-full ${
                  event.status === 'completed' ? 'bg-green-500' :
                  event.status === 'in_progress' ? 'bg-blue-500' :
                  event.status === 'pending' ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}></div>

                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{event.title}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                    <Clock className="w-4 h-4" />
                    {new Date(event.date).toLocaleDateString()}
                  </div>
                </div>

                <span className={`px-2 py-1 rounded text-xs font-semibold ${getTaskStatusColor(event.status)}`}>
                  {event.status?.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
