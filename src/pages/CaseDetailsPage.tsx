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
  const toArray = <T,>(value: any): T[] => (Array.isArray(value) ? value : []);

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
        {/* PRIMARY DETAILS */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 overflow-x-auto">
          <table className="min-w-full minimalistBlack">
            <tbody>
              <tr><th colSpan={4} className="text-center text-blue-700 font-bold">PRIMARY DETAILS</th></tr>
              <tr>
                <td><b>Main Number</b></td>
                <td className="font-bold">{caseData.case_number}</td>
                <td><b>SR Number</b></td>
                <td className="font-bold">{caseData.sr_number || 'N/A'}</td>
              </tr>
              <tr>
                <td className="tdstyle"><b>CNR No.</b></td>
                <td colSpan={3} className="tdstyle text-red-700 font-bold">{caseData.cnr || 'N/A'}</td>
              </tr>
              <tr>
                <td className="tdstyle"><b>Petitioner</b></td>
                <td className="tdstyle font-bold">{caseData.primary_petitioner || 'N/A'}</td>
                <td className="tdstyle"><b>Respondent</b></td>
                <td className="tdstyle font-bold">{caseData.primary_respondent || 'N/A'}</td>
              </tr>
              <tr>
                <td className="tdstyle"><b>Petitioner Advocate</b></td>
                <td className="tdstyle font-bold">{caseData.petitioner_adv || 'N/A'}</td>
                <td className="tdstyle">Respondent Advocate</td>
                <td className="tdstyle font-bold">{caseData.respondent_adv || 'N/A'}</td>
              </tr>
              <tr>
                <td className="tdstyle">Case Category</td>
                <td className="tdstyle font-bold">{caseData.category || 'N/A'}</td>
                <td className="tdstyle">District</td>
                <td className="tdstyle font-bold">{caseData.district || 'N/A'}</td>
              </tr>
              <tr>
                <td className="tdstyle">Filing Date</td>
                <td className="tdstyle font-bold">{caseData.filing_date ? new Date(caseData.filing_date).toLocaleDateString() : 'N/A'}</td>
                <td className="tdstyle">Registration Date</td>
                <td className="tdstyle font-bold">{caseData.registration_date ? new Date(caseData.registration_date).toLocaleDateString() : 'N/A'}</td>
              </tr>
              <tr>
                <td className="tdstyle">Listing Date</td>
                <td className="tdstyle font-bold">{caseData.listing_date ? new Date(caseData.listing_date).toLocaleDateString() : 'N/A'}</td>
                <td>Case Status</td>
                <td className="text-center text-red-700 font-bold">{caseData.status?.toUpperCase()}</td>
              </tr>
              <tr>
                <td className="tdstyle"><b>Disposal Date</b></td>
                <td className="tdstyle font-bold">{caseData.disp_date ? new Date(caseData.disp_date).toLocaleDateString() : 'N/A'}</td>
                <td className="tdstyle"><b>Disposal Type</b></td>
                <td className="tdstyle font-bold">{caseData.disp_type || 'N/A'}</td>
              </tr>
              <tr>
                <td className="tdstyle">Purpose</td>
                <td className="tdstyle font-bold">{caseData.purpose || 'N/A'}</td>
              </tr>
              <tr>
                <td className="tdstyle">Hon'ble Judges</td>
                <td className="tdstyle font-bold" colSpan={3}>{caseData.jud_name || 'N/A'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* CATEGORY */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 overflow-x-auto">
          <table className="min-w-full minimalistBlack">
            <tbody>
              <tr><th colSpan={4} className="text-center text-blue-700 font-bold">Category</th></tr>
              <tr>
                <td className="tdstyle"><b>Category</b></td>
                <td className="tdstyle font-bold">{caseData.category || 'N/A'}</td>
                <td className="tdstyle"><b>Sub Category</b></td>
                <td className="tdstyle font-bold">{caseData.sub_category || 'N/A'}</td>
              </tr>
              <tr>
                <td className="tdstyle"><b>Sub Sub Category</b></td>
                <td className="tdstyle font-bold">{caseData.sub_sub_category || 'N/A'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* IA DETAILS */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 overflow-x-auto">
          <table className="min-w-full B2U-article">
            <tbody>
              <tr><th colSpan={8} className="text-center text-blue-700 font-bold">IA DETAILS</th></tr>
              <tr>
                <td>IA Number</td><td>Filing Date</td><td>Advocate Name</td><td>Misc.Paper Type</td><td>Status</td><td>Prayer</td><td>Order Date</td><td>Order</td>
              </tr>
              {toArray<any>(caseData.ia_details).map((ia, idx: number) => (
                <tr key={idx}>
                  <td>{ia.number || '-'}</td>
                  <td>{ia.filing_date || '-'}</td>
                  <td>{ia.advocate_name || '-'}</td>
                  <td>{ia.paper_type || '-'}</td>
                  <td>{ia.status || '-'}</td>
                  <td>{ia.prayer ? <a href="#" onClick={e => {e.preventDefault(); alert(ia.prayer);}}>IA PRAYER</a> : '-'}</td>
                  <td>{ia.order_date || '-'}</td>
                  <td>{ia.order || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* USR DETAILS */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 overflow-x-auto">
          <table className="min-w-full B2U-article">
            <tbody>
              <tr><th colSpan={5} className="text-center text-blue-700 font-bold">USR Details</th></tr>
              <tr>
                <td>USR Number</td><td>Advocate Name</td><td>USR Type</td><td>USR Filing Date</td><td>Remarks</td>
              </tr>
              {toArray<any>(caseData.usr_details).map((usr, idx: number) => (
                <tr key={idx}>
                  <td>{usr.number || '-'}</td>
                  <td>{usr.advocate_name || '-'}</td>
                  <td>{usr.usr_type || '-'}</td>
                  <td>{usr.filing_date || '-'}</td>
                  <td>{usr.remarks || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 overflow-x-auto">
          <table className="min-w-full B2U-article">
            <tbody>
              <tr><td colSpan={2} className="text-center text-blue-700">PETITIONER(S)</td></tr>
              <tr><td>S.No</td><td>Petitioner(S) Name</td></tr>
              {toArray<any>(caseData.petitioners).map((p, idx: number) => (
                <tr key={idx} style={{ color: '#333300' }}>
                  <td className="font-bold">{idx + 1}</td>
                  <td className="font-bold">{typeof p === 'string' ? p : p.name || JSON.stringify(p)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* RESPONDENTS */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 overflow-x-auto">
          <table className="min-w-full B2U-article">
            <tbody>
              <tr><td colSpan={2} className="text-center text-blue-700">RESPONDENT(S)</td></tr>
              <tr><td>R.No</td><td>Respondent(S) Name</td></tr>
              {toArray<any>(caseData.respondents).map((r, idx: number) => (
                <tr key={idx} style={{ color: '#333300' }}>
                  <td className="font-bold">{idx + 1}</td>
                  <td className="font-bold">{typeof r === 'string' ? r : r.name || JSON.stringify(r)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ORDERS */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 overflow-x-auto">
          <table className="min-w-full B2U-article">
            <tbody>
              <tr><th colSpan={6} className="text-center text-blue-700 font-bold">ORDERS</th></tr>
              <tr><td>Order On</td><td>Judge Name</td><td>Date</td><td>Type</td><td>Details</td><td>File</td></tr>
              {toArray<any>(caseData.orders).map((o, idx: number) => (
                <tr key={idx}>
                  <td>{o.order_on || '-'}</td>
                  <td>{o.judge_name || '-'}</td>
                  <td>{o.date || '-'}</td>
                  <td>{o.type || '-'}</td>
                  <td>{o.details ? <a href={o.details} target="_blank" rel="noopener noreferrer">View</a> : '-'}</td>
                  <td>{o.file ? <a href={o.file} target="_blank" rel="noopener noreferrer">File</a> : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Dynamic arrays: Petitioners, Respondents, IA, Orders, Documents, Connected Matters, Vakalath, Lower Court Details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">Petitioners</h2>
          <div className="space-y-2">
            {toArray<any>(caseData.petitioners).map((p, idx: number) => (
              <div key={idx} className="text-gray-900">
                {typeof p === 'string' ? p : JSON.stringify(p)}
              </div>
            ))}
            {toArray<any>(caseData.petitioners).length === 0 && (
              <p className="text-gray-500">No petitioners listed</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">Respondents</h2>
          <div className="space-y-2">
            {toArray<any>(caseData.respondents).map((p, idx: number) => (
              <div key={idx} className="text-gray-900">
                {typeof p === 'string' ? p : JSON.stringify(p)}
              </div>
            ))}
            {toArray<any>(caseData.respondents).length === 0 && (
              <p className="text-gray-500">No respondents listed</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">IA Details</h2>
          <div className="space-y-2">
            {toArray<any>(caseData.ia_details).map((p, idx: number) => (
              <div key={idx} className="text-gray-900">
                {typeof p === 'string' ? p : JSON.stringify(p)}
              </div>
            ))}
            {toArray<any>(caseData.ia_details).length === 0 && (
              <p className="text-gray-500">No IA details available</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">Orders</h2>
          <div className="space-y-2">
            {toArray<any>(caseData.orders).map((o, idx: number) => (
              <div key={idx} className="text-gray-900">
                {typeof o === 'string' ? o : JSON.stringify(o)}
              </div>
            ))}
            {toArray<any>(caseData.orders).length === 0 && (
              <p className="text-gray-500">No orders available</p>
            )}
          </div>
        </div>

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
