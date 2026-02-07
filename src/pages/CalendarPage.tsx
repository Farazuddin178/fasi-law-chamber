import { useEffect, useState } from 'react';
import { supabase, Task, User, Case } from '@/lib/supabase';
import { ChevronLeft, ChevronRight, Calendar, Clock, Printer, ListChecks } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'task' | 'hearing' | 'listing' | 'causelist';
  status?: string;
  details?: string;
  assignedTo?: string;
  location?: string;
  data: any;
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [advocateCode, setAdvocateCode] = useState('19272');
  const [savingCauseList, setSavingCauseList] = useState(false);
  const { user } = useAuth();
  const userId = (user as any)?.id ?? (user as any)?.user_id ?? (user as any)?.uid ?? null;

  useEffect(() => {
    loadData();
  }, [user]);

  const formatDateToDDMMYYYY = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const parseDDMMYYYY = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;
    const [day, month, year] = parts.map(p => parseInt(p, 10));
    if (Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year)) return null;
    return new Date(year, month - 1, day);
  };

  const loadData = async () => {
    try {
      // Load tasks with due dates
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .order('due_date', { ascending: true });

      // Load cases with listing/return dates
      const { data: casesData } = await supabase
        .from('cases')
        .select('*')
        .order('created_at', { ascending: false });

      // Load hearings table (manual/scheduled entries)
      const { data: hearingsData } = await supabase
        .from('hearings')
        .select('*')
        .order('hearing_date', { ascending: true });

      // Load saved causelists
      const { data: causeListsData } = await supabase
        .from('causelist_history')
        .select('*')
        .order('saved_at', { ascending: false });

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

      // Add listing/hearing events from cases
      (casesData || []).forEach((caseItem: Case) => {
        if (caseItem.listing_date) {
          calendarEvents.push({
            id: `listing-${caseItem.id}`,
            title: `Listing: ${caseItem.case_number || 'N/A'}`,
            date: new Date(caseItem.listing_date),
            type: 'listing',
            status: caseItem.status,
            details: caseItem.purpose || '',
            location: caseItem.jud_name || '',
            data: caseItem,
          });
        }

        if (caseItem.return_date) {
          calendarEvents.push({
            id: `hearing-${caseItem.id}`,
            title: `Hearing: ${caseItem.case_number || 'N/A'}`,
            date: new Date(caseItem.return_date),
            type: 'hearing',
            status: caseItem.status,
            details: caseItem.purpose || '',
            location: caseItem.jud_name || '',
            data: caseItem,
          });
        }
      });

      // Add hearing events from hearings table (manual entries)
      (hearingsData || []).forEach((hearing: any) => {
        if (hearing.hearing_date) {
          calendarEvents.push({
            id: `hearing-entry-${hearing.id}`,
            title: `Hearing: ${hearing.case_number || hearing.case_id || 'N/A'}`,
            date: new Date(hearing.hearing_date),
            type: 'hearing',
            status: hearing.status || 'pending',
            details: hearing.motion_type || '',
            location: hearing.hearing_court || hearing.judge_name || '',
            data: hearing,
          });
        }
      });

      // Add saved causelist entries
      (causeListsData || []).forEach((row: any) => {
        const date = parseDDMMYYYY(row.date) || (row.saved_at ? new Date(row.saved_at) : null);
        if (!date) return;

        calendarEvents.push({
          id: `causelist-${row.id}`,
          title: `Causelist: ${row.advocate_code || 'N/A'} (${row.total_cases || 0})`,
          date,
          type: 'causelist',
          status: 'saved',
          details: `Total cases: ${row.total_cases || 0}`,
          location: '',
          data: row,
        });
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
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.getDate() === day &&
        eventDate.getMonth() === currentDate.getMonth() &&
        eventDate.getFullYear() === currentDate.getFullYear();
    });
  };

  const getEventsForSelectedDate = (): CalendarEvent[] => {
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.getDate() === selectedDate.getDate() &&
        eventDate.getMonth() === selectedDate.getMonth() &&
        eventDate.getFullYear() === selectedDate.getFullYear();
    });
  };

  const goToPreviousMonth = () => {
    const next = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    setCurrentDate(next);
    setSelectedDate(next);
    setSelectedEvent(null);
  };

  const goToNextMonth = () => {
    const next = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    setCurrentDate(next);
    setSelectedDate(next);
    setSelectedEvent(null);
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

  const getEventColor = (event: CalendarEvent) => {
    if (event.type === 'task') return getTaskStatusColor(event.status);
    if (event.type === 'listing') return 'bg-purple-100 text-purple-800';
    if (event.type === 'hearing') return 'bg-orange-100 text-orange-800';
    if (event.type === 'causelist') return 'bg-teal-100 text-teal-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getEventTypeLabel = (event: CalendarEvent) => {
    if (event.type === 'task') return 'TASK';
    if (event.type === 'listing') return 'LISTING';
    if (event.type === 'hearing') return 'HEARING';
    if (event.type === 'causelist') return 'CAUSELIST';
    return 'EVENT';
  };

  const handleSaveCauseListForDate = async (date: Date) => {
    if (!advocateCode.trim()) {
      toast.error('Please enter advocate code');
      return;
    }

    setSavingCauseList(true);
    try {
      const listDate = formatDateToDDMMYYYY(date);

      const { data: existing } = await supabase
        .from('causelist_history')
        .select('id')
        .eq('advocate_code', advocateCode.trim())
        .eq('date', listDate)
        .limit(1)
        .maybeSingle();

      if (existing?.id) {
        toast.success('Causelist already saved for this date');
        return;
      }

      const backendURL = window.location.hostname === 'localhost'
        ? 'http://localhost:5001'
        : '';

      const apiURL = `${backendURL}/getDailyCauselist?advocateCode=${encodeURIComponent(advocateCode.trim())}&listDate=${encodeURIComponent(listDate)}`;
      const response = await fetch(apiURL, { method: 'GET', headers: { 'Accept': 'application/json' } });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      const casesArray = Array.isArray(result) ? result : (Array.isArray(result?.cases) ? result.cases : []);

      const payload = {
        advocate_code: result?.advocate_code || advocateCode.trim(),
        date: result?.date || listDate,
        total_cases: result?.count || casesArray.length,
        cases: casesArray,
        saved_at: new Date().toISOString(),
        saved_by: userId || null
      };

      const { error } = await supabase.from('causelist_history').insert(payload);
      if (error) throw error;

      toast.success('Causelist saved');
      loadData();
    } catch (error: any) {
      console.error('Failed to save causelist:', error);
      toast.error('Failed to save causelist');
    } finally {
      setSavingCauseList(false);
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
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
          <p className="text-gray-600 mt-1">Hearings, listings, and daily causelists</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={advocateCode}
              onChange={(e) => setAdvocateCode(e.target.value)}
              placeholder="Advocate code"
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-36"
            />
            <button
              onClick={() => handleSaveCauseListForDate(selectedDate)}
              disabled={savingCauseList}
              className="flex items-center gap-2 px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition text-sm"
            >
              <ListChecks className="w-4 h-4" />
              {savingCauseList ? 'Saving...' : 'Save Causelist'}
            </button>
          </div>
          <button
            onClick={handlePrintAgenda}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Printer className="w-5 h-5" />
            Print Agenda
          </button>
        </div>
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
              const today = new Date();
              const isToday = 
                day === today.getDate() &&
                currentDate.getMonth() === today.getMonth() &&
                currentDate.getFullYear() === today.getFullYear();

              const counts = dayEvents.reduce(
                (acc, event) => {
                  acc[event.type] = (acc[event.type] || 0) + 1;
                  return acc;
                },
                {} as Record<string, number>
              );

              return (
                <div
                  key={day}
                  onClick={() => {
                    setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
                    setSelectedEvent(null);
                  }}
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
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(event);
                        }}
                        className={`text-xs px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80 transition ${getEventColor(event)}`}
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <p className="text-xs text-gray-500 px-1">
                        +{dayEvents.length - 2} more
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {counts.listing ? (
                        <span className="text-[10px] px-1 rounded bg-purple-100 text-purple-700">L {counts.listing}</span>
                      ) : null}
                      {counts.hearing ? (
                        <span className="text-[10px] px-1 rounded bg-orange-100 text-orange-700">H {counts.hearing}</span>
                      ) : null}
                      {counts.causelist ? (
                        <span className="text-[10px] px-1 rounded bg-teal-100 text-teal-700">C {counts.causelist}</span>
                      ) : null}
                      {counts.task ? (
                        <span className="text-[10px] px-1 rounded bg-gray-100 text-gray-700">T {counts.task}</span>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-sm font-semibold text-gray-700 mb-3">Legend</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-purple-100 border border-purple-300"></div>
                <span>Listing</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-orange-100 border border-orange-300"></div>
                <span>Hearing</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-teal-100 border border-teal-300"></div>
                <span>Causelist</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-gray-100 border border-gray-300"></div>
                <span>Task</span>
              </div>
            </div>
          </div>
        </div>

        {/* Event Details Sidebar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-fit">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-gray-900">Selected Date</h3>
            <p className="text-sm text-gray-600">
              {selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>

          <div className="space-y-2 mb-6">
            {getEventsForSelectedDate().length === 0 ? (
              <p className="text-sm text-gray-500">No events for this date.</p>
            ) : (
              getEventsForSelectedDate().map(event => (
                <button
                  key={event.id}
                  onClick={() => setSelectedEvent(event)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm border ${getEventColor(event)}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{event.title}</span>
                    <span className="text-xs uppercase">{getEventTypeLabel(event)}</span>
                  </div>
                </button>
              ))
            )}
          </div>

          {selectedEvent ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{selectedEvent.title}</h3>
                <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${getEventColor(selectedEvent)}`}>
                  {getEventTypeLabel(selectedEvent)}
                </span>
              </div>

              <div className="space-y-3 border-t border-gray-200 pt-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Date</p>
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

                {selectedEvent.location && (
                  <div>
                    <p className="text-sm font-medium text-gray-600">Court / Judge</p>
                    <p className="text-gray-900">{selectedEvent.location}</p>
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

              {selectedEvent.type === 'task' && (
                <button className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                  View Full Details
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Select an event to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Events List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Upcoming Events</h2>
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
                  event.type === 'listing' ? 'bg-purple-500' :
                  event.type === 'hearing' ? 'bg-orange-500' :
                  event.type === 'causelist' ? 'bg-teal-500' :
                  event.status === 'completed' ? 'bg-green-500' :
                  event.status === 'in_progress' ? 'bg-blue-500' :
                  event.status === 'pending' ? 'bg-yellow-500' :
                  'bg-gray-500'
                }`}></div>

                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{event.title}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                    <Clock className="w-4 h-4" />
                    {new Date(event.date).toLocaleDateString()}
                  </div>
                </div>

                <span className={`px-2 py-1 rounded text-xs font-semibold ${getEventColor(event)}`}>
                  {getEventTypeLabel(event)}
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
