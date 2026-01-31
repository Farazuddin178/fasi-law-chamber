import { useEffect, useState } from 'react';
import { casesDB } from '@/lib/database';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Save } from 'lucide-react';

export default function CaseLookupPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mtype, setMtype] = useState('');
  const [mno, setMno] = useState('');
  const [myear, setMyear] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);
  const [autoSearched, setAutoSearched] = useState(false);

  // Helper function to convert DD/MM/YYYY to YYYY-MM-DD
  const convertDateFormat = (dateStr: string): string | null => {
    if (!dateStr || dateStr === '-' || dateStr === 'null') return null;
    try {
      // Check if already in YYYY-MM-DD format
      if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr.split('T')[0];
      
      // Convert DD/MM/YYYY or DD-MM-YYYY to YYYY-MM-DD
      const parts = dateStr.split(/[\/\-]/);
      if (parts.length === 3) {
        const [day, month, year] = parts;
        // Basic validation
        if (parseInt(day) > 31 || parseInt(month) > 12) return null;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      return null;
    } catch (e) {
      console.error('Date conversion error:', dateStr, e);
      return null;
    }
  };

  const search = async (prefill?: { mtype: string; mno: string; myear: string }) => {
    setError(null);
    setResult(null);
    const type = (prefill?.mtype ?? mtype).trim();
    const number = (prefill?.mno ?? mno).trim();
    const year = (prefill?.myear ?? myear).trim();

    if (!type || !number || !year) {
      setError('Please enter case type, number and year');
      return;
    }
    setLoading(true);
    try {
      const backendURL = window.location.hostname === 'localhost' 
        ? 'http://localhost:5001'
        : ''; // Empty string = use same domain
      const url = `${backendURL}/getCaseDetails?mtype=${encodeURIComponent(type)}&mno=${encodeURIComponent(number)}&myear=${encodeURIComponent(year)}`;
      const resp = await fetch(url);
        const contentType = resp.headers.get('content-type') || '';
       
        // Read response body once
        const bodyText = await resp.text();
       
      
      if (!resp.ok) {
        let errorMsg = `Server error: ${resp.status}`;
        try {
           const errData = JSON.parse(bodyText);
          errorMsg = errData.error || errorMsg;
        } catch {
           errorMsg = bodyText || errorMsg;
        }
        setError(errorMsg);
        return;
      }
      
       // Parse JSON from already-read body
       const data = contentType.includes('application/json') 
         ? JSON.parse(bodyText)
         : null;
      if (typeof data === 'string') {
        setError('Unexpected response from server');
      } else if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch (e:any) {
      setError(e?.message || 'Failed to fetch case details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const prefill = (location.state as any)?.prefillCase;
    if (prefill && !autoSearched) {
      setMtype(prefill.mtype || '');
      setMno(prefill.mno || '');
      setMyear(prefill.myear || '');
      search(prefill);
      setAutoSearched(true);
    }
  }, [location.state, autoSearched]);

  const saveCase = async () => {
    if (!result || !result.primary) {
      toast.error('No case data to save');
      return;
    }
    if (!user) {
      toast.error('Please login to save cases');
      return;
    }

    setSaving(true);
    try {
      // Transform petitioners - ensure it's an array with s_no and name
      const transformedPetitioners = Array.isArray(result.petitioners) ? (result.petitioners || []).map((p: any, idx: number) => ({
        s_no: idx + 1,
        name: typeof p === 'string' ? p : (p.petName || p.name || '')
      })) : [];

      // Transform respondents - ensure it's an array with r_no and name
      const transformedRespondents = Array.isArray(result.respondents) ? (result.respondents || []).map((r: any, idx: number) => ({
        r_no: idx + 1,
        name: typeof r === 'string' ? r : (r.resName || r.name || '')
      })) : [];

      // Transform IA details to match CaseDetailsPage format - ensure it's always an array
      const transformedIADetails = Array.isArray(result.ia) ? (result.ia || []).map((ia: any) => ({
        number: ia.iaNumber || '',
        filing_date: convertDateFormat(ia.filingDate) || '',
        advocate_name: ia.advName || '',
        paper_type: ia.miscPaperType || '',
        status: ia.status || '',
        prayer: ia.prayer || '',
        order_date: convertDateFormat(ia.orderDate) || '',
        order: ia.order || ''
      })) : [];

      // Transform USR details to match CaseDetailsPage format - ensure it's always an array
      const transformedUSRDetails = Array.isArray(result.usr) ? (result.usr || []).map((usr: any) => ({
        number: usr.usrNumber || '',
        advocate_name: usr.advName || '',
        usr_type: usr.usrType || '',
        filing_date: convertDateFormat(usr.usrDate) || '',
        remarks: usr.remarks || ''
      })) : [];

      // Transform orders - ensure it's always an array
      const transformedOrders = Array.isArray(result.orderdetails) ? (result.orderdetails || []).map((ord: any) => ({
        order_on: ord.orderOn || '',
        judge_name: ord.judge || '',
        date: convertDateFormat(ord.dateOfOrders) || '',
        type: ord.orderType || '',
        details: ord.orderDetails || '',
        file: ord.orderDetails ? `https://csis.tshc.gov.in/hcorders/${ord.orderDetails}` : ''
      })) : [];

      // Transform Connected Matters
      const transformedConnected = Array.isArray(result.connected) ? (result.connected || []).map((c: any) => {
        if (typeof c === 'string') return { case_number: c };
        return { case_number: c.caseNumber || c.mainno || c };
      }) : [];

      // Transform Lower Court Details
      const transformedLowerCourt = Array.isArray(result.lowerCourt) ? (result.lowerCourt || []).map((lc: any) => ({
        court_name: lc.courtName || lc.court || '',
        district: lc.district || '',
        case_no: lc.caseNumber || lc.caseNo || '',
        judge: lc.judgeName || lc.judge || '',
        judgement_date: convertDateFormat(lc.judgementDate || lc.dateOfJudgement) || ''
      })) : [];

      // Transform Vakalath
      // Note: API might return 'vakalath' or 'vakalathParams'
      const rawVakalath = result.vakalath || result.vakalathParams || [];
      const transformedVakalath = Array.isArray(rawVakalath) ? rawVakalath.map((v: any) => ({
        advocate_code: v.advCode || '',
        advocate_name: v.advName || '',
        pr_no: v.prNo || '',
        remarks: v.remarks || '',
        file: v.link ? `https://csis.tshc.gov.in/${v.link}` : '' 
      })) : [];

      const caseData = {
        case_number: result.primary?.mainno || '',
        sr_number: result.primary?.srno || '',
        cnr: result.primary?.cnrno || '',
        primary_petitioner: result.primary?.petitioner || '',
        primary_respondent: result.primary?.respondent || '',
        petitioner_adv: result.primary?.petitioneradv || '',
        respondent_adv: result.primary?.respondentadv || '',
        category: result.category?.category || result.primary?.casecategory || '',
        sub_category: result.category?.subCategory || '',
        sub_sub_category: result.category?.subSubCategory || '',
        district: result.primary?.district || '',
        filing_date: convertDateFormat(result.primary?.filingdate),
        registration_date: convertDateFormat(result.primary?.registrationdate),
        listing_date: convertDateFormat(result.primary?.listingdate),
        disp_date: convertDateFormat(result.primary?.disposaldate),
        disp_type: result.primary?.disposaltype && result.primary.disposaltype !== '-' ? result.primary.disposaltype : null,
        purpose: result.primary?.purpose || '',
        jud_name: result.primary?.judges || '',
        status: (result.primary?.casestatus === 'PENDING' ? 'pending' : 
                result.primary?.casestatus === 'DISPOSED' ? 'disposed' : 'pending') as 'pending' | 'filed' | 'disposed' | 'closed',
        petitioners: transformedPetitioners,
        respondents: transformedRespondents,
        ia_details: transformedIADetails,
        usr_details: transformedUSRDetails,
        orders: transformedOrders,
        connected_matters: transformedConnected,
        lower_court_details: transformedLowerCourt,
        vakalath: transformedVakalath,
        prayer: result.prayer?.prayer || '',
      };

      // Check if case exists
      const { data: existingCase } = await casesDB.getByCaseNumber(caseData.case_number);

      if (existingCase) {
        // Compare and Generate Update Report
        const updates: string[] = [];
        
        // Helper to format invalid dates/nulls for display
        const fmt = (v: any) => v || '(empty)';

        if (existingCase.status !== caseData.status) 
          updates.push(`Status: ${fmt(existingCase.status)} → ${fmt(caseData.status)}`);
        
        if (existingCase.listing_date !== caseData.listing_date) 
          updates.push(`Listing Date: ${fmt(existingCase.listing_date)} → ${fmt(caseData.listing_date)}`);
        
        if (existingCase.jud_name !== caseData.jud_name) 
          updates.push(`Judge: ${fmt(existingCase.jud_name)} → ${fmt(caseData.jud_name)}`);
        
        if (existingCase.purpose !== caseData.purpose) 
          updates.push(`Purpose: ${fmt(existingCase.purpose)} → ${fmt(caseData.purpose)}`);

        // Check for new Connected Matters
        const oldConnCount = Array.isArray(existingCase.connected_matters) ? existingCase.connected_matters.length : 0;
        const newConnCount = caseData.connected_matters.length;
        if (newConnCount > oldConnCount) updates.push(`New Connected Matters: ${newConnCount - oldConnCount} new`);

        // Check for new Orders
        const oldOrdersCount = Array.isArray(existingCase.orders) ? existingCase.orders.length : 0;
        const newOrdersCount = caseData.orders.length;
        if (newOrdersCount > oldOrdersCount) {
          updates.push(`New Orders: Found ${newOrdersCount - oldOrdersCount} new order(s)`);
        }

        // Check for new IAs
        const oldIACount = Array.isArray(existingCase.ia_details) ? existingCase.ia_details.length : 0;
        const newIACount = caseData.ia_details.length;
        if (newIACount > oldIACount) {
          updates.push(`New IAs: Found ${newIACount - oldIACount} new IA(s)`);
        }

        // Update the case
        const { error } = await casesDB.update(existingCase.id, caseData);
        if (error) {
          console.error('Update error:', error);
          throw new Error(error);
        }

        if (updates.length > 0) {
          toast((t) => (
            <div>
              <p className="font-bold">Case Updated Successfully!</p>
              <ul className="list-disc pl-4 mt-2 text-sm">
                {updates.map((u, i) => <li key={i}>{u}</li>)}
              </ul>
            </div>
          ), { duration: 6000, icon: '📝' });
        } else {
          toast.success('Case updated! No significant changes found.');
        }

      } else {
        // Create New Case
        console.log('Creating new case with user ID:', user.id);
        const { data, error } = await casesDB.create(caseData, user.id);
        if (error) {
          console.error('Create error:', error);
          throw new Error(error);
        }
        toast.success('New case saved successfully!');
      }
      
      navigate('/cases');
    } catch (error: any) {
      console.error('Save case error:', error);
      toast.error(error.message || 'Failed to save case');
    } finally {
      setSaving(false);
    }
  };

  const openOrder = (path?: string | null) => {
    if (!path) return;
    // The HC returns relative file paths in orderdetails[].orderDetails
    const full = `https://csis.tshc.gov.in/${path.replace(/^\//,'')}`;
    window.open(full, '_blank');
  };

  const Section = ({ title, children }: { title: string; children: any }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 overflow-x-auto">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      {children}
    </div>
  );

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-5xl">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold mb-4">Telangana HC - Case Lookup</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Case Type</label>
            <input value={mtype} onChange={e=>setMtype(e.target.value.toUpperCase())} className="w-full px-3 py-2 border rounded-md" placeholder="WP" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Case Number</label>
            <input value={mno} onChange={e=>setMno(e.target.value)} className="w-full px-3 py-2 border rounded-md" placeholder="123" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <input value={myear} onChange={e=>setMyear(e.target.value)} className="w-full px-3 py-2 border rounded-md" placeholder="2026" />
          </div>
          <div className="flex items-end">
            <button onClick={() => search()} disabled={loading} className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-300">
              {loading ? 'Searching…' : 'Get Case Details'}
            </button>
          </div>
        </div>
        {error && <div className="mt-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">{error}</div>}
      </div>

      {result && (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex justify-end">
            <button 
              onClick={saveCase} 
              disabled={saving}
              className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-300"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Case to Database'}
            </button>
          </div>
          <div className="space-y-6">
          {/* Primary */}
          {result.primary && (
            <Section title="Primary Details">
              <table className="min-w-full">
                <tbody>
                  <tr><td className="font-semibold pr-4">Main Number</td><td>{result.primary.mainno}</td></tr>
                  <tr><td className="font-semibold pr-4">SR Number</td><td>{result.primary.srno}</td></tr>
                  <tr><td className="font-semibold pr-4">CNR</td><td className="text-red-700 font-bold">{result.primary.cnrno}</td></tr>
                  <tr><td className="font-semibold pr-4">Petitioner</td><td>{result.primary.petitioner}</td></tr>
                  <tr><td className="font-semibold pr-4">Respondent</td><td>{result.primary.respondent}</td></tr>
                  <tr><td className="font-semibold pr-4">Petitioner Adv</td><td>{result.primary.petitioneradv}</td></tr>
                  <tr><td className="font-semibold pr-4">Respondent Adv</td><td>{result.primary.respondentadv}</td></tr>
                  <tr><td className="font-semibold pr-4">Category</td><td>{result.primary.casecategory}</td></tr>
                  <tr><td className="font-semibold pr-4">District</td><td>{result.primary.district}</td></tr>
                  <tr><td className="font-semibold pr-4">Filing Date</td><td>{result.primary.filingdate}</td></tr>
                  <tr><td className="font-semibold pr-4">Registration Date</td><td>{result.primary.registrationdate}</td></tr>
                  <tr><td className="font-semibold pr-4">Listing Date</td><td>{result.primary.listingdate}</td></tr>
                  <tr><td className="font-semibold pr-4">Status</td><td className="font-semibold text-red-700">{result.primary.casestatus}</td></tr>
                  <tr><td className="font-semibold pr-4">Purpose</td><td>{result.primary.purpose}</td></tr>
                  <tr><td className="font-semibold pr-4">Judges</td><td>{result.primary.judges}</td></tr>
                </tbody>
              </table>
            </Section>
          )}

          {/* Category */}
          {result.category && (
            <Section title="Category">
              <table className="min-w-full">
                <tbody>
                  <tr><td className="font-semibold pr-4">Category</td><td>{result.category.category}</td></tr>
                  <tr><td className="font-semibold pr-4">Sub Category</td><td>{result.category.subCategory}</td></tr>
                  <tr><td className="font-semibold pr-4">Sub-Sub Category</td><td>{result.category.subSubCategory}</td></tr>
                </tbody>
              </table>
            </Section>
          )}

          {/* Connected Matters */}
          {(result.connected || []).length > 0 && (
            <Section title={`Connected Matters (${result.connected.length})`}>
              <ul className="list-disc pl-5">
                {result.connected.map((c: any, idx: number) => (
                  <li key={idx}>{(typeof c === 'string' ? c : c.caseNumber || c.mainno || JSON.stringify(c))}</li>
                ))}
              </ul>
            </Section>
          )}
          
          {/* Lower Court */}
          {Array.isArray(result.lowerCourt) && result.lowerCourt.length > 0 && (
            <Section title="Lower Court Details">
               <table className="min-w-full">
                <thead><tr><th>Court</th><th>Judge</th><th>Case No</th><th>Judgment Date</th></tr></thead>
                <tbody>
                  {result.lowerCourt.map((lc:any, idx:number)=> (
                    <tr key={idx} className="border-t">
                      <td>{lc.courtName || lc.court}</td>
                      <td>{lc.judgeName || lc.judge}</td>
                      <td>{lc.caseNumber || lc.caseNo}</td>
                      <td>{lc.judgementDate || lc.dateOfJudgement}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {/* IA */}
          {Array.isArray(result.ia) && result.ia.length > 0 && (
            <Section title={`IA Details (${result.ia.length})`}>
              <table className="min-w-full">
                <thead><tr><th>Number</th><th>Filing Date</th><th>Advocate</th><th>Type</th><th>Status</th><th>Order Date</th><th>Order</th></tr></thead>
                <tbody>
                  {result.ia.map((row:any, idx:number)=> (
                    <tr key={idx} className="border-t">
                      <td>{row.iaNumber}</td>
                      <td>{row.filingDate}</td>
                      <td>{row.advName}</td>
                      <td>{row.miscPaperType}</td>
                      <td>{row.status}</td>
                      <td>{row.orderDate || '-'}</td>
                      <td>{row.order && row.order !== 'na' ? <button className="text-blue-600 underline" onClick={()=>openOrder(row.order)}>Open</button> : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {/* USR */}
          {Array.isArray(result.usr) && result.usr.length > 0 && (
            <Section title={`USR Details (${result.usr.length})`}>
              <table className="min-w-full">
                <thead><tr><th>USR Number</th><th>Advocate</th><th>Type</th><th>Date</th><th>Remarks</th></tr></thead>
                <tbody>
                  {result.usr.map((row:any, idx:number)=> (
                    <tr key={idx} className="border-t">
                      <td>{row.usrNumber}</td>
                      <td>{row.advName}</td>
                      <td>{row.usrType}</td>
                      <td>{row.usrDate}</td>
                      <td>{row.remarks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {/* Orders */}
          {Array.isArray(result.orderdetails) && result.orderdetails.length > 0 && (
            <Section title={`Orders (${result.orderdetails.length})`}>
              <table className="min-w-full">
                <thead><tr><th>On</th><th>Judge</th><th>Date</th><th>Type</th><th>Open</th></tr></thead>
                <tbody>
                  {result.orderdetails.map((row:any, idx:number)=> (
                    <tr key={idx} className="border-t">
                      <td>{row.orderOn}</td>
                      <td>{row.judge}</td>
                      <td>{row.dateOfOrders}</td>
                      <td>{row.orderType}</td>
                      <td>{row.orderDetails ? <button className="text-blue-600 underline" onClick={()=>openOrder(row.orderDetails)}>PDF</button> : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {/* Raw Debug */}
          {!result.primary && (
            <Section title="Response (raw)">
              <pre className="bg-gray-50 p-4 rounded overflow-auto text-xs">{JSON.stringify(result, null, 2)}</pre>
            </Section>
          )}
        </div>
        </>
      )}
    </div>
  );
}
