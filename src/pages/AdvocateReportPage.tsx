import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, RefreshCw, ExternalLink, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase, Case } from '@/lib/supabase';
import { auditLogsDB } from '@/lib/database';
import { useAuth } from '@/contexts/AuthContext';

interface AdvCase {
  caseNumber: string;
  srNumber: string;
  petName: string;
  resName: string;
  status: string;
}

interface AdvReport {
  advName: string;
  noOfCases: number;
  noOfVakalaths: number;
  caseDetails: AdvCase[];
}

const parseIndianDate = (dateStr: string | any) => {
  if (!dateStr) return null;
  if (typeof dateStr !== 'string') return null;
  
  const cleanStr = dateStr.trim();
  if (!cleanStr) return null;

  try {
    // Try standard date constructor first if it matches YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(cleanStr)) {
        const d = new Date(cleanStr);
        if (!isNaN(d.getTime())) return d.toISOString();
    }

    // Handle DD/MM/YYYY or DD-MM-YYYY
    const parts = cleanStr.split(/[\/\-]/);
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; 
      const year = parseInt(parts[2], 10);
      
      // Basic validation
      if (day > 31 || month > 11) return null;

      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d.toISOString();
    }
  } catch (e) {
    console.error('Date parse error', e);
  }
  return null;
};

export default function AdvocateReportPage() {
  const [advCode, setAdvCode] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [loading, setLoading] = useState(false);
  const [bulkAddLoading, setBulkAddLoading] = useState(false);
  const [report, setReport] = useState<AdvReport | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const fetchReport = async () => {
    if (!advCode.trim()) {
      toast.error('Please enter advocate code');
      return;
    }
    setLoading(true);
    try {
      const backendURL = window.location.hostname === 'localhost' 
        ? 'http://localhost:5001'
        : ''; // Empty string = use same domain (current page's domain)
      
      const url = `${backendURL}/getAdvReport?advcode=${encodeURIComponent(advCode.trim())}&year=${encodeURIComponent(year.trim())}`;
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
        throw new Error(errorMsg);
      }

      const data = contentType.includes('application/json')
        ? JSON.parse(bodyText)
        : null;

      if (!data || !data.advreport) throw new Error('No report found');
      
      console.log('Report Data Sample:', data.advreport.caseDetails[0]); // Debug log

      setReport(data.advreport as AdvReport);
      toast.success('Report loaded');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load report');
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  const parseCaseNumber = (caseNumber: string) => {
    const match = caseNumber.match(/^([A-Z]+)\s*(\d+)\/(\d{4})$/i);
    if (!match) return null;
    const [, mtype, mno, myear] = match;
    return {
      mtype: mtype.toUpperCase(),
      mno,
      myear
    };
  };

  const bulkAddAllCases = async () => {
    if (!report || !report.caseDetails || report.caseDetails.length === 0) {
      toast.error('No cases to add');
      return;
    }

    // CRITICAL: Check user authentication to ensure changed_by is populated
    if (!user?.id) {
      toast.error('User not authenticated. Please log in to add cases.');
      return;
    }

    setBulkAddLoading(true);
    let successCount = 0;
    let updateCount = 0;
    let failureCount = 0;
    const failedCases: string[] = []; // Track which cases failed

    try {
      for (const advCase of report.caseDetails) {
        try {
          const isNumbered = !!(advCase.caseNumber && advCase.caseNumber.toLowerCase() !== 'not numbered');
          const uniqueValue = isNumbered ? advCase.caseNumber : advCase.srNumber;

          // If table requires case_number, set a stable placeholder for unnumbered
          const normalizedCaseNumber = isNumbered
            ? advCase.caseNumber
            : (advCase.srNumber ? `Not Numbered - ${advCase.srNumber}` : 'Not Numbered - Auto');

          // Normalize data for insert/update
          const rawCase = advCase as any;
          
          // Extract all possible date fields with validation
          const filingDate = parseIndianDate(rawCase.filingDate || rawCase.dt_reg || rawCase.reg_date || rawCase.date_filed || rawCase.filing_date || rawCase.dt_filing);
          const regDate = parseIndianDate(rawCase.registrationDate || rawCase.regDate || rawCase.dt_reg);
          const listingDate = parseIndianDate(rawCase.listingDate || rawCase.nextHearingDate || rawCase.date_listing);
          
          // Robust field extraction with fallbacks - ensure non-empty strings
          const petName = advCase.petName || rawCase.pname || rawCase.pet_name || rawCase.petitioner_name || rawCase.petitioner || '';
          const resName = advCase.resName || rawCase.rname || rawCase.res_name || rawCase.respondent_name || rawCase.respondent || '';
          const statusStr = (advCase.status || rawCase.case_status || rawCase.caseStatus || '').toUpperCase();
          
          // Validate essential fields before proceeding
          if (!petName && !resName) {
            console.warn(`Skipping case ${normalizedCaseNumber} - missing petitioner and respondent names`);
            failureCount++;
            failedCases.push(`${normalizedCaseNumber} (missing parties)`);
            continue;
          }

          // Extract category from case number if possible
          let category = null;
          if (isNumbered) {
            const match = normalizedCaseNumber.match(/^([A-Z]+)/i);
            if (match) category = match[1].toUpperCase();
          }

          // Extract all available fields from the API response
          const caseData: Partial<Case> = {
            case_number: normalizedCaseNumber,
            sr_number: advCase.srNumber || rawCase.sr_no || rawCase.srNumber || rawCase.sr_number || null,
            cnr: rawCase.cnr || rawCase.cnrNo || rawCase.cnrno || null,
            primary_petitioner: petName || 'Unknown',
            primary_respondent: resName || 'Unknown',
            petitioner_adv: rawCase.petAdvocate || rawCase.petitionerAdv || rawCase.petitioner_adv || null,
            respondent_adv: rawCase.resAdvocate || rawCase.respondentAdv || rawCase.respondent_adv || null,
            status: ['DISPOSED', 'DISMISSED', 'ALLOWED', 'GRANTED', 'ALLOWED-WITHDRAWN'].includes(statusStr) ? 'disposed' : 'pending',
            filing_date: filingDate,
            registration_date: regDate || filingDate,
            listing_date: listingDate,
            category: category,
            district: rawCase.district || null,
            purpose: rawCase.purpose || rawCase.stage || null,
            jud_name: rawCase.judges || rawCase.judgeName || rawCase.honbleJudges || null,
            created_by: user.id, // CRITICAL: Always set created_by from authenticated user
          };
          
          // Log the extracted data for debugging
          console.log('Extracted case data:', caseData);

          let existingCase: any = null;
          let checkError: any = null;

          // Check for duplicates based on case type using maybeSingle to avoid multi-row errors
          if (uniqueValue) {
            const column = isNumbered ? 'case_number' : 'sr_number';
            const result = await supabase
              .from('cases')
              .select('id')
              .eq(column, uniqueValue)
              .limit(1)
              .maybeSingle();
            existingCase = result.data;
            checkError = result.error;
          }

          if (checkError && checkError.code !== 'PGRST116' && checkError.code !== 'PGRST123') {
            // PGRST116 = no rows found, PGRST123 = multiple rows found (we just insert a new one)
            console.error('Error checking case:', checkError);
            failureCount++;
            failedCases.push(`${normalizedCaseNumber} (check error)`);
            continue;
          }

          // If we still don't have a uniqueness key for unnumbered (no sr_number), insert blindly
          if (!uniqueValue) {
            const { data: insertedCase, error: insertBlindError } = await supabase
              .from('cases')
              .insert([{
                ...caseData,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }])
              .select()
              .single();

            if (insertBlindError) {
              console.error('Error inserting case (no unique key):', insertBlindError);
              failureCount++;
              failedCases.push(`${normalizedCaseNumber} (insert error)`);
            } else {
              successCount++;
              
              // FIX: Create audit log for new case insertion with proper changed_by
              if (insertedCase?.id) {
                await auditLogsDB.create(
                  insertedCase.id,
                  'case_added',
                  '',
                  `Case added from Advocate Report for ${report.advName}`,
                  user.id // CRITICAL: Pass authenticated user ID for changed_by field
                );
              }
            }
            continue;
          }

          if (existingCase?.id) {
            // Update existing case
            const { data: updatedCase, error: updateError } = await supabase
              .from('cases')
              .update({
                ...caseData,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingCase.id)
              .select()
              .single();

            if (updateError) {
              console.error('Error updating case:', updateError);
              failureCount++;
              failedCases.push(`${normalizedCaseNumber} (update error)`);
            } else {
              updateCount++;
              
              // FIX: Create audit log for case update with proper changed_by
              if (updatedCase?.id) {
                await auditLogsDB.create(
                  updatedCase.id,
                  'case_updated',
                  'Existing case',
                  `Case updated from Advocate Report for ${report.advName}`,
                  user.id // CRITICAL: Pass authenticated user ID for changed_by field
                );
              }
            }
          } else {
            // Insert new case (numbered or unnumbered)
            const { data: insertedCase, error: insertError } = await supabase
              .from('cases')
              .insert([{
                ...caseData,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }])
              .select()
              .single();

            if (insertError) {
              console.error('Error inserting case:', insertError);
              failureCount++;
              failedCases.push(`${normalizedCaseNumber} (insert error: ${insertError.message})`);
            } else {
              successCount++;
              
              // FIX: Create audit log for new case insertion with proper changed_by
              if (insertedCase?.id) {
                try {
                  await auditLogsDB.create(
                    insertedCase.id,
                    'case_added',
                    '',
                    `Case added from Advocate Report for ${report.advName}`,
                    user.id // CRITICAL: Pass authenticated user ID for changed_by field
                  );
                } catch (auditError: any) {
                  // Log audit error but don't fail the case insertion
                  console.error(`Audit log creation failed for case ${insertedCase.id}:`, auditError);
                }
              }
            }
          }
        } catch (innerError: any) {
          // Catch individual case processing errors
          console.error(`Error processing case:`, innerError);
          failureCount++;
          failedCases.push(`${advCase.caseNumber || 'Unknown'} (${innerError.message})`);
        }
      }

      const message = `Added: ${successCount}, Updated: ${updateCount}, Failed: ${failureCount}`;
      toast.success(message);
      
      // Log failed cases for debugging
      if (failedCases.length > 0) {
        console.error('Failed cases:', failedCases);
      }
    } catch (error: any) {
      console.error('Bulk add operation error:', error);
      toast.error('Bulk add operation failed: ' + error?.message);
    } finally {
      setBulkAddLoading(false);
    }
  };

  const openInCaseLookup = (caseNumber: string) => {
    const parsed = parseCaseNumber(caseNumber);
    if (!parsed) {
      toast.error('Case number not valid for lookup');
      return;
    }
    navigate('/case-lookup', {
      state: {
        prefillCase: {
          mtype: parsed.mtype,
          mno: parsed.mno,
          myear: parsed.myear
        }
      }
    });
  };

  const caseDetails = report?.caseDetails || [];

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-6xl">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Advocate Report</h2>
            <p className="text-gray-600">Fetch all cases for an advocate by code and year.</p>
          </div>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Advocate Code"
              value={advCode}
              onChange={(e) => setAdvCode(e.target.value)}
              className="w-36 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="number"
              placeholder="Year"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-28 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={fetchReport}
              disabled={loading}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>{loading ? 'Loading...' : 'Fetch Report'}</span>
            </button>
          </div>
        </div>
      </div>

      {report && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-600 font-semibold">Advocate</p>
              <p className="text-lg font-bold text-gray-900">{report.advName}</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <p className="text-sm text-emerald-600 font-semibold">Total Cases</p>
              <p className="text-lg font-bold text-gray-900">{report.noOfCases}</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-600 font-semibold">Vakalaths</p>
              <p className="text-lg font-bold text-gray-900">{report.noOfVakalaths}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Case Details</h3>
              <div className="flex items-center gap-3">
                <p className="text-sm text-gray-600">Click a case number to open in Case Lookup.</p>
                <button
                  onClick={bulkAddAllCases}
                  disabled={bulkAddLoading}
                  className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {bulkAddLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  <span>{bulkAddLoading ? 'Adding Cases...' : 'Add All Cases'}</span>
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Case Number</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">SR Number</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Petitioner</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Respondent</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {caseDetails.map((c, idx) => {
                    const parsed = parseCaseNumber(c.caseNumber);
                    const canOpen = !!parsed;
                    const statusBadge = c.status === 'DISPOSED'
                      ? 'bg-green-100 text-green-800'
                      : c.status === 'PENDING'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800';
                    return (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          {canOpen ? (
                            <button
                              onClick={() => openInCaseLookup(c.caseNumber)}
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {c.caseNumber}
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          ) : (
                            <span className="text-gray-500">{c.caseNumber}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{c.srNumber}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{c.petName}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{c.resName}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusBadge}`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {canOpen ? (
                            <button
                              onClick={() => openInCaseLookup(c.caseNumber)}
                              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50"
                            >
                              Open
                            </button>
                          ) : (
                            <span className="text-gray-400 text-sm">Not numbered</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {caseDetails.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No cases found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
