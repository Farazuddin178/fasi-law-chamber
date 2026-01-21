import { useEffect, useState } from 'react';
import { supabase, Task, TaskComment, User, Case } from '@/lib/supabase';
import { Plus, Filter, X, MessageCircle, Send, Edit, Trash, CheckCircle, Clock, AlertCircle, Calendar, Search, ThumbsUp, ThumbsDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<(TaskComment & { user?: User })[]>([]);
  const [newComment, setNewComment] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const { user } = useAuth();

  // Filter and search states
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [assignedFilter, setAssignedFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Task response states
  const [showTaskResponse, setShowTaskResponse] = useState(false);
  const [taskResponseStatus, setTaskResponseStatus] = useState<'accepted' | 'passed_on'>('passed_on');
  const [passOnReason, setPassOnReason] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    case_id: '',
    assigned_to: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    status: 'pending' as 'pending' | 'in_progress' | 'completed' | 'cancelled',
    due_date: '',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  useEffect(() => {
    loadInitialData();
    setupRealtimeSubscription();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [tasks, statusFilter, priorityFilter, assignedFilter, searchTerm]);

  const loadInitialData = async () => {
    await Promise.all([loadTasks(), loadUsers(), loadCases()]);
  };

  const loadTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error('Failed to load users:', error);
    }
  };

  const loadCases = async () => {
    try {
      const { data, error } = await supabase
        .from('cases')
        .select('id, case_number')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCases(data || []);
    } catch (error: any) {
      console.error('Failed to load cases:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    const tasksChannel = supabase
      .channel('tasks_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        loadTasks();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(tasksChannel);
    };
  };

  const applyFilters = () => {
    let filtered = [...tasks];

    // Filter by search term
    if (searchTerm.trim()) {
      filtered = filtered.filter(task =>
        task.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(task => task.status === statusFilter);
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(task => task.priority === priorityFilter);
    }

    if (assignedFilter !== 'all') {
      if (assignedFilter === 'me') {
        filtered = filtered.filter(task => task.assigned_to === user?.id);
      } else {
        filtered = filtered.filter(task => task.assigned_to === assignedFilter);
      }
    }

    setFilteredTasks(filtered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Task title is required');
      return;
    }

    try {
      if (isEditing && editingTaskId) {
        // Update existing task
        const { error } = await supabase
          .from('tasks')
          .update(formData)
          .eq('id', editingTaskId);

        if (error) throw error;
        toast.success('Task updated successfully');
      } else {
        // Create new task
        const { error } = await supabase
          .from('tasks')
          .insert({
            ...formData,
            created_by: user?.id,
          });

        if (error) throw error;
        toast.success('Task created successfully');
      }

      resetForm();
      setShowCreateModal(false);
      loadTasks();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save task');
    }
  };

  const handleEdit = (task: Task) => {
    setFormData({
      title: task.title,
      description: task.description || '',
      case_id: task.case_id || '',
      assigned_to: task.assigned_to || '',
      priority: task.priority,
      status: task.status,
      due_date: task.due_date || '',
    });
    setIsEditing(true);
    setEditingTaskId(task.id);
    setShowCreateModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      // Delete comments first
      await supabase.from('task_comments').delete().eq('task_id', id);
      
      // Delete task
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
      
      toast.success('Task deleted successfully');
      loadTasks();
      
      if (selectedTask?.id === id) {
        setShowTaskDetail(false);
        setSelectedTask(null);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete task');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      case_id: '',
      assigned_to: '',
      priority: 'medium',
      status: 'pending',
      due_date: '',
    });
    setIsEditing(false);
    setEditingTaskId(null);
  };

  const openTaskDetail = async (task: Task) => {
    setSelectedTask(task);
    setShowTaskDetail(true);
    await loadComments(task.id);
    setupCommentsSubscription(task.id);
  };

  const loadComments = async (taskId: string) => {
    try {
      const { data, error } = await supabase
        .from('task_comments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch user details for each comment
      const commentsWithUsers = await Promise.all(
        (data || []).map(async (comment) => {
          const { data: userData } = await supabase
            .from('users')
            .select('*')
            .eq('id', comment.user_id)
            .single();
          
          return { ...comment, user: userData };
        })
      );

      setComments(commentsWithUsers);
    } catch (error: any) {
      console.error('Failed to load comments:', error);
    }
  };

  const setupCommentsSubscription = (taskId: string) => {
    const commentsChannel = supabase
      .channel(`task_comments_${taskId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'task_comments',
        filter: `task_id=eq.${taskId}`
      }, () => {
        loadComments(taskId);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(commentsChannel);
    };
  };

  const sendComment = async () => {
    if (!newComment.trim() || !selectedTask) return;

    try {
      const { error } = await supabase
        .from('task_comments')
        .insert({
          task_id: selectedTask.id,
          user_id: user?.id,
          comment: newComment.trim(),
        });

      if (error) throw error;
      setNewComment('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send comment');
    }
  };

  const handleTaskResponse = async (response: 'accepted' | 'passed_on', reason?: string) => {
    if (!selectedTask) return;

    try {
      // Save task response
      const { error: responseError } = await supabase
        .from('task_responses')
        .insert({
          task_id: selectedTask.id,
          user_id: user?.id,
          status: response,
          reason: reason || null,
          created_at: new Date().toISOString(),
        });

      if (responseError) throw responseError;

      // Add system comment
      const systemComment = response === 'accepted'
        ? `${user?.full_name} accepted this task`
        : `${user?.full_name} passed on this task. Reason: ${reason}`;

      await supabase
        .from('task_comments')
        .insert({
          task_id: selectedTask.id,
          user_id: user?.id,
          comment: systemComment,
        });

      toast.success(response === 'accepted' ? 'Task accepted!' : 'Task passed on successfully!');
      setShowTaskResponse(false);
      setPassOnReason('');
      loadComments(selectedTask.id);
    } catch (error: any) {
      toast.error(error.message || 'Failed to respond to task');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'in_progress': return <Clock className="w-4 h-4" />;
      case 'pending': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getTimeRemaining = (dueDate: string | null) => {
    if (!dueDate) return null;
    
    const now = new Date().getTime();
    const due = new Date(dueDate).getTime();
    const diff = due - now;
    
    if (diff < 0) return { text: 'Overdue', color: 'text-red-600 font-bold', urgent: true };
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return { text: `${days} day${days > 1 ? 's' : ''} left`, color: 'text-gray-600', urgent: false };
    } else if (hours > 0) {
      return { text: `${hours} hour${hours > 1 ? 's' : ''} left`, color: 'text-orange-600 font-semibold', urgent: true };
    } else {
      const minutes = Math.floor(diff / (1000 * 60));
      return { text: `${minutes} min left`, color: 'text-red-600 font-bold', urgent: true };
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
          <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
          <p className="text-gray-600 mt-1">Manage tasks and collaborate with your team</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5" />
          New Task
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Filters & Search</h3>
        </div>
        
        {/* Search Bar */}
        <div className="mb-4">
          <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-lg border border-gray-300">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks by title or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent outline-none text-gray-700 placeholder-gray-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {searchTerm && (
            <p className="text-xs text-gray-600 mt-2">
              Found {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
            <select
              value={assignedFilter}
              onChange={(e) => setAssignedFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Users</option>
              <option value="me">My Tasks</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredTasks.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 border border-gray-200 text-center">
            <p className="text-gray-500 text-lg">No tasks found</p>
            <p className="text-gray-400 text-sm mt-2">Create a new task to get started</p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const assignedUser = users.find(u => u.id === task.assigned_to);
            const linkedCase = cases.find(c => c.id === task.case_id);
            
            return (
              <div
                key={task.id}
                className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition cursor-pointer"
                onClick={() => openTaskDetail(task)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                        {task.priority.toUpperCase()}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getStatusColor(task.status)}`}>
                        {getStatusIcon(task.status)}
                        {task.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    
                    {task.description && (
                      <p className="text-gray-600 mb-3 line-clamp-2">{task.description}</p>
                    )}
                    
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      {assignedUser && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Assigned to:</span>
                          <span>{assignedUser.full_name}</span>
                        </div>
                      )}
                      {linkedCase && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Case:</span>
                          <span>{linkedCase.case_number}</span>
                        </div>
                      )}
                      {task.due_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                        </div>
                      )}
                      {task.due_date && getTimeRemaining(task.due_date) && (
                        <div className={`flex items-center gap-1 ${getTimeRemaining(task.due_date)?.color} ${getTimeRemaining(task.due_date)?.urgent ? 'animate-pulse' : ''}`}>
                          <Clock className="w-4 h-4" />
                          <span className="font-semibold">{getTimeRemaining(task.due_date)?.text}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleEdit(task)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="Edit Task"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Delete Task"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openTaskDetail(task)}
                      className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition"
                      title="View Comments"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create/Edit Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">
                {isEditing ? 'Edit Task' : 'Create New Task'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Task Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter task title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter task description"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Link to Case</label>
                  <select
                    value={formData.case_id}
                    onChange={(e) => setFormData({ ...formData, case_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">No case linked</option>
                    {cases.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.case_number}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
                  <select
                    value={formData.assigned_to}
                    onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Unassigned</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  {isEditing ? 'Update Task' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Detail with Comments Modal */}
      {showTaskDetail && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Task Details & Discussion</h2>
              <button
                onClick={() => {
                  setShowTaskDetail(false);
                  setSelectedTask(null);
                  setComments([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {/* Task Details */}
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-2xl font-bold text-gray-900">{selectedTask.title}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(selectedTask.priority)}`}>
                    {selectedTask.priority.toUpperCase()}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getStatusColor(selectedTask.status)}`}>
                    {getStatusIcon(selectedTask.status)}
                    {selectedTask.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                
                {selectedTask.description && (
                  <p className="text-gray-700 mb-4">{selectedTask.description}</p>
                )}
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {selectedTask.assigned_to && (
                    <div>
                      <span className="font-medium text-gray-600">Assigned to:</span>
                      <p className="text-gray-900">{users.find(u => u.id === selectedTask.assigned_to)?.full_name || 'Unknown'}</p>
                    </div>
                  )}
                  {selectedTask.case_id && (
                    <div>
                      <span className="font-medium text-gray-600">Linked Case:</span>
                      <p className="text-gray-900">{cases.find(c => c.id === selectedTask.case_id)?.case_number || 'Unknown'}</p>
                    </div>
                  )}
                  {selectedTask.due_date && (
                    <div>
                      <span className="font-medium text-gray-600">Due Date:</span>
                      <p className="text-gray-900">{new Date(selectedTask.due_date).toLocaleDateString()}</p>
                    </div>
                  )}
                  <div>
                    <span className="font-medium text-gray-600">Created:</span>
                    <p className="text-gray-900">{new Date(selectedTask.created_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Team Discussion ({comments.length})
                </h4>

                {/* Comments List */}
                <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
                  {comments.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No comments yet. Start the discussion!</p>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {comment.user?.full_name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 bg-gray-50 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-semibold text-gray-900">{comment.user?.full_name || 'Unknown User'}</span>
                            <span className="text-xs text-gray-500">
                              {new Date(comment.created_at).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-gray-700 whitespace-pre-wrap">{comment.comment}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Comment Input */}
            <div className="border-t border-gray-200 p-4 bg-gray-50">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendComment();
                    }
                  }}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={sendComment}
                  disabled={!newComment.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Send
                </button>
              </div>

              {/* Task Response Buttons (for restricted_admin) */}
              {user?.role === 'restricted_admin' && selectedTask?.assigned_to === user?.id && (
                <div className="mt-4 pt-4 border-t border-gray-300 flex gap-2">
                  <button
                    onClick={() => handleTaskResponse('accepted')}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
                  >
                    <ThumbsUp className="w-4 h-4" />
                    Accept Task
                  </button>
                  <button
                    onClick={() => setShowTaskResponse(true)}
                    className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition flex items-center justify-center gap-2"
                  >
                    <ThumbsDown className="w-4 h-4" />
                    Pass On
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Task Response Modal (Pass On) */}
      {showTaskResponse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-bold text-gray-900">Pass On Task</h2>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-gray-700">
                Please provide a reason for passing on this task. This will be sent to the admin.
              </p>

              <textarea
                value={passOnReason}
                onChange={(e) => setPassOnReason(e.target.value)}
                rows={5}
                placeholder="Enter reason for passing on this task..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowTaskResponse(false);
                    setPassOnReason('');
                  }}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!passOnReason.trim()) {
                      toast.error('Please provide a reason');
                      return;
                    }
                    handleTaskResponse('passed_on', passOnReason);
                    setShowTaskResponse(false);
                  }}
                  className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
                >
                  Confirm Pass On
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
