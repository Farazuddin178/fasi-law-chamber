import { useEffect, useState } from 'react';
import { supabase, Expense, Case, User } from '@/lib/supabase';
import { Plus, DollarSign, CheckCircle, XCircle, Clock, Filter, X, FileDown, Repeat, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { saveHtmlDocument, canPrintToPdf } from '@/lib/download';

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const { user } = useAuth();

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [caseFilter, setCaseFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // Per-case rollup panel
  const [showRollup, setShowRollup] = useState(false);

  /**
   * False when the database has no is_recurring/recurrence_interval columns
   * (i.e. supabase_expenses_recurring.sql has not been run). The recurring
   * controls are hidden in that case rather than offering something that
   * cannot be saved.
   */
  const [recurringSupported, setRecurringSupported] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    amount: '',
    category: 'court_fees',
    description: '',
    expense_date: new Date().toISOString().split('T')[0],
    case_id: '',
    is_recurring: false,
    recurrence_interval: 'monthly' as 'monthly' | 'quarterly' | 'yearly',
  });

  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [expenses, statusFilter, caseFilter, dateFrom, dateTo]);

  const loadInitialData = async () => {
    await Promise.all([loadExpenses(), loadCases(), loadUsers()]);
  };

  const loadExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load expenses');
    } finally {
      setLoading(false);
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

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*');

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error('Failed to load users:', error);
    }
  };

  /** Detects PostgREST's "column not in schema cache" rejection. */
  const isMissingRecurringColumn = (error: any): boolean => {
    const text = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`;
    return (
      error?.code === 'PGRST204' ||
      /is_recurring|recurrence_interval/.test(text)
    );
  };

  const applyFilters = () => {
    let filtered = [...expenses];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(exp => exp.status === statusFilter);
    }

    if (caseFilter !== 'all') {
      filtered = filtered.filter(exp => exp.case_id === caseFilter);
    }

    // Date range is inclusive on both ends. expense_date is a plain date
    // string (YYYY-MM-DD), so lexical comparison is also chronological.
    if (dateFrom) {
      filtered = filtered.filter(exp => (exp.expense_date || '') >= dateFrom);
    }
    if (dateTo) {
      filtered = filtered.filter(exp => (exp.expense_date || '') <= dateTo);
    }

    setFilteredExpenses(filtered);
  };

  /** Total spend per case across the currently filtered expenses, biggest first. */
  const caseRollup = (() => {
    const totals = new Map<string, { label: string; total: number; count: number }>();

    filteredExpenses.forEach((exp) => {
      const key = exp.case_id || 'unassigned';
      const label =
        cases.find(c => c.id === exp.case_id)?.case_number || 'Unassigned';
      const prev = totals.get(key) || { label, total: 0, count: 0 };
      totals.set(key, { label, total: prev.total + exp.amount, count: prev.count + 1 });
    });

    return Array.from(totals.values()).sort((a, b) => b.total - a.total);
  })();

  /**
   * Export the currently filtered expenses as a printable sheet. Uses the
   * browser's print-to-PDF rather than pulling in a PDF library, and must not
   * pass 'noopener' — window.open() returns null when it is set.
   */
  const exportFilteredToPDF = () => {
    if (filteredExpenses.length === 0) {
      toast.error('No expenses match the current filters');
      return;
    }

    const rangeLabel =
      dateFrom || dateTo
        ? `${dateFrom || 'start'} to ${dateTo || 'today'}`
        : 'All dates';
    const grandTotal = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

    const rows = filteredExpenses
      .map((exp) => {
        const linkedCase = cases.find(c => c.id === exp.case_id);
        const submitter = users.find(u => u.id === exp.submitted_by);
        return `
          <tr>
            <td>${new Date(exp.expense_date).toLocaleDateString()}</td>
            <td class="num">${exp.amount.toLocaleString('en-IN')}</td>
            <td>${getCategoryLabel(exp.category)}</td>
            <td>${(exp.description || '-').replace(/</g, '&lt;')}</td>
            <td>${linkedCase?.case_number || '-'}</td>
            <td>${submitter?.full_name || 'Unknown'}</td>
            <td>${exp.status}</td>
          </tr>`;
      })
      .join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>expenses_${new Date().toISOString().slice(0, 10)}</title>
      <style>
        @page { size: A4 landscape; margin: 12mm; }
        body { font-family: Arial, sans-serif; padding: 16px; color: #111827; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        .meta { color: #6b7280; font-size: 12px; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        th { background: #1f2937; color: #fff; padding: 8px; text-align: left; font-size: 11px; }
        td { padding: 7px 8px; border-bottom: 1px solid #e5e7eb; font-size: 11px; word-wrap: break-word; overflow-wrap: anywhere; }
        .num { text-align: right; }
        tfoot td { font-weight: bold; border-top: 2px solid #1f2937; font-size: 12px; }
        thead { display: table-header-group; }
        tr { page-break-inside: avoid; }
      </style></head><body>
      <h1>Expense Report</h1>
      <div class="meta">Range: ${rangeLabel} &nbsp;|&nbsp; Status: ${statusFilter} &nbsp;|&nbsp;
        ${filteredExpenses.length} entries &nbsp;|&nbsp; Generated ${new Date().toLocaleString()}</div>
      <table>
        <thead><tr>
          <th style="width:10%">Date</th><th style="width:10%">Amount (INR)</th>
          <th style="width:13%">Category</th><th style="width:27%">Description</th>
          <th style="width:13%">Case</th><th style="width:15%">Submitted By</th>
          <th style="width:12%">Status</th>
        </tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><td>Total</td><td class="num">${grandTotal.toLocaleString('en-IN')}</td>
          <td colspan="5"></td></tr></tfoot>
      </table></body></html>`;

    // A Capacitor WebView has no print dialog, so save the document instead and
    // let the OS share sheet decide where it goes.
    if (!canPrintToPdf()) {
      saveHtmlDocument(html, `expenses_${new Date().toISOString().slice(0, 10)}`, {
        shareTitle: 'Expense report',
      })
        .then(() => toast.success('Saved to your device — choose where to keep it'))
        .catch((err) => {
          console.error('Expense export failed:', err);
          toast.error(err?.message || 'Failed to save the report');
        });
      return;
    }

    const win = window.open('', '_blank');
    if (!win) {
      toast.error('Popup blocked. Please allow popups to export the report.');
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();

    const triggerPrint = () => {
      win.focus();
      win.print();
    };
    if (win.document.readyState === 'complete') setTimeout(triggerPrint, 0);
    else win.onload = triggerPrint;

    toast.success('Print dialog opened — choose "Save as PDF"');
  };

  /**
   * Recurring expenses are stored as ordinary rows carrying is_recurring and
   * recurrence_interval. Rather than writing to the database on page load
   * behind the user's back, we surface what is due and let them confirm.
   */
  const advanceDate = (iso: string, interval: string): Date => {
    const d = new Date(iso);
    if (interval === 'yearly') d.setFullYear(d.getFullYear() + 1);
    else if (interval === 'quarterly') d.setMonth(d.getMonth() + 3);
    else d.setMonth(d.getMonth() + 1);
    return d;
  };

  const dueRecurring = expenses.filter((exp: any) => {
    if (!exp.is_recurring) return false;
    const next = advanceDate(exp.expense_date, exp.recurrence_interval || 'monthly');
    if (next > new Date()) return false;
    // Skip if a later expense already continues this series.
    return !expenses.some(
      (other: any) =>
        other.id !== exp.id &&
        other.case_id === exp.case_id &&
        other.category === exp.category &&
        other.amount === exp.amount &&
        new Date(other.expense_date) >= next
    );
  });

  const generateDueRecurring = async () => {
    try {
      const rows = dueRecurring.map((exp: any) => ({
        amount: exp.amount,
        category: exp.category,
        description: exp.description,
        expense_date: advanceDate(exp.expense_date, exp.recurrence_interval || 'monthly')
          .toISOString()
          .split('T')[0],
        case_id: exp.case_id,
        submitted_by: user?.id,
        status: 'pending',
        is_recurring: true,
        recurrence_interval: exp.recurrence_interval || 'monthly',
      }));

      const { error } = await supabase.from('expenses').insert(rows);
      if (error) throw error;

      toast.success(`Created ${rows.length} recurring expense${rows.length === 1 ? '' : 's'}`);
      loadExpenses();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create recurring expenses');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      const base = {
        amount: parseFloat(formData.amount),
        category: formData.category,
        description: formData.description || null,
        expense_date: formData.expense_date,
        case_id: formData.case_id || null,
        submitted_by: user?.id,
        status: 'pending',
      };

      let { error } = await supabase.from('expenses').insert({
        ...base,
        is_recurring: formData.is_recurring,
        recurrence_interval: formData.is_recurring ? formData.recurrence_interval : null,
      });

      // The recurring columns only exist once supabase_expenses_recurring.sql
      // has been run. Until then PostgREST rejects the whole insert with
      // PGRST204 ("Could not find the 'is_recurring' column ... in the schema
      // cache"), which made it impossible to add ANY expense. Fall back to an
      // insert without those two fields so the core feature keeps working.
      if (error && isMissingRecurringColumn(error)) {
        console.warn(
          '[expenses] Recurring columns missing - run supabase_expenses_recurring.sql. Saving without them.'
        );
        setRecurringSupported(false);
        ({ error } = await supabase.from('expenses').insert(base));
      }

      if (error) throw error;

      toast.success('Expense submitted successfully');
      resetForm();
      setShowModal(false);
      loadExpenses();
    } catch (error: any) {
      console.error('Expense submit failed:', error);
      toast.error(error.message || 'Failed to submit expense');
    }
  };

  const handleApprove = async () => {
    if (!selectedExpense) return;

    try {
      const { error } = await supabase
        .from('expenses')
        .update({
          status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedExpense.id);

      if (error) throw error;
      
      toast.success('Expense approved successfully');
      setShowApprovalModal(false);
      setSelectedExpense(null);
      loadExpenses();
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve expense');
    }
  };

  const handleReject = async () => {
    if (!selectedExpense) return;

    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    try {
      const { error } = await supabase
        .from('expenses')
        .update({
          status: 'rejected',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedExpense.id);

      if (error) throw error;
      
      toast.success('Expense rejected');
      setShowApprovalModal(false);
      setSelectedExpense(null);
      setRejectionReason('');
      loadExpenses();
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject expense');
    }
  };

  const resetForm = () => {
    setFormData({
      amount: '',
      category: 'court_fees',
      description: '',
      expense_date: new Date().toISOString().split('T')[0],
      case_id: '',
      is_recurring: false,
      recurrence_interval: 'monthly',
    });
  };

  const openApprovalModal = (expense: Expense) => {
    setSelectedExpense(expense);
    setShowApprovalModal(true);
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;

      toast.success('Expense deleted successfully');
      loadExpenses();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete expense');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Approved
        </span>;
      case 'rejected':
        return <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold flex items-center gap-1">
          <XCircle className="w-3 h-3" />
          Rejected
        </span>;
      case 'pending':
        return <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Pending
        </span>;
      default:
        return <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-semibold">
          {status}
        </span>;
    }
  };

  const getCategoryLabel = (category: string) => {
    const categories: Record<string, string> = {
      court_fees: 'Court Fees',
      filing_fees: 'Filing Fees',
      advocate_fees: 'Advocate Fees',
      travel: 'Travel',
      documentation: 'Documentation',
      other: 'Other',
    };
    return categories[category] || category;
  };

  const getTotalByStatus = (status: string) => {
    return filteredExpenses
      .filter(exp => exp.status === status)
      .reduce((sum, exp) => sum + exp.amount, 0);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Expense Tracker</h1>
          <p className="text-gray-600 mt-1">Submit and manage case-related expenses</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5" />
          Add Expense
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Expenses</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                ₹{filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600 mt-2">
                ₹{getTotalByStatus('pending').toLocaleString()}
              </p>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-green-600 mt-2">
                ₹{getTotalByStatus('approved').toLocaleString()}
              </p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-gray-600">Rejected</p>
              <p className="text-2xl font-bold text-red-600 mt-2">
                ₹{getTotalByStatus('rejected').toLocaleString()}
              </p>
            </div>
            <div className="bg-red-50 p-3 rounded-lg">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-3 gap-2 mb-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Filters</h3>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowRollup(v => !v)}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <Layers className="w-4 h-4" />
              {showRollup ? 'Hide' : 'Show'} per-case totals
            </button>
            <button
              onClick={exportFilteredToPDF}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              <FileDown className="w-4 h-4" />
              Export PDF
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Case</label>
            <select
              value={caseFilter}
              onChange={(e) => setCaseFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Cases</option>
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.case_number}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From date</label>
            <input
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To date</label>
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {(dateFrom || dateTo || statusFilter !== 'all' || caseFilter !== 'all') && (
          <button
            onClick={() => {
              setDateFrom('');
              setDateTo('');
              setStatusFilter('all');
              setCaseFilter('all');
            }}
            className="mt-3 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
          >
            <X className="w-4 h-4" /> Clear all filters
          </button>
        )}
      </div>

      {/* Due recurring expenses */}
      {recurringSupported && dueRecurring.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Repeat className="w-5 h-5 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-900">
              <span className="font-semibold">{dueRecurring.length}</span> recurring
              expense{dueRecurring.length === 1 ? ' is' : 's are'} due to be created.
            </p>
          </div>
          <button
            onClick={generateDueRecurring}
            className="px-4 py-2 text-sm rounded-lg bg-amber-600 text-white hover:bg-amber-700"
          >
            Create now
          </button>
        </div>
      )}

      {/* Per-case rollup */}
      {showRollup && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Spend by case</h3>
          {caseRollup.length === 0 ? (
            <p className="text-sm text-gray-500">No expenses match the current filters.</p>
          ) : (
            <div className="space-y-2">
              {caseRollup.map((row) => {
                const max = caseRollup[0].total || 1;
                return (
                  <div key={row.label} className="flex items-center gap-3">
                    <span className="w-32 sm:w-44 shrink-0 truncate text-sm text-gray-700" title={row.label}>
                      {row.label}
                    </span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-blue-500 h-full rounded-full"
                        style={{ width: `${Math.max(2, (row.total / max) * 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 shrink-0 tabular-nums">
                      ₹{row.total.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs text-gray-400 shrink-0 w-12 text-right">
                      {row.count}×
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Expenses Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Phone layout: one card per expense. A 8-column table cannot be read
            on a 360px screen, so the table itself is desktop-only below. */}
        <div className="md:hidden divide-y divide-gray-200">
          {filteredExpenses.map((expense) => {
            const linkedCase = cases.find(c => c.id === expense.case_id);
            const submitter = users.find(u => u.id === expense.submitted_by);

            return (
              <div key={expense.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-lg font-semibold text-gray-900">
                      ₹{expense.amount.toLocaleString('en-IN')}
                    </p>
                    <p className="text-sm text-gray-500">
                      {getCategoryLabel(expense.category)}
                    </p>
                  </div>
                  <div className="shrink-0">{getStatusBadge(expense.status)}</div>
                </div>

                {expense.description && (
                  <p className="text-sm text-gray-700 break-words">{expense.description}</p>
                )}

                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-500">
                  <div className="truncate">
                    <dt className="inline font-medium">Date: </dt>
                    <dd className="inline">{new Date(expense.expense_date).toLocaleDateString()}</dd>
                  </div>
                  <div className="truncate">
                    <dt className="inline font-medium">Case: </dt>
                    <dd className="inline">{linkedCase?.case_number || '-'}</dd>
                  </div>
                  <div className="col-span-2 truncate">
                    <dt className="inline font-medium">By: </dt>
                    <dd className="inline">{submitter?.full_name || 'Unknown'}</dd>
                  </div>
                </dl>

                {isAdmin && (
                  <div className="flex items-center gap-4 pt-1">
                    {expense.status === 'pending' && (
                      <button
                        onClick={() => openApprovalModal(expense)}
                        className="text-sm font-medium text-blue-600 hover:text-blue-900"
                      >
                        Review
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteExpense(expense.id)}
                      className="text-sm font-medium text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Case
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Submitted By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                {isAdmin && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredExpenses.map((expense) => {
                const linkedCase = cases.find(c => c.id === expense.case_id);
                const submitter = users.find(u => u.id === expense.submitted_by);
                
                return (
                  <tr key={expense.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(expense.expense_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      ₹{expense.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getCategoryLabel(expense.category)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {expense.description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {linkedCase?.case_number || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {submitter?.full_name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(expense.status)}
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end items-center gap-3">
                          {expense.status === 'pending' && (
                            <button
                              onClick={() => openApprovalModal(expense)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Review
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteExpense(expense.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete Expense"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} className="px-6 py-4 text-center text-gray-500">
                    No expenses found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Add New Expense</h2>
              <button
                onClick={() => {
                  setShowModal(false);
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
                  Amount (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="court_fees">Court Fees</option>
                  <option value="filing_fees">Filing Fees</option>
                  <option value="advocate_fees">Advocate Fees</option>
                  <option value="travel">Travel</option>
                  <option value="documentation">Documentation</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expense Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.expense_date}
                  onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {recurringSupported && (
              <div className="rounded-lg border border-gray-200 p-3 bg-gray-50">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_recurring}
                    onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                    <Repeat className="w-4 h-4 text-gray-500" />
                    This is a recurring expense
                  </span>
                </label>

                {formData.is_recurring && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Repeats</label>
                    <select
                      value={formData.recurrence_interval}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          recurrence_interval: e.target.value as 'monthly' | 'quarterly' | 'yearly',
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                    <p className="mt-2 text-xs text-gray-500">
                      The next entry is not created automatically — when one falls due
                      this page offers a "Create now" button so nothing is written
                      without your say-so.
                    </p>
                  </div>
                )}
              </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Link to Case (Optional)</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter expense description"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
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
                  Submit Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {showApprovalModal && selectedExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl max-w-2xl w-full">
            <div className="bg-blue-600 text-white px-6 py-4 rounded-t-xl">
              <h2 className="text-xl font-bold">Review Expense</h2>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-600">Amount:</span>
                  <p className="text-lg font-bold text-gray-900">₹{selectedExpense.amount.toLocaleString()}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Category:</span>
                  <p className="text-gray-900">{getCategoryLabel(selectedExpense.category)}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Date:</span>
                  <p className="text-gray-900">{new Date(selectedExpense.expense_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Submitted By:</span>
                  <p className="text-gray-900">
                    {users.find(u => u.id === selectedExpense.submitted_by)?.full_name || 'Unknown'}
                  </p>
                </div>
                {selectedExpense.case_id && (
                  <div className="col-span-2">
                    <span className="font-medium text-gray-600">Case:</span>
                    <p className="text-gray-900">
                      {cases.find(c => c.id === selectedExpense.case_id)?.case_number || 'Unknown'}
                    </p>
                  </div>
                )}
                {selectedExpense.description && (
                  <div className="col-span-2">
                    <span className="font-medium text-gray-600">Description:</span>
                    <p className="text-gray-900">{selectedExpense.description}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rejection Reason (if rejecting)</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Enter reason for rejection..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowApprovalModal(false);
                    setSelectedExpense(null);
                    setRejectionReason('');
                  }}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </button>
                <button
                  onClick={handleApprove}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
