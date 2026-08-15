import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, RefreshCw, ExternalLink, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase, Case } from '@/lib/supabase';
import { auditLogsDB } from '@/lib/database';
import { useAuth } from '@/contexts/AuthContext';
import { BACKEND_URL } from '@/lib/api';

interface AdvCase {
  caseNumber: string;
  srNumber: string;
  petName: string;
  resName: string;
  status: string;
  fullDetails?: any; // Full case details fetched from getCaseDetails API
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
    const parts = cleanStr.split(/[/-]/);
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
  const [fetchProgress, setFetchProgress] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = (user as any)?.id ?? (user as any)?.user_id ?? (user as any)?.uid ?? null;

  // Parse case number into mtype/mno/myear components
  // Handles formats: WP 12345/2025, WP12345/2025, WP(MD) 100/2025, WAMP 50/2025, etc.
  const parseCaseNumberForAPI = (caseNumber: string) => {
    const match = caseNumber.match(/^([A-Z][A-Z()]*?)\s*(\d+)\/(\d{4})$/i);
    if (!match) return null;
    return { mtype: match[1].toUpperCase(), mno: match[2], myear: match[3] };
  };

  const fetchReport = async () => {
    if (!advCode.trim()) {
      toast.error('Please enter advocate code');
      return;
    }
    setLoading(true);
    setFetchProgress('');
    setReport(null);
    try {
      // Use centralized BACKEND_URL from @/lib/api (works on web and Capacitor native)
      setFetchProgress('Fetching advocate report...');
      const url = `${BACKEND_URL}/getAdvReport?advcode=${encodeURIComponent(advCode.trim())}&year=${encodeURIComponent(year.trim())}`;
      const resp = await fetch(url);
      const contentType = resp.headers.get('content-type') || '';
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
      
      const advReport = data.advreport as AdvReport;
      console.log('Report Data Sample:', advReport.caseDetails?.[0]);

      // Show initial report immediately so user sees the case list
      setReport(advReport);

      // === STEP 2: Enrich all numbered cases with full details via batch endpoint ===
      const numberedCases = (advReport.caseDetails || [])
        .map((c: AdvCase) => {
          if (!c.caseNumber || c.caseNumber.toLowerCase() === 'not numbered') return null;
          const parsed = parseCaseNumberForAPI(c.caseNumber);
          if (!parsed) return null;
          return { ...parsed, key: c.caseNumber };
        })
        .filter(Boolean) as { mtype: string; mno: string; myear: string; key: string }[];

      if (numberedCases.length > 0) {
        setFetchProgress(`Fetching full details for ${numberedCases.length} cases...`);
        const enrichedMap: Record<string, any> = {};
        const BATCH_SIZE = 10;
        const CONCURRENT_BATCHES = 3; // PERF: fetch a few batches in parallel instead of one at a time

        const batches: (typeof numberedCases)[] = [];
        for (let i = 0; i < numberedCases.length; i += BATCH_SIZE) {
          batches.push(numberedCases.slice(i, i + BATCH_SIZE));
        }

        const fetchBatch = async (batch: typeof numberedCases) => {
          try {
            const batchResp = await fetch(`${BACKEND_URL}/getBatchCaseDetails`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ cases: batch }),
            });
            if (batchResp.ok) {
              const batchData = await batchResp.json();
              if (batchData.results) {
                Object.assign(enrichedMap, batchData.results);
              }
            }
          } catch (batchErr) {
            console.error('Batch fetch error', batchErr);
            // Continue with remaining batches even if one fails
          }
        };

        let done = 0;
        for (let i = 0; i < batches.length; i += CONCURRENT_BATCHES) {
          const group = batches.slice(i, i + CONCURRENT_BATCHES);
          await Promise.all(group.map(fetchBatch));
          done += group.reduce((sum, b) => sum + b.length, 0);
          setFetchProgress(`Fetching case details: ${Math.min(done, numberedCases.length)}/${numberedCases.length}...`);
        }

        // Merge full details back into each case
        const enrichedCaseDetails = advReport.caseDetails.map((c: AdvCase) => {
          const details = enrichedMap[c.caseNumber];
          return {
            ...c,
            fullDetails: (details && details.primary) ? details : null,
          };
        });

        const enrichedCount = enrichedCaseDetails.filter((c: AdvCase) => c.fullDetails).length;
        setReport({ ...advReport, caseDetails: enrichedCaseDetails });
        toast.success(`Report loaded: ${advReport.caseDetails.length} cases, ${enrichedCount} with full details`);
      } else {
        toast.success('Report loaded (no numbered cases to enrich)');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load report');
      setReport(null);
    } finally {
      setLoading(false);
      setFetchProgress('');
    }
  };

  const parseCaseNumber = (caseNumber: string) => {
    const match = caseNumber.match(/^([A-Z][A-Z()]*?)\s*(\d+)\/(\d{4})$/i);
    if (!match) return null;
    const [, mtype, mno, myear] = match;
    return {
      mtype: mtype.toUpperCase(),
      mno,
      myear
    };
  };

  // Helper to convert DD/MM/YYYY to YYYY-MM-DD
  const convertDateFormat = (dateStr: string): string | null => {
    if (!dateStr || dateStr === '-' || dateStr === 'null') return null;
    try {
      if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr.split('T')[0];
      const parts = dateStr.split(/[/-]/);
      if (parts.length === 3) {
        const [day, month, year] = parts;
        if (parseInt(day) > 31 || parseInt(month) > 12) return null;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      return null;
    } catch (e) {
      console.error('Date conversion error:', dateStr, e);
      return null;
    }
  };

  // Helper to fetch full case details for a numbered case (fallback if not pre-fetched)
  const fetchCaseDetails = async (caseNumber: string) => {
    try {
      // Use the same parser that handles WP(MD), WAMP, etc.
      const parsed = parseCaseNumberForAPI(caseNumber);
      if (!parsed) return null;

      const { mtype, mno, myear } = parsed;

      const url = `${BACKEND_URL}/getCaseDetails?mtype=${encodeURIComponent(mtype)}&mno=${encodeURIComponent(mno)}&myear=${encodeURIComponent(myear)}`;
      const resp = await fetch(url);
      const bodyText = await resp.text();
      const contentType = resp.headers.get('content-type') || '';

      if (!resp.ok) return null;
      const data = contentType.includes('application/json') ? JSON.parse(bodyText) : null;
      return data?.primary ? data : null;
    } catch (e) {
      console.error('Failed to fetch case details:', e);
      return null;
    }
  };

  // Transform case details like CaseLookup does
  const transformCaseDetails = (result: any) => {
    const transformedPetitioners = Array.isArray(result.petitioners)
      ? (result.petitioners || []).map((p: any, idx: number) => ({
          s_no: idx + 1,
          name: typeof p === 'string' ? p : (p.petName || p.name || ''),
          address: typeof p === 'string' ? '' : (p.petAddress || p.address || '')
        }))
      : [];

    const transformedRespondents = Array.isArray(result.respondents)
      ? (result.respondents || []).map((r: any, idx: number) => ({
          r_no: idx + 1,
          name: typeof r === 'string' ? r : (r.resName || r.name || ''),
          address: typeof r === 'string' ? '' : (r.resAddress || r.address || '')
        }))
      : [];

    const transformedIADetails = Array.isArray(result.ia)
      ? (result.ia || []).map((ia: any) => ({
          number: ia.iaNumber || '',
          filing_date: convertDateFormat(ia.filingDate) || '',
          advocate_name: ia.advName || '',
          paper_type: ia.miscPaperType || '',
          status: ia.status || '',
          prayer: ia.prayer || '',
          order_date: convertDateFormat(ia.orderDate) || '',
          order: ia.order || '',
          file_url: ia.fileURL || ''
        }))
      : [];

    const transformedIASRDetails = Array.isArray(result.iasr)
      ? (result.iasr || []).map((ia: any) => ({
          ia_sr_no: ia.iasrNo || '',
          paper_cd: ia.paperCd || '',
          filing_date: convertDateFormat(ia.dateOfFiling) || '',
          current_flag: ia.currentFlag || '',
          adv_code: ia.advCode || '',
          paper_type: ia.paperType || '',
          adv_name: ia.advName || ''
        }))
      : [];

    const transformedUSRDetails = Array.isArray(result.usr)
      ? (result.usr || []).map((usr: any) => ({
          number: usr.usrNumber || '',
          advocate_name: usr.advName || '',
          usr_type: usr.usrType || '',
          filing_date: convertDateFormat(usr.usrDate) || '',
          remarks: usr.remarks || ''
        }))
      : [];

    const transformedUSRSRDetails = Array.isArray(result.usrsr)
      ? (result.usrsr || []).map((usr: any, idx: number) => ({
          submission_number: idx + 1,
          submission_date: convertDateFormat(usr.usrsrDt) || '',
          submitted_by: usr.advName || '',
          filing_date: '',
          due_date: '',
          resubmission_date: '',
          return_date: '',
          return_taken_by: '',
          changes_made: '',
          changes_requested: usr.remarks || '',
          changes_requested_by: usr.advCd ? String(usr.advCd) : '',
          notes: usr.docName ? `USR SR ${usr.usrSrNum}: ${usr.docName}` : (usr.usrSrNum || '')
        }))
      : [];

    const transformedOrders = Array.isArray(result.orderdetails)
      ? (result.orderdetails || []).map((ord: any) => {
          const orderFile = ord.orderDetails ? `https://csis.tshc.gov.in/hcorders/${ord.orderDetails}` : '';
          return {
            order_on: ord.orderOn || '',
            judge_name: ord.judge || '',
            date: convertDateFormat(ord.dateOfOrders) || '',
            type: ord.orderType || '',
            details: orderFile || ord.orderDetails || '',
            file: orderFile
          };
        })
      : [];

    const transformedConnected = Array.isArray(result.connected)
      ? (result.connected || []).map((c: any) => {
          if (!c) return { case_number: '' };
          if (typeof c === 'string') return { case_number: c };
          if (typeof c === 'number') return { case_number: String(c) };
          // Normalize all possible field names for case number
          return {
            case_number: c.case_number || c.connectedCaseno || c.connected_case_no || c.caseNumber || c.mainno || String(c) || ''
          };
        })
      : [];

    const transformedLowerCourt = Array.isArray(result.lowerCourt)
      ? (result.lowerCourt || []).map((lc: any) => ({
          court_name: lc.courtName || lc.court || '',
          district: lc.district || '',
          case_no: lc.caseNumber || lc.caseNo || '',
          judge: lc.judgeName || lc.judge || '',
          judgement_date: convertDateFormat(lc.judgementDate || lc.dateOfJudgement) || ''
        }))
      : [];

    if (result.trail) {
      transformedLowerCourt.push({
        court_name: result.trail.courtName || '',
        district: result.trail.district || '',
        case_no: result.trail.trialCourtCaseNumber || '',
        judge: result.trail.judge || '',
        judgement_date: convertDateFormat(result.trail.judgmentDate) || ''
      });
    }

    const rawVakalath = result.vakalath || result.vakalathParams || [];
    const transformedVakalath = Array.isArray(rawVakalath)
      ? rawVakalath.map((v: any) => ({
          advocate_code: v.advCode || '',
          advocate_name: v.advName || '',
          pr_no: v.prNo || '',
          remarks: v.remarks || '',
          file: v.link ? `https://csis.tshc.gov.in/${v.link}` : ''
        }))
      : [];

    const transformedCaseHistory = Array.isArray(result.casehistory) ? result.casehistory : [];

    return {
      transformedPetitioners,
      transformedRespondents,
      transformedIADetails,
      transformedIASRDetails,
      transformedUSRDetails,
      transformedUSRSRDetails,
      transformedOrders,
      transformedConnectedMatters: transformedConnected,
      transformedLowerCourt,
      transformedVakalath,
      transformedCaseHistory
    };
  };

  const buildCaseDataFromDetails = (result: any, transformed: any) => {
    return {
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
      // hearing_date = next scheduled hearing (same source as listing_date for HC cases)
      hearing_date: convertDateFormat(result.primary?.listingdate || result.primary?.hearingdate),
      // mention_date = last return/mention date
      mention_date: convertDateFormat(result.primary?.returndate || result.primary?.mentiondate),
      disp_date: convertDateFormat(result.primary?.disposaldate),
      disp_type: result.primary?.disposaltype && result.primary.disposaltype !== '-' ? result.primary.disposaltype : null,
      purpose: result.primary?.purpose || '',
      jud_name: result.primary?.judges || '',
      status: (result.primary?.casestatus === 'PENDING' ? 'pending' :
              result.primary?.casestatus === 'DISPOSED' ? 'disposed' : 'pending') as 'pending' | 'filed' | 'disposed' | 'closed',
      petitioners: transformed.transformedPetitioners || [],
      respondents: transformed.transformedRespondents || [],
      ia_details: transformed.transformedIADetails || [],
      ia_sr_details: transformed.transformedIASRDetails || [],
      usr_details: transformed.transformedUSRDetails || [],
      submission_dates: transformed.transformedUSRSRDetails || [],
      orders: transformed.transformedOrders || [],
      connected_matters: transformed.transformedConnectedMatters || [],
      lower_court_details: transformed.transformedLowerCourt || [],
      vakalath: transformed.transformedVakalath || [],
      other_documents: transformed.transformedCaseHistory || [],
      prayer: result.prayer?.prayer || ''
    };
  };

  const bulkAddAllCases = async () => {
    if (!report?.caseDetails?.length) { toast.error('No cases to add'); return; }
    if (!userId) { toast.error('Please login to add cases'); return; }

    setBulkAddLoading(true);
    const allAuditEntries: Parameters<typeof auditLogsDB.createMany>[0] = [];

    try {
      // STEP 1: Pre-fetch existing records in 2 bulk queries (no per-case round-trips)
      setFetchProgress('Checking existing cases…');
      const caseNumbers = [...new Set(
        report.caseDetails.map(c => c.caseNumber).filter(v => !!v && v.toLowerCase() !== 'not numbered')
      )];
      const srNumbers = [...new Set(report.caseDetails.map(c => c.srNumber).filter(Boolean))];

      const [cnRes, srRes] = await Promise.all([
        caseNumbers.length ? supabase.from('cases').select('*').in('case_number', caseNumbers) : null,
        srNumbers.length  ? supabase.from('cases').select('*').in('sr_number',   srNumbers)   : null,
      ]);

      const existingByCN = new Map<string, any>();
      const existingBySR = new Map<string, any>();
      (cnRes?.data || []).forEach((c: any) => c.case_number && existingByCN.set(c.case_number, c));
      (srRes?.data  || []).forEach((c: any) => c.sr_number   && existingBySR.set(c.sr_number,  c));

      // STEP 2: Build all payloads — use pre-enriched data, NO per-case fetches
      setFetchProgress('Building case payloads…');
      const now = new Date().toISOString();
      const newRows:    any[] = [];
      const updateJobs: (() => Promise<{ id: string; changes: any[] } | null>)[] = [];
      let skipped = 0;

      for (const advCase of report.caseDetails) {
        const rawCase = advCase as any;
        const isNumbered = !!(advCase.caseNumber && advCase.caseNumber.toLowerCase() !== 'not numbered');
        const normalizedCN = isNumbered
          ? advCase.caseNumber
          : advCase.srNumber ? ('Not Numbered - ' + advCase.srNumber) : 'Not Numbered - Auto';

        const petName = advCase.petName || rawCase.pname || rawCase.petitioner || '';
        const resName = advCase.resName || rawCase.rname || rawCase.respondent || '';
        if (!petName && !resName) { skipped++; continue; }

        // Use pre-enriched fullDetails — never fetch individually during bulk add
        const fullDetails: any = rawCase.fullDetails || null;
        const transformed: any = fullDetails ? transformCaseDetails(fullDetails) : {};

        const statusStr = (advCase.status || '').toUpperCase();
        const caseStatus: 'pending' | 'disposed' =
          ['DISPOSED', 'DISMISSED', 'ALLOWED', 'GRANTED', 'ALLOWED-WITHDRAWN'].includes(statusStr)
            ? 'disposed' : 'pending';

        let caseData: any = {
          case_number:         normalizedCN,
          sr_number:           advCase.srNumber || null,
          cnr:                 rawCase.cnr || rawCase.cnrNo || null,
          primary_petitioner:  petName || 'Unknown',
          primary_respondent:  resName || 'Unknown',
          petitioner_adv:      rawCase.petAdvocate || rawCase.petitioner_adv || null,
          respondent_adv:      rawCase.resAdvocate || rawCase.respondent_adv || null,
          status:              caseStatus,
          filing_date:         parseIndianDate(rawCase.filingDate || rawCase.filing_date),
          registration_date:   parseIndianDate(rawCase.registrationDate || rawCase.regDate),
          listing_date:        parseIndianDate(rawCase.listingDate || rawCase.nextHearingDate),
          hearing_date:        parseIndianDate(rawCase.listingDate || rawCase.nextHearingDate || rawCase.hearingDate || rawCase.hearing_date),
          mention_date:        parseIndianDate(rawCase.returnDate || rawCase.mentionDate || rawCase.mention_date || rawCase.return_date),
          category:            rawCase.category || (isNumbered ? (normalizedCN.match(/^([A-Z]+)/i)?.[1]?.toUpperCase() || null) : null),
          district:            rawCase.district || null,
          purpose:             rawCase.purpose || rawCase.stage || null,
          jud_name:            rawCase.judges || rawCase.judgeName || null,
          petitioners:         transformed.transformedPetitioners || (petName ? [{ s_no: 1, name: petName }] : []),
          respondents:         transformed.transformedRespondents || (resName ? [{ r_no: 1, name: resName }] : []),
          ia_details:          transformed.transformedIADetails    || [],
          ia_sr_details:       transformed.transformedIASRDetails  || [],
          usr_details:         transformed.transformedUSRDetails   || [],
          submission_dates:    transformed.transformedUSRSRDetails || [],
          orders:              transformed.transformedOrders       || [],
          connected_matters:   transformed.transformedConnectedMatters || [],
          vakalath:            transformed.transformedVakalath     || [],
          lower_court_details: transformed.transformedLowerCourt  || [],
          other_documents:     transformed.transformedCaseHistory  || [],
          prayer:              rawCase.prayer || fullDetails?.prayer?.prayer || null,
          created_by:          userId,
        };

        if (fullDetails) {
          const fd = buildCaseDataFromDetails(fullDetails, transformed);
          caseData = { ...caseData, ...fd, case_number: fd.case_number || normalizedCN, created_by: userId };
          if (!caseData.petitioners?.length && caseData.primary_petitioner)
            caseData.petitioners = [{ s_no: 1, name: caseData.primary_petitioner }];
          if (!caseData.respondents?.length && caseData.primary_respondent)
            caseData.respondents = [{ r_no: 1, name: caseData.primary_respondent }];
        }

        const uniqueKey = isNumbered ? advCase.caseNumber : advCase.srNumber;
        const existing  = uniqueKey
          ? (isNumbered ? existingByCN.get(uniqueKey) : existingBySR.get(uniqueKey)) || null
          : null;

        if (!uniqueKey || !existing) {
          newRows.push({ ...caseData, created_at: now, updated_at: now });
        } else {
          // Capture by value to avoid closure over loop variable
          const snapExisting = existing;
          const snapData     = caseData;
          updateJobs.push(async () => {
            const scalarFields = [
              'sr_number','cnr','primary_petitioner','primary_respondent',
              'petitioner_adv','respondent_adv','status','filing_date',
              'registration_date','listing_date','hearing_date','mention_date',
              'category','district','purpose','jud_name',
            ];
            const arrFields = [
              'petitioners','respondents','ia_details','ia_sr_details','usr_details',
              'submission_dates','orders','connected_matters','vakalath',
              'other_documents','lower_court_details',
            ];
            const patch:   any = {};
            const changes: any[] = [];
            for (const f of scalarFields) {
              const ov = snapExisting[f]; const nv = snapData[f];
              if (nv && (ov === null || ov === undefined || ov === '' || ov !== nv))
                { patch[f] = nv; changes.push({ field: f, oldValue: ov ?? '(empty)', newValue: nv }); }
            }
            for (const f of arrFields) {
              const oa = snapExisting[f]; const na = snapData[f];
              if (Array.isArray(na) && na.length > 0 && (!Array.isArray(oa) || oa.length === 0))
                { patch[f] = na; changes.push({ field: f, oldValue: '(empty)', newValue: na.length + ' items' }); }
            }
            if (!snapExisting.prayer && snapData.prayer)
              { patch.prayer = snapData.prayer; changes.push({ field: 'prayer', oldValue: '(empty)', newValue: 'added' }); }
            if (!Object.keys(patch).length) return null;
            const { data: updated, error } = await supabase
              .from('cases').update({ ...patch, updated_at: now }).eq('id', snapExisting.id).select('id').single();
            if (error) { console.error('Update error:', error); return null; }
            return { id: updated.id, changes };
          });
        }
      }

      // STEP 3: Batch INSERT all new rows (100 per call instead of 1 per case)
      setFetchProgress('Inserting ' + newRows.length + ' new cases…');
      let insertedCount = 0;
      for (let i = 0; i < newRows.length; i += 100) {
        const { data: inserted, error } = await supabase
          .from('cases').insert(newRows.slice(i, i + 100)).select('id');
        if (error) { console.error('Batch insert error:', error); }
        else {
          insertedCount += inserted?.length || 0;
          (inserted || []).forEach((r: any) => allAuditEntries.push({
            caseId: r.id, field: 'case_added',
            oldValue: '', newValue: 'Added from Advocate Report – ' + report.advName, userId,
          }));
        }
      }

      // STEP 4: Run all updates fully in parallel
      setFetchProgress('Updating ' + updateJobs.length + ' existing cases…');
      const updateResults = await Promise.all(updateJobs.map(fn => fn()));
      let updatedCount = 0;
      for (const res of updateResults) {
        if (!res) continue;
        updatedCount++;
        res.changes.forEach(ch => allAuditEntries.push({
          caseId: res.id, field: ch.field, oldValue: ch.oldValue, newValue: ch.newValue, userId,
        }));
      }

      // STEP 5: Single batch audit write (was one write per field per case)
      if (allAuditEntries.length > 0)
        await auditLogsDB.createMany(allAuditEntries).catch(e => console.error('Audit batch failed (non-fatal):', e));

      toast.success('Done — Added: ' + insertedCount + ', Updated: ' + updatedCount + ', Skipped: ' + skipped);
    } catch (err: any) {
      console.error('Bulk add error:', err);
      toast.error('Bulk add failed: ' + err?.message);
    } finally {
      setBulkAddLoading(false);
      setFetchProgress('');
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
    <div className="container mx-auto py-4 sm:py-6 px-3 sm:px-4 space-y-6 max-w-6xl">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Advocate Report</h2>
            <p className="text-gray-600">Fetch all cases for an advocate by code and year.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Advocate Code"
              value={advCode}
              onChange={(e) => setAdvCode(e.target.value)}
              className="w-full sm:w-36 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="number"
              placeholder="Year"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full sm:w-28 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={fetchReport}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 w-full sm:w-auto"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>{loading ? 'Loading...' : 'Fetch Report'}</span>
            </button>
          </div>
        </div>
        {/* Progress bar for case detail enrichment */}
        {fetchProgress && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
              <span className="text-sm font-medium text-blue-700">{fetchProgress}</span>
            </div>
          </div>
        )}
      </div>

      {report && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
          <div className="bg-gray-50 px-4 sm:px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">Case Details</h3>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
                <p className="hidden sm:block text-sm text-gray-600">Click a case number to open in Case Lookup.</p>
                <button
                  onClick={bulkAddAllCases}
                  disabled={bulkAddLoading}
                  className="inline-flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
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
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Case Number</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">SR Number</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Petitioner</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Respondent</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Action</th>
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
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm">
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
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-700">{c.srNumber}</td>
                        <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm text-gray-900">{c.petName}</td>
                        <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm text-gray-900">{c.resName}</td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusBadge}`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
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
                      <td colSpan={6} className="px-3 sm:px-6 py-8 text-center text-gray-500">No cases found</td>
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
