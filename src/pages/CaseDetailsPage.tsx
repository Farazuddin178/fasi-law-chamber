import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase, Case } from '@/lib/supabase';
import { ArrowLeft, Download, Edit, Trash, Plus, User, Clock, FileText, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

interface CaseSubmission {
  id: string;
  submission_number: number;
  submission_date: string;
  due_date?: string;
  return_date?: string;
  status: string;
  file_given_by?: any;
  file_given_to?: any;
  changes_made?: string;
  changes_requested?: string;
  changes_requested_by?: any;
  notes?: string;
  document_url?: string;
  file_name?: string;
  created_at: string;
  created_by?: any;
}

export default function CaseDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<CaseSubmission[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [submissionForm, setSubmissionForm] = useState({
    file_given_to: '',
    due_date: '',
    notes: '',
    changes_requested: ''
  });

  // Ensure any field expected to be an array is treated as an array to avoid runtime errors
  const toArray = <T,>(value: any): T[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  // Helper function to generate disposal order PDF URL
  const getDisposalOrderUrl = (): string | null => {
    if (!caseData || caseData.status !== 'disposed' || !caseData.case_number) return null;
    
    try {
      // Parse case number format: "CRLP 107/2026" or "WP 1423/2026"
      const match = caseData.case_number.match(/^([A-Z]+)\s*(\d+)\/(\d{4})$/i);
      if (!match) return null;
      
      const [, type, number, year] = match;
      const typeLower = type.toLowerCase();
      
      // Format: https://csis.tshc.gov.in/hcorders/2026/crlp/crlp_107_2026.pdf
      return `https://csis.tshc.gov.in/hcorders/${year}/${typeLower}/${typeLower}_${number}_${year}.pdf`;
    } catch (e) {
      console.error('Error generating disposal order URL:', e);
      return null;
    }
  };

  useEffect(() => {
    if (id && id !== 'new') {
      loadCase();
      loadSubmissions();
      loadUsers();
    } else {
      setLoading(false);
    }
  }, [id]);

  const loadCase = async () => {
    try {
      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast.error('Case not found');
        navigate('/cases');
        return;
      }
      setCaseData(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load case');
      navigate('/cases');
    } finally {
      setLoading(false);
    }
  };

  const loadSubmissions = async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('case_submissions')
        .select(`
          *
        `)
        .eq('case_id', parseInt(id))
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (error: any) {
      console.error('Failed to load submissions:', error);
    }
  };

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user ? user.full_name || user.email : 'Unknown User';
  };

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email')
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error('Failed to load users:', error);
    }
  };

  const handleSubmissionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !user) return;

    try {
      const nextSubmissionNumber = submissions.length + 1;
      
      const { error } = await supabase.from('case_submissions').insert({
        case_id: parseInt(id),
        submission_number: nextSubmissionNumber,
        status: 'pending',
        file_given_to: submissionForm.file_given_to,
        due_date: submissionForm.due_date || null,
        notes: submissionForm.notes || null,
        created_by: user.id
      });

      if (error) throw error;
      
      toast.success('Submission added successfully');
      setShowSubmissionModal(false);
      setSubmissionForm({ file_given_to: '', due_date: '', notes: '', changes_requested: '' });
      loadSubmissions();
    } catch (error: any) {
      toast.error('Failed to add submission: ' + error.message);
    }
  };

  const updateSubmissionStatus = async (submissionId: string, status: string) => {
    try {
      const updateData: any = { status };
      if (status === 'completed') {
        updateData.return_date = new Date().toISOString();
      }

      const { error } = await supabase
        .from('case_submissions')
        .update(updateData)
        .eq('id', submissionId);

      if (error) throw error;
      
      toast.success(`Submission marked as ${status.replace('_', ' ')}`);
      loadSubmissions();
    } catch (error: any) {
      toast.error('Failed to update submission status');
    }
  };

  const requestChanges = async (submissionId: string) => {
    const changes = prompt('What changes are needed?');
    if (!changes || !user) return;

    try {
      const { error } = await supabase
        .from('case_submissions')
        .update({
          status: 'changes_requested',
          changes_requested: changes,
          changes_requested_by: user.id,
          changes_requested_date: new Date().toISOString()
        })
        .eq('id', submissionId);

      if (error) throw error;
      
      toast.success('Changes requested successfully');
      loadSubmissions();
    } catch (error: any) {
      toast.error('Failed to request changes');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this case?')) return;
    
    try {
      const { error } = await supabase.from('cases').delete().eq('id', id);
      if (error) throw error;
      toast.success('Case deleted successfully');
      navigate('/cases');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete case');
    }
  };

  const handleDownload = () => {
    if (!caseData) return;
    
    const content = `
CASE DETAILS REPORT
=====================

Case Number: ${caseData.case_number}
SR Number: ${caseData.sr_number || 'N/A'}
CNR: ${caseData.cnr || 'N/A'}

PARTIES
-------
Primary Petitioner: ${caseData.primary_petitioner || 'N/A'}
Primary Respondent: ${caseData.primary_respondent || 'N/A'}
Petitioner Advocate: ${caseData.petitioner_adv || 'N/A'}
Respondent Advocate: ${caseData.respondent_adv || 'N/A'}

CLASSIFICATION
--------------
Category: ${caseData.category || 'N/A'}
Sub Category: ${caseData.sub_category || 'N/A'}
Sub-Sub Category: ${caseData.sub_sub_category || 'N/A'}

LOCATION & JUDGE
----------------
District: ${caseData.district || 'N/A'}
Purpose: ${caseData.purpose || 'N/A'}
Judge Name: ${caseData.jud_name || 'N/A'}

DATES
-----
Filing Date: ${caseData.filing_date || 'N/A'}
Registration Date: ${caseData.registration_date || 'N/A'}
Listing Date: ${caseData.listing_date || 'N/A'}
Disposal Date: ${caseData.disp_date || 'N/A'}
Disposal Type: ${caseData.disp_type || 'N/A'}

PRAYER
------
${caseData.prayer || 'N/A'}

STATUS
------
${caseData.status}

Generated: ${new Date().toLocaleString()}
    `;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `case_${caseData.case_number}_details.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Case details downloaded');
  };

  // Helper to update array fields for the case
  const updateCaseArrayField = async (field: string, newArray: any[]) => {
    if (!id) return;
    try {
      const payload: any = {};
      payload[field] = newArray;
      // Add changed_by for audit trigger
      payload.changed_by = user?.id; // Assuming user is available from useAuth
      const { error } = await supabase.from('cases').update(payload).eq('id', id);
      if (error) throw error;
      toast.success('Case updated');
      loadCase();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update case');
    }
  };

  const addSimpleEntry = async (field: string, promptText: string) => {
    const value = prompt(promptText);
    if (!value) return;
    const current = (caseData as any)[field] || [];
    current.push(value);
    await updateCaseArrayField(field, current);
  };

  const addObjectEntry = async (field: string, template: any) => {
    // Simple prompt-based entry: iterate keys on template
    const entry: any = {};
    for (const key of Object.keys(template)) {
      const val = prompt(`Enter ${key}:`);
      if (val === null) return; // cancel
      entry[key] = val;
    }
    const current = (caseData as any)[field] || [];
    current.push(entry);
    await updateCaseArrayField(field, current);
  };

  const removeArrayEntry = async (field: string, index: number) => {
    if (!confirm('Remove this entry?')) return;
    const current = (caseData as any)[field] || [];
    current.splice(index, 1);
    await updateCaseArrayField(field, current);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!caseData) {
    return <div>Case not found</div>;
  }

  const canEdit = user?.role === 'admin' || user?.role === 'restricted_admin';
  const canDelete = user?.role === 'admin';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Link to="/cases" className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Case Details</h1>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleDownload}
            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            <Download className="w-5 h-5" />
            <span>Download</span>
          </button>
          {canEdit && (
            <Link
              to={`/cases/${id}/edit`}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Edit className="w-5 h-5" />
              <span>Edit</span>
            </Link>
          )}
          {canDelete && (
            <button
              onClick={handleDelete}
              className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              <Trash className="w-5 h-5" />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>


      <div className="space-y-6">
        {/* HEADER CARD */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl shadow-lg p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-2">{caseData.case_number}</h2>
              <p className="text-blue-100 text-lg">{caseData.primary_petitioner} vs {caseData.primary_respondent}</p>
            </div>
            <div className="text-right">
              <div className={`inline-block px-6 py-3 rounded-full font-bold text-lg ${
                caseData.status === 'disposed' ? 'bg-green-500' :
                caseData.status === 'pending' ? 'bg-yellow-500' :
                caseData.status === 'filed' ? 'bg-blue-500' : 'bg-gray-500'
              }`}>
                {caseData.status?.toUpperCase()}
              </div>
              {caseData.cnr && (
                <p className="text-blue-100 mt-2 text-sm">CNR: {caseData.cnr}</p>
              )}
            </div>
          </div>
        </div>

        {/* PRIMARY DETAILS */}
        <div className="bg-white rounded-xl shadow-lg border-2 border-blue-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b-2 border-blue-200">
            <h3 className="text-2xl font-bold text-blue-900">📋 Primary Details</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Main Number</span>
                  <span className="text-lg font-bold text-gray-900 mt-1">{caseData.case_number}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">SR Number</span>
                  <span className="text-lg font-bold text-gray-900 mt-1">{caseData.sr_number || 'N/A'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Petitioner</span>
                  <span className="text-lg font-bold text-blue-900 mt-1">{caseData.primary_petitioner || 'N/A'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Petitioner Advocate</span>
                  <span className="text-lg font-semibold text-gray-700 mt-1">{caseData.petitioner_adv || 'N/A'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Category</span>
                  <span className="text-lg font-semibold text-gray-700 mt-1">{caseData.category || 'N/A'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Filing Date</span>
                  <span className="text-lg font-semibold text-gray-700 mt-1">{caseData.filing_date ? new Date(caseData.filing_date).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Listing Date</span>
                  <span className="text-lg font-semibold text-gray-700 mt-1">{caseData.listing_date ? new Date(caseData.listing_date).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">FLC Number</span>
                  <span className="text-lg font-semibold text-gray-700 mt-1">{(caseData as any).flc_number || 'N/A'}</span>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">CNR Number</span>
                  <span className="text-lg font-bold text-red-600 mt-1">{caseData.cnr || 'N/A'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">District</span>
                  <span className="text-lg font-semibold text-gray-700 mt-1">{caseData.district || 'N/A'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Respondent</span>
                  <span className="text-lg font-bold text-red-900 mt-1">{caseData.primary_respondent || 'N/A'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Respondent Advocate</span>
                  <span className="text-lg font-semibold text-gray-700 mt-1">{caseData.respondent_adv || 'N/A'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Purpose</span>
                  <span className="text-lg font-semibold text-gray-700 mt-1">{caseData.purpose || 'N/A'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Registration Date</span>
                  <span className="text-lg font-semibold text-gray-700 mt-1">{caseData.registration_date ? new Date(caseData.registration_date).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Hon'ble Judges</span>
                  <span className="text-lg font-bold text-purple-900 mt-1">{caseData.jud_name || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* OFFICE & CLIENT MANAGEMENT */}
        <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 overflow-hidden">
          <div className="bg-gray-100 px-6 py-4 border-b-2 border-gray-200">
            <h3 className="text-2xl font-bold text-gray-800">🏢 Office & Client Details</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
            
            {/* Client Section */}
            <div className="space-y-4">
              <h4 className="font-bold text-lg text-blue-800 border-b pb-1">Client Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Client Name</span>
                  <span className="font-medium">{(caseData as any).client_name || '-'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Subject</span>
                  <span className="font-medium">{(caseData as any).subject || '-'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Referred By</span>
                  <span className="font-medium">{(caseData as any).referred_by || '-'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Ref. Case No</span>
                  <span className="font-medium">{(caseData as any).referred_by_case_number || '-'}</span>
                </div>
                <div className="col-span-2 flex flex-col">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Memo</span>
                  <span className="font-medium bg-gray-50 p-2 rounded">{(caseData as any).memo || '-'}</span>
                </div>
              </div>
            </div>

            {/* Workflow Section */}
            <div className="space-y-4">
              <h4 className="font-bold text-lg text-blue-800 border-b pb-1">Court Workflow</h4>
               <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Petition Type</span>
                  <span className="font-medium">{(caseData as any).petition_type || '-'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-gray-500 uppercase">SLR Number</span>
                  <span className="font-medium">{(caseData as any).slr_number || '-'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Hearing Court</span>
                  <span className="font-medium">{(caseData as any).hearing_court || '-'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Assigned To</span>
                  <span className="font-medium">{(caseData as any).assigned_to || '-'}</span>
                </div>
                 <div className="flex flex-col">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Temp Filing No</span>
                  <span className="font-medium">{(caseData as any).temporary_filing_number || '-'}</span>
                </div>
                 <div className="flex flex-col">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Perm Filing No</span>
                  <span className="font-medium">{(caseData as any).permanent_filing_number || '-'}</span>
                </div>
              </div>
            </div>

            {/* Hearing & Motion */}
            <div className="space-y-4">
              <h4 className="font-bold text-lg text-blue-800 border-b pb-1">Hearing & Motion</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Next Hearing</span>
                  <span className="font-medium">{(caseData as any).next_hearing_date ? new Date((caseData as any).next_hearing_date).toLocaleDateString() : '-'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Mention Date</span>
                  <span className="font-medium">{(caseData as any).mention_date ? new Date((caseData as any).mention_date).toLocaleDateString() : '-'}</span>
                </div>
                 <div className="flex flex-col">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Motion Type</span>
                  <span className="font-medium">{(caseData as any).motion_type || '-'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Is Adjourned</span>
                  <span className={`font-medium ${(caseData as any).is_adjourned ? 'text-red-600' : ''}`}>{(caseData as any).is_adjourned ? 'Yes' : 'No'}</span>
                </div>
                <div className="col-span-2 flex flex-col">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Motion Reason</span>
                  <span className="font-medium">{(caseData as any).motion_reason || '-'}</span>
                </div>
              </div>
            </div>

            {/* Post Listing & Notes */}
            <div className="space-y-4">
              <h4 className="font-bold text-lg text-blue-800 border-b pb-1">Post Listing & Notes</h4>
              <div className="grid grid-cols-2 gap-4">
                 <div className="flex flex-col">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Post List Date</span>
                  <span className="font-medium">{(caseData as any).post_listing_date ? new Date((caseData as any).post_listing_date).toLocaleDateString() : '-'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Posting Clerk</span>
                  <span className="font-medium">{(caseData as any).posting_clerk_name || '-'}</span>
                </div>
                 <div className="flex flex-col">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Courtship Status</span>
                  <span className="font-medium">{(caseData as any).courtship_submitted ? 'Submitted' : 'Pending'} ({(caseData as any).courtship_submission_type || '-'})</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Ack Received</span>
                  <span className="font-medium">{(caseData as any).acknowledgment_received ? 'Yes' : 'No'}</span>
                </div>
                <div className="col-span-2 flex flex-col">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Doc Requirements</span>
                  <span className="font-medium">{(caseData as any).document_requirements || '-'}</span>
                </div>
                 <div className="col-span-2 flex flex-col">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Fasi Comments</span>
                  <span className="font-medium bg-yellow-50 p-2 rounded border border-yellow-100">{(caseData as any).fasi_comments || '-'}</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* DISPOSAL DETAILS - Only show if case is disposed */}
        {caseData.status === 'disposed' && (
          <div className="bg-white rounded-xl shadow-lg border-2 border-green-100 overflow-hidden">
            <div className="bg-gradient-to-r from-green-50 to-green-100 px-6 py-4 border-b-2 border-green-200">
              <h3 className="text-2xl font-bold text-green-900">✅ Disposal Details</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <span className="text-sm font-semibold text-green-600 uppercase">Disposal Date</span>
                  <p className="text-lg font-bold text-gray-900 mt-2">
                    {caseData.disp_date ? new Date(caseData.disp_date).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <span className="text-sm font-semibold text-green-600 uppercase">Disposal Type</span>
                  <p className="text-lg font-bold text-gray-900 mt-2">{caseData.disp_type || 'N/A'}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <span className="text-sm font-semibold text-green-600 uppercase">Order</span>
                  <div className="mt-2">
                    {getDisposalOrderUrl() ? (
                      <a
                        href={getDisposalOrderUrl()!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 font-bold text-lg shadow-md hover:shadow-lg transition-all"
                      >
                        📄 Click here to see the Order
                      </a>
                    ) : (
                      <span className="text-gray-500">Order not available</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CATEGORY */}
        <div className="bg-white rounded-xl shadow-lg border-2 border-purple-100 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-50 to-purple-100 px-6 py-4 border-b-2 border-purple-200">
            <h3 className="text-2xl font-bold text-purple-900">📁 Category</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <span className="text-sm font-semibold text-purple-600 uppercase">Category</span>
                <p className="text-lg font-bold text-gray-900 mt-2">{caseData.category || 'N/A'}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <span className="text-sm font-semibold text-purple-600 uppercase">Sub Category</span>
                <p className="text-lg font-bold text-gray-900 mt-2">{caseData.sub_category || 'N/A'}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <span className="text-sm font-semibold text-purple-600 uppercase">Sub Sub Category</span>
                <p className="text-lg font-bold text-gray-900 mt-2">{caseData.sub_sub_category || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* IA DETAILS */}
        <div className="bg-white rounded-xl shadow-lg border-2 border-green-100 overflow-hidden">
          <div className="bg-gradient-to-r from-green-50 to-green-100 px-6 py-4 border-b-2 border-green-200">
            <h3 className="text-2xl font-bold text-green-900">📝 IA Details</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">IA Number</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Filing Date</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Advocate</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Prayer</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Order Date</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Order</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {toArray<any>(caseData.ia_details).map((ia, idx: number) => (
                  <tr key={idx} className="hover:bg-green-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600">{ia.number || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{ia.filing_date || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{ia.advocate_name || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{ia.paper_type || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${ia.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                        {ia.status || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">{ia.prayer ? <button onClick={e => {e.preventDefault(); alert(ia.prayer);}} className="text-blue-600 hover:text-blue-800 hover:underline font-semibold">View Prayer</button> : '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{ia.order_date || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{ia.order || '-'}</td>
                  </tr>
                ))}
                {toArray<any>(caseData.ia_details).length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">No IA details available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* USR DETAILS */}
        <div className="bg-white rounded-xl shadow-lg border-2 border-indigo-100 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 px-6 py-4 border-b-2 border-indigo-200">
            <h3 className="text-2xl font-bold text-indigo-900">📄 USR Details</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">USR Number</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Advocate</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">USR Type</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Filing Date</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Remarks</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {toArray<any>(caseData.usr_details).map((usr, idx: number) => (
                  <tr key={idx} className="hover:bg-indigo-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600">{usr.number || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{usr.advocate_name || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{usr.usr_type || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{usr.filing_date || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{usr.remarks || '-'}</td>
                  </tr>
                ))}
                {toArray<any>(caseData.usr_details).length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No USR details available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SUBMISSION & RETURN DATES */}
        <div className="bg-white rounded-xl shadow-lg border-2 border-emerald-100 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 px-6 py-4 border-b-2 border-emerald-200">
            <h3 className="text-2xl font-bold text-emerald-900">📅 Submission & Return Dates</h3>
          </div>
          <div className="p-6">
            {toArray<any>(caseData.submission_dates).length > 0 ? (
              <div className="space-y-6">
                {toArray<any>(caseData.submission_dates).map((submission, idx: number) => (
                  <div key={idx} className="border-2 border-emerald-200 rounded-lg p-4 bg-emerald-50">
                    <div className="mb-4">
                      <h4 className="text-lg font-bold text-emerald-900">Submission #{submission.submission_number || idx + 1}</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="bg-white p-3 rounded border border-emerald-200">
                          <p className="text-xs font-semibold text-emerald-600 uppercase">Submission Date</p>
                          <p className="text-sm font-bold text-gray-900">{submission.submission_date ? new Date(submission.submission_date).toLocaleDateString() : 'N/A'}</p>
                        </div>
                        <div className="bg-white p-3 rounded border border-emerald-200">
                          <p className="text-xs font-semibold text-emerald-600 uppercase">Submitted By</p>
                          <p className="text-sm font-bold text-gray-900">{submission.submitted_by || 'N/A'}</p>
                        </div>
                        <div className="bg-white p-3 rounded border border-emerald-200">
                          <p className="text-xs font-semibold text-emerald-600 uppercase">Due Date</p>
                          <p className="text-sm font-bold text-gray-900">{submission.due_date ? new Date(submission.due_date).toLocaleDateString() : 'N/A'}</p>
                        </div>
                        <div className="bg-white p-3 rounded border border-emerald-200">
                          <p className="text-xs font-semibold text-emerald-600 uppercase">Filing Date</p>
                          <p className="text-sm font-bold text-gray-900">{submission.filing_date ? new Date(submission.filing_date).toLocaleDateString() : 'N/A'}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="bg-white p-3 rounded border border-emerald-200">
                          <p className="text-xs font-semibold text-emerald-600 uppercase">Resubmission Date</p>
                          <p className="text-sm font-bold text-gray-900">{submission.resubmission_date ? new Date(submission.resubmission_date).toLocaleDateString() : 'N/A'}</p>
                        </div>
                        <div className="bg-white p-3 rounded border border-emerald-200">
                          <p className="text-xs font-semibold text-emerald-600 uppercase">Return Date</p>
                          <p className="text-sm font-bold text-gray-900">{submission.return_date ? new Date(submission.return_date).toLocaleDateString() : 'N/A'}</p>
                        </div>
                        <div className="bg-white p-3 rounded border border-emerald-200">
                          <p className="text-xs font-semibold text-emerald-600 uppercase">Return Taken By</p>
                          <p className="text-sm font-bold text-gray-900">{submission.return_taken_by || 'N/A'}</p>
                        </div>
                        <div className="bg-white p-3 rounded border border-emerald-200">
                          <p className="text-xs font-semibold text-emerald-600 uppercase">Changes Made</p>
                          <p className="text-sm font-bold text-gray-900">{submission.changes_made || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                    {(submission.changes_requested || submission.changes_requested_by || submission.notes) && (
                      <div className="mt-4 space-y-2">
                        {submission.changes_requested && (
                          <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                            <p className="text-xs font-semibold text-yellow-700 uppercase">Changes Requested</p>
                            <p className="text-sm text-gray-900">{submission.changes_requested}</p>
                          </div>
                        )}
                        {submission.changes_requested_by && (
                          <div className="bg-blue-50 p-3 rounded border border-blue-200">
                            <p className="text-xs font-semibold text-blue-700 uppercase">Changes Requested By</p>
                            <p className="text-sm text-gray-900">{submission.changes_requested_by}</p>
                          </div>
                        )}
                        {submission.notes && (
                          <div className="bg-gray-100 p-3 rounded border border-gray-300">
                            <p className="text-xs font-semibold text-gray-700 uppercase">Notes</p>
                            <p className="text-sm text-gray-900">{submission.notes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 text-lg">No submission records available</p>
              </div>
            )}
          </div>
        </div>

        {/* CONNECTED MATTERS */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 overflow-x-auto">
          <table className="min-w-full B2U-article">
            <tbody>
              <tr><th colSpan={1} className="text-center text-blue-700 font-bold">CONNECTED MATTERS</th></tr>
              <tr><td>Connected Case Number</td></tr>
              {toArray<any>(caseData.connected_matters).map((cm, idx: number) => (
                <tr key={idx}><td>{cm.case_number || cm || '-'}</td></tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* VAKALATH */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 overflow-x-auto">
          <table className="min-w-full B2U-article">
            <tbody>
              <tr><th colSpan={5} className="text-center text-blue-700 font-bold">VAKALATH</th></tr>
              <tr><td>Advocate Code</td><td>Advocate Name</td><td>P/R No.</td><td>Remarks</td><td>File</td></tr>
              {toArray<any>(caseData.vakalath).map((v, idx: number) => (
                <tr key={idx}>
                  <td>{v.advocate_code || '-'}</td>
                  <td>{v.advocate_name || '-'}</td>
                  <td>{v.pr_no || '-'}</td>
                  <td>{v.remarks || '-'}</td>
                  <td>{v.file ? <a href={v.file} target="_blank" rel="noopener noreferrer">View</a> : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* LOWER COURT DETAILS */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 overflow-x-auto">
          <table className="min-w-full B2U-article">
            <tbody>
              <tr><th colSpan={5} className="text-center text-blue-700 font-bold">LOWER COURT DETAILS</th></tr>
              <tr><td>Court Name</td><td>District</td><td>Lower Court Case No.</td><td>Hon'ble Judge</td><td>Date of Judgement</td></tr>
              {toArray<any>(caseData.lower_court_details).map((lc, idx: number) => (
                <tr key={idx}>
                  <td>{lc.court_name || '-'}</td>
                  <td>{lc.district || '-'}</td>
                  <td>{lc.case_no || '-'}</td>
                  <td>{lc.judge || '-'}</td>
                  <td>{lc.judgement_date || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>


        {/* PRAYER */}
        {caseData.prayer && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">PRAYER</h2>
            <p className="text-gray-900 whitespace-pre-wrap">{caseData.prayer}</p>
          </div>
        )}

        {/* PETITIONERS */}
        <div className="bg-white rounded-xl shadow-lg border-2 border-blue-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b-2 border-blue-200">
            <h3 className="text-2xl font-bold text-blue-900">👤 Petitioner(s)</h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {toArray<any>(caseData.petitioners).map((p, idx: number) => (
                <div key={idx} className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200 hover:shadow-md transition-shadow">
                  <span className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white font-bold rounded-full text-lg">{idx + 1}</span>
                  <span className="text-lg font-semibold text-gray-900">{typeof p === 'string' ? p : p.name || JSON.stringify(p)}</span>
                </div>
              ))}
              {toArray<any>(caseData.petitioners).length === 0 && (
                <p className="text-center text-gray-500 py-4">No petitioners listed</p>
              )}
            </div>
          </div>
        </div>

        {/* RESPONDENTS */}
        <div className="bg-white rounded-xl shadow-lg border-2 border-red-100 overflow-hidden">
          <div className="bg-gradient-to-r from-red-50 to-red-100 px-6 py-4 border-b-2 border-red-200">
            <h3 className="text-2xl font-bold text-red-900">👥 Respondent(s)</h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {toArray<any>(caseData.respondents).map((r, idx: number) => (
                <div key={idx} className="flex items-center gap-4 p-4 bg-red-50 rounded-lg border border-red-200 hover:shadow-md transition-shadow">
                  <span className="flex items-center justify-center w-10 h-10 bg-red-600 text-white font-bold rounded-full text-lg">{idx + 1}</span>
                  <span className="text-lg font-semibold text-gray-900">{typeof r === 'string' ? r : r.name || JSON.stringify(r)}</span>
                </div>
              ))}
              {toArray<any>(caseData.respondents).length === 0 && (
                <p className="text-center text-gray-500 py-4">No respondents listed</p>
              )}
            </div>
          </div>
        </div>

        {/* ORDERS */}
        <div className="bg-white rounded-xl shadow-lg border-2 border-orange-100 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-50 to-orange-100 px-6 py-4 border-b-2 border-orange-200">
            <h3 className="text-2xl font-bold text-orange-900">⚖️ Orders</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Order On</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Judge</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Details</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">File</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {toArray<any>(caseData.orders).map((o, idx: number) => (
                  <tr key={idx} className="hover:bg-orange-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600">{o.order_on || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{o.judge_name || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{o.date || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{o.type || '-'}</td>
                    <td className="px-6 py-4 text-sm">{o.details ? <a href={o.details} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline font-semibold">View Details</a> : '-'}</td>
                    <td className="px-6 py-4 text-sm">{o.file ? <a href={o.file} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline font-semibold">📄 PDF</a> : '-'}</td>
                  </tr>
                ))}
                {toArray<any>(caseData.orders).length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No orders available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Dynamic arrays: Petitioners, Respondents, IA, Orders, Documents, Connected Matters, Vakalath, Lower Court Details */}


        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">Documents</h2>
          <div className="space-y-2">
            {toArray<any>(caseData.other_documents).map((d, idx: number) => (
              <div key={idx} className="flex justify-between items-center">
                <div className="text-gray-900">{d.file_name || d}</div>
                <a className="text-blue-600 hover:underline" href={d.file_path || '#'} target="_blank" rel="noreferrer">Open</a>
              </div>
            ))}
            {toArray<any>(caseData.other_documents).length === 0 && (
              <p className="text-gray-500">No documents available</p>
            )}
          </div>
        </div>

        {/* CASE SUBMISSION TRACKING */}
        <div className="bg-white rounded-xl shadow-lg border-2 border-purple-100 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-50 to-purple-100 px-6 py-4 border-b-2 border-purple-200 flex justify-between items-center">
            <h3 className="text-2xl font-bold text-purple-900">📋 Case Submission Tracking</h3>
            <button
              onClick={() => setShowSubmissionModal(true)}
              className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
            >
              <Plus className="w-4 h-4" />
              Add Submission
            </button>
          </div>
          <div className="p-6">
            {submissions && submissions.length > 0 ? (
              <div className="space-y-4">
                {submissions.map((submission) => (
                  <div key={submission.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-purple-700">#{submission.submission_number}</span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            submission.status === 'completed' ? 'bg-green-100 text-green-800' :
                            submission.status === 'changes_requested' ? 'bg-red-100 text-red-800' :
                            submission.status === 'under_review' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {submission.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(submission.submission_date).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                      {submission.file_given_to && (
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-blue-500" />
                          <span className="text-gray-600">Given to:</span>
                          <span className="font-medium">{getUserName(submission.file_given_to)}</span>
                        </div>
                      )}
                      {submission.due_date && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-orange-500" />
                          <span className="text-gray-600">Due:</span>
                          <span className="font-medium">{new Date(submission.due_date).toLocaleDateString()}</span>
                        </div>
                      )}
                      {submission.return_date && (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-gray-600">Returned:</span>
                          <span className="font-medium">{new Date(submission.return_date).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                    
                    {submission.changes_requested && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                        <div className="flex items-start gap-2">
                          <FileText className="w-4 h-4 text-red-500 mt-0.5" />
                          <div>
                            <span className="font-medium text-red-800">Changes Requested:</span>
                            <p className="text-red-700 mt-1">{submission.changes_requested}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {submission.changes_made && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                        <div className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                          <div>
                            <span className="font-medium text-green-800">Changes Made:</span>
                            <p className="text-green-700 mt-1">{submission.changes_made}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {submission.notes && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                        <div className="flex items-start gap-2">
                          <FileText className="w-4 h-4 text-blue-500 mt-0.5" />
                          <div>
                            <span className="font-medium text-blue-800">Notes:</span>
                            <p className="text-blue-700 mt-1">{submission.notes}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-200">
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateSubmissionStatus(submission.id, 'under_review')}
                          className="px-3 py-1 text-xs bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 transition"
                          disabled={submission.status === 'completed'}
                        >
                          Mark Under Review
                        </button>
                        <button
                          onClick={() => requestChanges(submission.id)}
                          className="px-3 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200 transition"
                          disabled={submission.status === 'completed'}
                        >
                          Request Changes
                        </button>
                        <button
                          onClick={() => updateSubmissionStatus(submission.id, 'completed')}
                          className="px-3 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200 transition"
                        >
                          Mark Complete
                        </button>
                      </div>
                      <div className="text-xs text-gray-500">
                        Created by {getUserName(submission.created_by)} on {new Date(submission.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p>No submissions tracked for this case yet.</p>
                <p className="text-sm">Click "Add Submission" to start tracking file movements and changes.</p>
              </div>
            )}
          </div>
        </div>
      </div>


      {/* Submission Modal */}
    {showSubmissionModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">Add Case Submission</h2>
            <button
              onClick={() => setShowSubmissionModal(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          <div className="p-6">
            <form onSubmit={handleSubmissionSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  File Given To
                </label>
                <select
                  value={submissionForm.file_given_to}
                  onChange={(e) => setSubmissionForm({...submissionForm, file_given_to: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                >
                  <option value="">Select user...</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{user.full_name} ({user.email})</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date (Optional)
                </label>
                <input
                  type="date"
                  value={submissionForm.due_date}
                  onChange={(e) => setSubmissionForm({...submissionForm, due_date: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={submissionForm.notes}
                  onChange={(e) => setSubmissionForm({...submissionForm, notes: e.target.value})}
                  placeholder="Add any notes about this submission..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowSubmissionModal(false)}
                  className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                >
                  Add Submission
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )}
    </div>
  );
}
