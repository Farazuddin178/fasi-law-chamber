import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase, Case } from '@/lib/supabase';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

export default function CaseFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [caseExists, setCaseExists] = useState(false);
  const [checkingCase, setCheckingCase] = useState(false);

  const [formData, setFormData] = useState({
    case_number: '',
    flc_number: '',
    sr_number: '',
    cnr: '',
    client_name: '',
    referred_by: '',
    referred_by_case_number: '',
    primary_petitioner: '',
    primary_respondent: '',
    petitioner_adv: '',
    respondent_adv: '',
    category: '',
    sub_category: '',
    sub_sub_category: '',
    district: '',
    subject: '',
    memo: '',
    connected_case: '',
    purpose: '',
    jud_name: '',
    filing_date: '',
    registration_date: '',
    listing_date: '',
    return_date: '',
    disp_date: '',
    disp_type: '',
    prayer: '',
    status: 'pending' as 'pending' | 'filed' | 'disposed' | 'closed',
    // Criminal Petition Fields
    petition_type: '' as 'new' | 'returned' | 'resubmitted',
    return_reasons: '',
    slr_number: '',
    hearing_court: '',
    mention_date: '',
    temporary_filing_number: '',
    permanent_filing_number: '',
    courtship_submitted: false,
    courtship_submission_type: '' as 'internal' | 'registry',
    acknowledgment_received: false,
    hearing_request_status: '' as 'pending' | 'accepted' | 'rejected',
    next_hearing_date: '',
    assigned_to: '',
    fasi_comments: '',
    hearing_date: '',
    // Motion List Fields
    motion_type: '' as 'adjournment' | 'emergency' | 'courtship' | 'other',
    motion_reason: '',
    is_adjourned: false,
    // Post Listing Fields
    post_listing_date: '',
    posting_clerk_name: '',
    backdated_reason: '',
    advance_date: false,
    backdated: false,
    document_requirements: '',
    // New fields matching court system
    ia_details: [] as Array<{
      ia_number: string;
      filing_date: string;
      advocate_name: string;
      misc_paper_type: string;
      status: string;
      prayer: string;
      order_date: string;
      order: string;
    }>,
    usr_details: [] as Array<{
      usr_number: string;
      advocate_name: string;
      usr_type: string;
      usr_filing_date: string;
      remarks: string;
    }>,
    submission_dates: [] as Array<{
      submission_number: number;
      submission_date: string;
      submitted_by: string;
      due_date: string;
      filing_date: string;
      resubmission_date: string;
      return_date: string;
      return_taken_by: string;
      changes_made: string;
      changes_requested: string;
      changes_requested_by: string;
      notes: string;
    }>,
    connected_matters: '',
    vakalath_details: [] as Array<{
      advocate_code: string;
      advocate_name: string;
      p_r_no: string;
      remarks: string;
      file_url: string;
    }>,
    lower_court_details: {
      court_name: '',
      district: '',
      lower_court_case_no: '',
      honorable_judge: '',
      date_of_judgement: ''
    },
    petitioners: [] as Array<{ s_no: number; name: string }>,
    respondents: [] as Array<{ r_no: number; name: string }>,
    orders: [] as Array<{
      order_on: string;
      judge_name: string;
      date: string;
      type: string;
      details: string;
      file_url: string;
    }>
  });

  useEffect(() => {
    if (id && id !== 'new') {
      setIsEditMode(true);
      loadCase();
    }
  }, [id]);

  // Check if case already exists
  const checkCaseExists = async (caseNumber: string) => {
    if (!caseNumber.trim() || isEditMode) return;
    
    setCheckingCase(true);
    try {
      const { data, error } = await supabase
        .from('cases')
        .select('id')
        .eq('case_number', caseNumber.trim())
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows found, which is good
        throw error;
      }

      setCaseExists(!!data);
    } catch (error: any) {
      console.error('Error checking case:', error);
    } finally {
      setCheckingCase(false);
    }
  };

  const loadCase = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) {
        toast.error('Case not found');
        navigate('/cases');
        return;
      }
      
      setFormData({
        case_number: data.case_number || '',
        flc_number: data.flc_number || '',
        sr_number: data.sr_number || '',
        cnr: data.cnr || '',
        client_name: data.client_name || '',
        referred_by: data.referred_by || '',
        referred_by_case_number: data.referred_by_case_number || '',
        primary_petitioner: data.primary_petitioner || '',
        primary_respondent: data.primary_respondent || '',
        petitioner_adv: data.petitioner_adv || '',
        respondent_adv: data.respondent_adv || '',
        category: data.category || '',
        sub_category: data.sub_category || '',
        sub_sub_category: data.sub_sub_category || '',
        district: data.district || '',
        subject: data.subject || '',
        memo: data.memo || '',
        connected_case: data.connected_case || '',
        purpose: data.purpose || '',
        jud_name: data.jud_name || '',
        filing_date: data.filing_date || '',
        registration_date: data.registration_date || '',
        listing_date: data.listing_date || '',
        return_date: data.return_date || '',
        disp_date: data.disp_date || '',
        disp_type: data.disp_type || '',
        prayer: data.prayer || '',
        status: data.status || 'pending',
        petition_type: data.petition_type || 'new',
        return_reasons: data.return_reasons || '',
        slr_number: data.slr_number || '',
        hearing_court: data.hearing_court || '',
        mention_date: data.mention_date || '',
        temporary_filing_number: data.temporary_filing_number || '',
        permanent_filing_number: data.permanent_filing_number || '',
        courtship_submitted: data.courtship_submitted || false,
        courtship_submission_type: data.courtship_submission_type || 'internal',
        acknowledgment_received: data.acknowledgment_received || false,
        hearing_request_status: data.hearing_request_status || 'pending',
        next_hearing_date: data.next_hearing_date || '',
        assigned_to: data.assigned_to || '',
        fasi_comments: data.fasi_comments || '',
        hearing_date: data.hearing_date || '',
        motion_type: data.motion_type || '',
        motion_reason: data.motion_reason || '',
        is_adjourned: data.is_adjourned || false,
        post_listing_date: data.post_listing_date || '',
        posting_clerk_name: data.posting_clerk_name || '',
        backdated_reason: data.backdated_reason || '',
        advance_date: data.advance_date || false,
        backdated: data.backdated || false,
        document_requirements: data.document_requirements || '',
        ia_details: (() => { const v = data.ia_details; return Array.isArray(v) ? v : (typeof v === 'string' ? (() => { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; } })() : []); })(),
        usr_details: (() => { const v = data.usr_details; return Array.isArray(v) ? v : (typeof v === 'string' ? (() => { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; } })() : []); })(),
        submission_dates: (() => { const v = data.submission_dates; return Array.isArray(v) ? v : (typeof v === 'string' ? (() => { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; } })() : []); })(),
        connected_matters: data.connected_matters || '',
        vakalath_details: (() => { const v = data.vakalath_details; return Array.isArray(v) ? v : (typeof v === 'string' ? (() => { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; } })() : []); })(),
        lower_court_details: data.lower_court_details || {
          court_name: '',
          district: '',
          lower_court_case_no: '',
          honorable_judge: '',
          date_of_judgement: ''
        },
        petitioners: (() => { const v = data.petitioners; return Array.isArray(v) ? v : (typeof v === 'string' ? (() => { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; } })() : []); })(),
        respondents: (() => { const v = data.respondents; return Array.isArray(v) ? v : (typeof v === 'string' ? (() => { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; } })() : []); })(),
        orders: (() => { const v = data.orders; return Array.isArray(v) ? v : (typeof v === 'string' ? (() => { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; } })() : []); })()
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to load case');
      navigate('/cases');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);
    try {
      // Only include core case fields that exist in database
      // Filter out fields that are not part of the base cases table
      const caseData = {
        case_number: formData.case_number || null,
        flc_number: formData.flc_number || null,
        sr_number: formData.sr_number || null,
        cnr: formData.cnr || null,
        client_name: formData.client_name || null,
        referred_by: formData.referred_by || null,
        referred_by_case_number: formData.referred_by_case_number || null,
        primary_petitioner: formData.primary_petitioner || null,
        primary_respondent: formData.primary_respondent || null,
        petitioner_adv: formData.petitioner_adv || null,
        respondent_adv: formData.respondent_adv || null,
        category: formData.category || null,
        sub_category: formData.sub_category || null,
        sub_sub_category: formData.sub_sub_category || null,
        district: formData.district || null,
        subject: formData.subject || null,
        memo: formData.memo || null,
        connected_case: formData.connected_case || null,
        purpose: formData.purpose || null,
        jud_name: formData.jud_name || null,
        filing_date: formData.filing_date || null,
        registration_date: formData.registration_date || null,
        listing_date: formData.listing_date || null,
        return_date: formData.return_date || null,
        disp_date: formData.disp_date || null,
        disp_type: formData.disp_type || null,
        prayer: formData.prayer || null,
        status: formData.status,
        // New fields
        ia_details: formData.ia_details,
        usr_details: formData.usr_details,
        submission_dates: formData.submission_dates,
        connected_matters: formData.connected_matters || null,
        vakalath_details: formData.vakalath_details,
        lower_court_details: formData.lower_court_details,
        petitioners: formData.petitioners,
        respondents: formData.respondents,
        orders: formData.orders
      };

      if (isEditMode && id) {
        // Update existing case
        const { error } = await supabase
          .from('cases')
          .update({
            ...caseData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (error) throw error;
        toast.success('Case updated successfully');
        navigate(`/cases/${id}`);
      } else {
        // Create new case
        const { data, error } = await supabase
          .from('cases')
          .insert({
            ...caseData,
            created_by: user?.id,
          })
          .select()
          .single();

        if (error) throw error;
        toast.success('Case created successfully');
        navigate(`/cases/${data.id}`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save case');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center space-x-4 mb-6">
        <Link to="/cases" className="text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">
          {isEditMode ? 'Edit Case' : 'New Case'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Case Number
              </label>
              <input
                type="text"
                value={formData.case_number}
                onChange={(e) => {
                  setFormData({ ...formData, case_number: e.target.value });
                  checkCaseExists(e.target.value);
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  caseExists && !isEditMode ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300'
                }`}
              />
              {caseExists && !isEditMode && (
                <div className="flex items-center gap-2 mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm text-yellow-700 font-medium">Case already exists in the system</span>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                FLC Number (Optional - for new cases without case number)
              </label>
              <input
                type="text"
                value={formData.flc_number}
                onChange={(e) => setFormData({ ...formData, flc_number: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter FLC number if no case number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SR Number</label>
              <input
                type="text"
                value={formData.sr_number}
                onChange={(e) => setFormData({ ...formData, sr_number: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CNR</label>
              <input
                type="text"
                value={formData.cnr}
                onChange={(e) => setFormData({ ...formData, cnr: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
              <input
                type="text"
                value={formData.client_name}
                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="pending">Pending</option>
                <option value="filed">Filed</option>
                <option value="disposed">Disposed</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Referred By</label>
              <input
                type="text"
                value={formData.referred_by}
                onChange={(e) => setFormData({ ...formData, referred_by: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Name of person who referred"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Referred By Case Number</label>
              <input
                type="text"
                value={formData.referred_by_case_number}
                onChange={(e) => setFormData({ ...formData, referred_by_case_number: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <textarea
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter case subject (up to 1000 characters)"
                maxLength={1000}
              />
              <p className="text-xs text-gray-500 mt-1">{formData.subject.length}/1000</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Memo/Notes</label>
              <textarea
                value={formData.memo}
                onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter any memos or notes (up to 1000 characters)"
                maxLength={1000}
              />
              <p className="text-xs text-gray-500 mt-1">{formData.memo.length}/1000</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Connected Case</label>
              <input
                type="text"
                value={formData.connected_case}
                onChange={(e) => setFormData({ ...formData, connected_case: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Link to connected/existing case (same client)"
              />
            </div>
          </div>
        </div>

        {/* Parties */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">Parties</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Primary Petitioner</label>
              <input
                type="text"
                value={formData.primary_petitioner}
                onChange={(e) => setFormData({ ...formData, primary_petitioner: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Primary Respondent</label>
              <input
                type="text"
                value={formData.primary_respondent}
                onChange={(e) => setFormData({ ...formData, primary_respondent: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Petitioner Advocate</label>
              <input
                type="text"
                value={formData.petitioner_adv}
                onChange={(e) => setFormData({ ...formData, petitioner_adv: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Respondent Advocate</label>
              <input
                type="text"
                value={formData.respondent_adv}
                onChange={(e) => setFormData({ ...formData, respondent_adv: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Classification */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">Classification</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Civil, Criminal"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sub Category</label>
              <input
                type="text"
                value={formData.sub_category}
                onChange={(e) => setFormData({ ...formData, sub_category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sub-Sub Category</label>
              <input
                type="text"
                value={formData.sub_sub_category}
                onChange={(e) => setFormData({ ...formData, sub_sub_category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Location & Judge */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">Location & Judge</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
              <input
                type="text"
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
              <input
                type="text"
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Judge Name</label>
              <input
                type="text"
                value={formData.jud_name}
                onChange={(e) => setFormData({ ...formData, jud_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Important Dates */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">Important Dates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Filing Date</label>
              <input
                type="date"
                value={formData.filing_date}
                onChange={(e) => setFormData({ ...formData, filing_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Registration Date</label>
              <input
                type="date"
                value={formData.registration_date}
                onChange={(e) => setFormData({ ...formData, registration_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Listing Date</label>
              <input
                type="date"
                value={formData.listing_date}
                onChange={(e) => setFormData({ ...formData, listing_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Return Date</label>
              <input
                type="date"
                value={formData.return_date}
                onChange={(e) => setFormData({ ...formData, return_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Disposal Date</label>
              <input
                type="date"
                value={formData.disp_date}
                onChange={(e) => setFormData({ ...formData, disp_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Disposal Type</label>
              <input
                type="text"
                value={formData.disp_type}
                onChange={(e) => setFormData({ ...formData, disp_type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Prayer */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">Prayer</h2>
          <div>
            <textarea
              value={formData.prayer}
              onChange={(e) => setFormData({ ...formData, prayer: e.target.value })}
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter the prayer/relief sought..."
            />
          </div>
        </div>

        {/* Criminal Petition Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">Criminal Petition Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Petition Type</label>
              <select
                value={formData.petition_type}
                onChange={(e) => setFormData({ ...formData, petition_type: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Type</option>
                <option value="new">New Petition</option>
                <option value="returned">Returned</option>
                <option value="resubmitted">Resubmitted</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SLR Number</label>
              <input
                type="text"
                value={formData.slr_number}
                onChange={(e) => setFormData({ ...formData, slr_number: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Temporary Filing Number</label>
              <input
                type="text"
                value={formData.temporary_filing_number}
                onChange={(e) => setFormData({ ...formData, temporary_filing_number: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Permanent Filing Number</label>
              <input
                type="text"
                value={formData.permanent_filing_number}
                onChange={(e) => setFormData({ ...formData, permanent_filing_number: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hearing Court</label>
              <input
                type="text"
                value={formData.hearing_court}
                onChange={(e) => setFormData({ ...formData, hearing_court: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mention Date</label>
              <input
                type="date"
                value={formData.mention_date}
                onChange={(e) => setFormData({ ...formData, mention_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Next Hearing Date</label>
              <input
                type="date"
                value={formData.next_hearing_date}
                onChange={(e) => setFormData({ ...formData, next_hearing_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hearing Date</label>
              <input
                type="date"
                value={formData.hearing_date}
                onChange={(e) => setFormData({ ...formData, hearing_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hearing Request Status</label>
              <select
                value={formData.hearing_request_status}
                onChange={(e) => setFormData({ ...formData, hearing_request_status: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Status</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Courtship Submission Type</label>
              <select
                value={formData.courtship_submission_type}
                onChange={(e) => setFormData({ ...formData, courtship_submission_type: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="internal">Internal Post Office (Tapal)</option>
                <option value="registry">Registry Judicial Office</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="courtship_submitted"
                checked={formData.courtship_submitted}
                onChange={(e) => setFormData({ ...formData, courtship_submitted: e.target.checked })}
                className="w-4 h-4 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="courtship_submitted" className="text-sm font-medium text-gray-700">
                Courtship Submitted
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="acknowledgment_received"
                checked={formData.acknowledgment_received}
                onChange={(e) => setFormData({ ...formData, acknowledgment_received: e.target.checked })}
                className="w-4 h-4 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="acknowledgment_received" className="text-sm font-medium text-gray-700">
                Acknowledgment Received
              </label>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reasons for Return</label>
              <textarea
                value={formData.return_reasons}
                onChange={(e) => setFormData({ ...formData, return_reasons: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter reasons if petition was returned..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fasi Comments</label>
              <textarea
                value={formData.fasi_comments}
                onChange={(e) => setFormData({ ...formData, fasi_comments: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Add comments..."
              />
            </div>
          </div>
        </div>

        {/* IA Details Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-blue-600 mb-4 border-b pb-2">IA DETAILS</h2>
          {formData.ia_details.map((ia, index) => (
            <div key={index} className="border border-gray-300 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IA Number</label>
                  <input
                    type="text"
                    value={ia.ia_number}
                    onChange={(e) => {
                      const updated = [...formData.ia_details];
                      updated[index].ia_number = e.target.value;
                      setFormData({ ...formData, ia_details: updated });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="IA Number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Filing Date</label>
                  <input
                    type="date"
                    value={ia.filing_date}
                    onChange={(e) => {
                      const updated = [...formData.ia_details];
                      updated[index].filing_date = e.target.value;
                      setFormData({ ...formData, ia_details: updated });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Advocate Name</label>
                  <input
                    type="text"
                    value={ia.advocate_name}
                    onChange={(e) => {
                      const updated = [...formData.ia_details];
                      updated[index].advocate_name = e.target.value;
                      setFormData({ ...formData, ia_details: updated });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Advocate Name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Misc Paper Type</label>
                  <input
                    type="text"
                    value={ia.misc_paper_type}
                    onChange={(e) => {
                      const updated = [...formData.ia_details];
                      updated[index].misc_paper_type = e.target.value;
                      setFormData({ ...formData, ia_details: updated });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Type"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <input
                    type="text"
                    value={ia.status}
                    onChange={(e) => {
                      const updated = [...formData.ia_details];
                      updated[index].status = e.target.value;
                      setFormData({ ...formData, ia_details: updated });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Status"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prayer</label>
                  <input
                    type="text"
                    value={ia.prayer}
                    onChange={(e) => {
                      const updated = [...formData.ia_details];
                      updated[index].prayer = e.target.value;
                      setFormData({ ...formData, ia_details: updated });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Prayer details"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Order Date</label>
                  <input
                    type="date"
                    value={ia.order_date}
                    onChange={(e) => {
                      const updated = [...formData.ia_details];
                      updated[index].order_date = e.target.value;
                      setFormData({ ...formData, ia_details: updated });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
                  <input
                    type="text"
                    value={ia.order}
                    onChange={(e) => {
                      const updated = [...formData.ia_details];
                      updated[index].order = e.target.value;
                      setFormData({ ...formData, ia_details: updated });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Order details"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const updated = formData.ia_details.filter((_, i) => i !== index);
                  setFormData({ ...formData, ia_details: updated });
                }}
                className="mt-3 text-red-600 hover:text-red-700 text-sm font-medium"
              >
                Remove IA
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              setFormData({
                ...formData,
                ia_details: [...formData.ia_details, {
                  ia_number: '',
                  filing_date: '',
                  advocate_name: '',
                  misc_paper_type: '',
                  status: '',
                  prayer: '',
                  order_date: '',
                  order: ''
                }]
              });
            }}
            className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition"
          >
            + Add IA Detail
          </button>
        </div>

        {/* USR Details Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-blue-600 mb-4 border-b pb-2">USR Details</h2>
          {formData.usr_details.map((usr, index) => (
            <div key={index} className="border border-gray-300 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">USR Number</label>
                  <input
                    type="text"
                    value={usr.usr_number}
                    onChange={(e) => {
                      const updated = [...formData.usr_details];
                      updated[index].usr_number = e.target.value;
                      setFormData({ ...formData, usr_details: updated });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="USR Number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Advocate Name</label>
                  <input
                    type="text"
                    value={usr.advocate_name}
                    onChange={(e) => {
                      const updated = [...formData.usr_details];
                      updated[index].advocate_name = e.target.value;
                      setFormData({ ...formData, usr_details: updated });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Advocate"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">USR Type</label>
                  <input
                    type="text"
                    value={usr.usr_type}
                    onChange={(e) => {
                      const updated = [...formData.usr_details];
                      updated[index].usr_type = e.target.value;
                      setFormData({ ...formData, usr_details: updated });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Type"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">USR Filing Date</label>
                  <input
                    type="date"
                    value={usr.usr_filing_date}
                    onChange={(e) => {
                      const updated = [...formData.usr_details];
                      updated[index].usr_filing_date = e.target.value;
                      setFormData({ ...formData, usr_details: updated });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                  <input
                    type="text"
                    value={usr.remarks}
                    onChange={(e) => {
                      const updated = [...formData.usr_details];
                      updated[index].remarks = e.target.value;
                      setFormData({ ...formData, usr_details: updated });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Remarks"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const updated = formData.usr_details.filter((_, i) => i !== index);
                  setFormData({ ...formData, usr_details: updated });
                }}
                className="mt-3 text-red-600 hover:text-red-700 text-sm font-medium"
              >
                Remove USR
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              setFormData({
                ...formData,
                usr_details: [...formData.usr_details, {
                  usr_number: '',
                  advocate_name: '',
                  usr_type: '',
                  usr_filing_date: '',
                  remarks: ''
                }]
              });
            }}
            className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition"
          >
            + Add USR Detail
          </button>
        </div>

        {/* Submission Dates Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-green-600 mb-4 border-b pb-2">SUBMISSION & RETURN DATES</h2>
          <p className="text-sm text-gray-600 mb-4">Track case submissions, returns, filing dates and changes requested</p>
          {formData.submission_dates.map((submission, index) => (
            <div key={index} className="border border-gray-300 rounded-lg p-4 mb-4 bg-gray-50">
              <div className="mb-3">
                <h3 className="font-semibold text-gray-800">Submission #{submission.submission_number || index + 1}</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Submission Date</label>
                  <input
                    type="date"
                    value={submission.submission_date}
                    onChange={(e) => {
                      const updated = [...formData.submission_dates];
                      updated[index].submission_date = e.target.value;
                      setFormData({ ...formData, submission_dates: updated });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Submitted By</label>
                  <input
                    type="text"
                    value={submission.submitted_by}
                    onChange={(e) => {
                      const updated = [...formData.submission_dates];
                      updated[index].submitted_by = e.target.value;
                      setFormData({ ...formData, submission_dates: updated });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Name/ID of person"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={submission.due_date}
                    onChange={(e) => {
                      const updated = [...formData.submission_dates];
                      updated[index].due_date = e.target.value;
                      setFormData({ ...formData, submission_dates: updated });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Filing Date</label>
                  <input
                    type="date"
                    value={submission.filing_date}
                    onChange={(e) => {
                      const updated = [...formData.submission_dates];
                      updated[index].filing_date = e.target.value;
                      setFormData({ ...formData, submission_dates: updated });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Resubmission Date</label>
                  <input
                    type="date"
                    value={submission.resubmission_date}
                    onChange={(e) => {
                      const updated = [...formData.submission_dates];
                      updated[index].resubmission_date = e.target.value;
                      setFormData({ ...formData, submission_dates: updated });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Return Date</label>
                  <input
                    type="date"
                    value={submission.return_date}
                    onChange={(e) => {
                      const updated = [...formData.submission_dates];
                      updated[index].return_date = e.target.value;
                      setFormData({ ...formData, submission_dates: updated });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Return Taken By</label>
                  <input
                    type="text"
                    value={submission.return_taken_by}
                    onChange={(e) => {
                      const updated = [...formData.submission_dates];
                      updated[index].return_taken_by = e.target.value;
                      setFormData({ ...formData, submission_dates: updated });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Name/ID of person"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Changes Made</label>
                  <input
                    type="text"
                    value={submission.changes_made}
                    onChange={(e) => {
                      const updated = [...formData.submission_dates];
                      updated[index].changes_made = e.target.value;
                      setFormData({ ...formData, submission_dates: updated });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Changes made during return"
                  />
                </div>
              </div>

              <div className="mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Changes Requested</label>
                  <textarea
                    value={submission.changes_requested}
                    onChange={(e) => {
                      const updated = [...formData.submission_dates];
                      updated[index].changes_requested = e.target.value;
                      setFormData({ ...formData, submission_dates: updated });
                    }}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="What changes were requested"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Changes Requested By</label>
                  <input
                    type="text"
                    value={submission.changes_requested_by}
                    onChange={(e) => {
                      const updated = [...formData.submission_dates];
                      updated[index].changes_requested_by = e.target.value;
                      setFormData({ ...formData, submission_dates: updated });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Name/ID of person"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={submission.notes}
                    onChange={(e) => {
                      const updated = [...formData.submission_dates];
                      updated[index].notes = e.target.value;
                      setFormData({ ...formData, submission_dates: updated });
                    }}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Additional notes"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const updated = formData.submission_dates.filter((_, i) => i !== index);
                  setFormData({ ...formData, submission_dates: updated });
                }}
                className="mt-3 text-red-600 hover:text-red-700 text-sm font-medium"
              >
                Remove Submission
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              const nextNum = formData.submission_dates.length + 1;
              setFormData({
                ...formData,
                submission_dates: [...formData.submission_dates, {
                  submission_number: nextNum,
                  submission_date: '',
                  submitted_by: '',
                  due_date: '',
                  filing_date: '',
                  resubmission_date: '',
                  return_date: '',
                  return_taken_by: '',
                  changes_made: '',
                  changes_requested: '',
                  changes_requested_by: '',
                  notes: ''
                }]
              });
            }}
            className="w-full py-2 border-2 border-dashed border-green-300 rounded-lg text-green-600 hover:border-green-500 hover:text-green-700 transition"
          >
            + Add Submission Record
          </button>
        </div>

        {/* Connected Matters Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-blue-600 mb-4 border-b pb-2">CONNECTED MATTERS</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Connected Case Number</label>
            <input
              type="text"
              value={formData.connected_matters}
              onChange={(e) => setFormData({ ...formData, connected_matters: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter connected case numbers"
            />
          </div>
        </div>

        {/* Vakalath Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-blue-600 mb-4 border-b pb-2">VAKALATH</h2>
          {formData.vakalath_details.map((vak, index) => (
            <div key={index} className="border border-gray-300 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Advocate Code</label>
                  <input
                    type="text"
                    value={vak.advocate_code}
                    onChange={(e) => {
                      const updated = [...formData.vakalath_details];
                      updated[index].advocate_code = e.target.value;
                      setFormData({ ...formData, vakalath_details: updated });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Code"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Advocate Name</label>
                  <input
                    type="text"
                    value={vak.advocate_name}
                    onChange={(e) => {
                      const updated = [...formData.vakalath_details];
                      updated[index].advocate_name = e.target.value;
                      setFormData({ ...formData, vakalath_details: updated });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">P/R No.</label>
                  <input
                    type="text"
                    value={vak.p_r_no}
                    onChange={(e) => {
                      const updated = [...formData.vakalath_details];
                      updated[index].p_r_no = e.target.value;
                      setFormData({ ...formData, vakalath_details: updated });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="P/R No"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                  <input
                    type="text"
                    value={vak.remarks}
                    onChange={(e) => {
                      const updated = [...formData.vakalath_details];
                      updated[index].remarks = e.target.value;
                      setFormData({ ...formData, vakalath_details: updated });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Remarks"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">File URL</label>
                  <input
                    type="text"
                    value={vak.file_url}
                    onChange={(e) => {
                      const updated = [...formData.vakalath_details];
                      updated[index].file_url = e.target.value;
                      setFormData({ ...formData, vakalath_details: updated });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Document URL"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const updated = formData.vakalath_details.filter((_, i) => i !== index);
                  setFormData({ ...formData, vakalath_details: updated });
                }}
                className="mt-3 text-red-600 hover:text-red-700 text-sm font-medium"
              >
                Remove Vakalath
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              setFormData({
                ...formData,
                vakalath_details: [...formData.vakalath_details, {
                  advocate_code: '',
                  advocate_name: '',
                  p_r_no: '',
                  remarks: '',
                  file_url: ''
                }]
              });
            }}
            className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition"
          >
            + Add Vakalath Entry
          </button>
        </div>

        {/* Lower Court Details Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-blue-600 mb-4 border-b pb-2">LOWER COURT DETAILS</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Court Name</label>
              <input
                type="text"
                value={formData.lower_court_details.court_name}
                onChange={(e) => setFormData({
                  ...formData,
                  lower_court_details: { ...formData.lower_court_details, court_name: e.target.value }
                })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Court Name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
              <input
                type="text"
                value={formData.lower_court_details.district}
                onChange={(e) => setFormData({
                  ...formData,
                  lower_court_details: { ...formData.lower_court_details, district: e.target.value }
                })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="District"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lower Court Case No.</label>
              <input
                type="text"
                value={formData.lower_court_details.lower_court_case_no}
                onChange={(e) => setFormData({
                  ...formData,
                  lower_court_details: { ...formData.lower_court_details, lower_court_case_no: e.target.value }
                })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Case Number"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hon'ble Judge</label>
              <input
                type="text"
                value={formData.lower_court_details.honorable_judge}
                onChange={(e) => setFormData({
                  ...formData,
                  lower_court_details: { ...formData.lower_court_details, honorable_judge: e.target.value }
                })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Judge Name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Judgement</label>
              <input
                type="date"
                value={formData.lower_court_details.date_of_judgement}
                onChange={(e) => setFormData({
                  ...formData,
                  lower_court_details: { ...formData.lower_court_details, date_of_judgement: e.target.value }
                })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Petitioners Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-blue-600 mb-4 border-b pb-2">PETITIONER(S)</h2>
          {formData.petitioners.map((pet, index) => (
            <div key={index} className="flex gap-4 mb-3">
              <div className="w-24">
                <label className="block text-sm font-medium text-gray-700 mb-1">S.No</label>
                <input
                  type="number"
                  value={pet.s_no}
                  onChange={(e) => {
                    const updated = [...formData.petitioners];
                    updated[index].s_no = parseInt(e.target.value) || 0;
                    setFormData({ ...formData, petitioners: updated });
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="#"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Petitioner(S) Name</label>
                <input
                  type="text"
                  value={pet.name}
                  onChange={(e) => {
                    const updated = [...formData.petitioners];
                    updated[index].name = e.target.value;
                    setFormData({ ...formData, petitioners: updated });
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Petitioner Name"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  const updated = formData.petitioners.filter((_, i) => i !== index);
                  setFormData({ ...formData, petitioners: updated });
                }}
                className="mt-7 text-red-600 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              setFormData({
                ...formData,
                petitioners: [...formData.petitioners, { s_no: formData.petitioners.length + 1, name: '' }]
              });
            }}
            className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition"
          >
            + Add Petitioner
          </button>
        </div>

        {/* Respondents Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-blue-600 mb-4 border-b pb-2">RESPONDENT(S)</h2>
          {formData.respondents.map((res, index) => (
            <div key={index} className="flex gap-4 mb-3">
              <div className="w-24">
                <label className="block text-sm font-medium text-gray-700 mb-1">R.No</label>
                <input
                  type="number"
                  value={res.r_no}
                  onChange={(e) => {
                    const updated = [...formData.respondents];
                    updated[index].r_no = parseInt(e.target.value) || 0;
                    setFormData({ ...formData, respondents: updated });
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="#"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Respondent(S) Name</label>
                <input
                  type="text"
                  value={res.name}
                  onChange={(e) => {
                    const updated = [...formData.respondents];
                    updated[index].name = e.target.value;
                    setFormData({ ...formData, respondents: updated });
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Respondent Name"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  const updated = formData.respondents.filter((_, i) => i !== index);
                  setFormData({ ...formData, respondents: updated });
                }}
                className="mt-7 text-red-600 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              setFormData({
                ...formData,
                respondents: [...formData.respondents, { r_no: formData.respondents.length + 1, name: '' }]
              });
            }}
            className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition"
          >
            + Add Respondent
          </button>
        </div>

        {/* Orders Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-blue-600 mb-4 border-b pb-2">ORDERS</h2>
          {formData.orders.map((order, index) => (
            <div key={index} className="border border-gray-300 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Order On</label>
                  <input
                    type="text"
                    value={order.order_on}
                    onChange={(e) => {
                      const updated = [...formData.orders];
                      updated[index].order_on = e.target.value;
                      setFormData({ ...formData, orders: updated });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Order Subject"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Judge Name</label>
                  <input
                    type="text"
                    value={order.judge_name}
                    onChange={(e) => {
                      const updated = [...formData.orders];
                      updated[index].judge_name = e.target.value;
                      setFormData({ ...formData, orders: updated });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Judge Name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={order.date}
                    onChange={(e) => {
                      const updated = [...formData.orders];
                      updated[index].date = e.target.value;
                      setFormData({ ...formData, orders: updated });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <input
                    type="text"
                    value={order.type}
                    onChange={(e) => {
                      const updated = [...formData.orders];
                      updated[index].type = e.target.value;
                      setFormData({ ...formData, orders: updated });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Order Type"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Details</label>
                  <input
                    type="text"
                    value={order.details}
                    onChange={(e) => {
                      const updated = [...formData.orders];
                      updated[index].details = e.target.value;
                      setFormData({ ...formData, orders: updated });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Order Details"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">File URL</label>
                  <input
                    type="text"
                    value={order.file_url}
                    onChange={(e) => {
                      const updated = [...formData.orders];
                      updated[index].file_url = e.target.value;
                      setFormData({ ...formData, orders: updated });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="PDF Link"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const updated = formData.orders.filter((_, i) => i !== index);
                  setFormData({ ...formData, orders: updated });
                }}
                className="mt-3 text-red-600 hover:text-red-700 text-sm font-medium"
              >
                Remove Order
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              setFormData({
                ...formData,
                orders: [...formData.orders, {
                  order_on: '',
                  judge_name: '',
                  date: '',
                  type: '',
                  details: '',
                  file_url: ''
                }]
              });
            }}
            className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition"
          >
            + Add Order
          </button>
        </div>

        {/* Motion List Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">Motion List</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Motion Type</label>
              <select
                value={formData.motion_type}
                onChange={(e) => setFormData({ ...formData, motion_type: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Motion Type</option>
                <option value="adjournment">Adjournment Motion</option>
                <option value="emergency">Emergency Motion</option>
                <option value="courtship">Courtship Motion</option>
                <option value="other">Other Motion</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Motion Reason</label>
              <input
                type="text"
                value={formData.motion_reason}
                onChange={(e) => setFormData({ ...formData, motion_reason: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Adjournment due to illness..."
              />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_adjourned"
                checked={formData.is_adjourned}
                onChange={(e) => setFormData({ ...formData, is_adjourned: e.target.checked })}
                className="w-4 h-4 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="is_adjourned" className="text-sm font-medium text-gray-700">
                Case is Adjourned
              </label>
            </div>
          </div>
        </div>

        {/* Post Listing Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">Post Listing Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Post Listing Date</label>
              <input
                type="date"
                value={formData.post_listing_date}
                onChange={(e) => setFormData({ ...formData, post_listing_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Posting Clerk Name</label>
              <input
                type="text"
                value={formData.posting_clerk_name}
                onChange={(e) => setFormData({ ...formData, posting_clerk_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="advance_date"
                checked={formData.advance_date}
                onChange={(e) => setFormData({ ...formData, advance_date: e.target.checked })}
                className="w-4 h-4 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="advance_date" className="text-sm font-medium text-gray-700">
                Advance Date
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="backdated"
                checked={formData.backdated}
                onChange={(e) => setFormData({ ...formData, backdated: e.target.checked })}
                className="w-4 h-4 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="backdated" className="text-sm font-medium text-gray-700">
                Back Dated
              </label>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Backdated Reason</label>
            <textarea
              value={formData.backdated_reason}
              onChange={(e) => setFormData({ ...formData, backdated_reason: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Provide reason for backdating if applicable..."
            />
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Document Requirements</label>
            <textarea
              value={formData.document_requirements}
              onChange={(e) => setFormData({ ...formData, document_requirements: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="List required documents for this case..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Link
            to="/cases"
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isEditMode ? 'Update Case' : 'Create Case'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
