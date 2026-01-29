import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase, Case } from '@/lib/supabase';
import { ArrowLeft, Download, Edit, Trash } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

export default function CaseDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);

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
      </div>
    </div>
  );
}
