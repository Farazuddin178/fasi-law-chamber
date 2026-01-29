/**
 * Case Service - Unified API for fetching case details from High Court and Supreme Court
 * Integrates with multiple sources: ECI API, Direct Scraper API, and backup sources
 */

import { supabase } from './supabase';

export interface CaseDetail {
  case_title: string;
  case_number: string;
  filing_number?: string;
  cnr?: string;
  case_status: string;
  next_hearing_date?: string;
  stage?: string;
  section?: string;
  act?: string;
  court_number?: string;
  item_number?: string;
  petitioner_name?: string;
  respondent_name?: string;
  petitioner_advocate?: string;
  respondent_advocate?: string;
  judge_name?: string;
  listings?: Array<{
    date: string;
    type: string;
    court?: string;
    item?: string;
    stage?: string;
    link?: string;
  }>;
  orders?: Array<{
    date: string;
    description: string;
    link?: string;
  }>;
  ia_details?: Array<{
    ia_number: string;
    filing_date?: string;
    status?: string;
    description?: string;
  }>;
  history?: Array<{
    date: string;
    event: string;
  }>;
  court_name?: string;
  court_website?: string | null;
  source?: string;
}

export interface FetchCaseOptions {
  court_code: string;
  court_name: string;
  case_number: string;
  case_year: number;
  case_type: string;
  useBackendAPI?: boolean;
  timeout?: number;
}

/**
 * Main function to fetch case details from High Court or Supreme Court
 * Tries multiple sources in order of preference
 */
export async function fetchCaseDetails(options: FetchCaseOptions): Promise<CaseDetail> {
  const {
    court_code,
    court_name,
    case_number,
    case_year,
    case_type,
    useBackendAPI = true, // Changed to true by default for realtime API
    timeout = 30000,
  } = options;

  // Validate inputs
  if (!case_number || !case_year || !case_type) {
    throw new Error('Case number, year, and type are required');
  }

  // Normalize case number (remove extra spaces/special chars)
  const normalizedCaseNumber = case_number.trim().toUpperCase();
  const normalizedCaseType = case_type.trim().toUpperCase();

  try {
    // Method 1: REALTIME Backend API (NO CAPTCHA, supports 2026 cases)
    console.log('[CaseService] Attempting Realtime API fetch...');
    const caseDetails = await fetchViaRealtimeAPI({
      court_code,
      court_name,
      case_number: normalizedCaseNumber,
      case_year,
      case_type: normalizedCaseType,
    });

    if (caseDetails) {
      console.log('[CaseService] ✓ Realtime API successful');
      return caseDetails;
    }
  } catch (error) {
    console.warn('[CaseService] Realtime API failed:', error);
  }

  // Method 2: ECI API directly (public, no authentication needed)
  try {
    console.log('[CaseService] Attempting ECI API fetch...');
    const caseDetails = await fetchViaECIAPI({
      court_code,
      court_name,
      case_number: normalizedCaseNumber,
      case_year,
      case_type: normalizedCaseType,
    });

    if (caseDetails) {
      console.log('[CaseService] ✓ ECI API successful');
      return caseDetails;
    }
  } catch (error) {
    console.warn('[CaseService] ECI API failed:', error);
  }

  // Method 3: Supabase Edge Function (fallback)
  try {
    console.log('[CaseService] Attempting Edge Function fetch...');
    const caseDetails = await fetchViaEdgeFunction({
      court_code,
      court_name,
      case_number: normalizedCaseNumber,
      case_year,
      case_type: normalizedCaseType,
    });

    if (caseDetails) {
      console.log('[CaseService] ✓ Edge Function successful');
      return caseDetails;
    }
  } catch (error) {
    console.warn('[CaseService] Edge Function failed:', error);
  }

  // If all sources fail, return structured empty response with user guidance
  console.warn('[CaseService] All fetch methods failed');
  return createEmptyCaseTemplate({
    court_name,
    case_number: normalizedCaseNumber,
    case_year,
    case_type: normalizedCaseType,
  });
}

/**
 * Fetch case details via Supabase Edge Function
 * Most secure and maintainable approach
 */
async function fetchViaEdgeFunction(options: {
  court_code: string;
  court_name: string;
  case_number: string;
  case_year: number;
  case_type: string;
}): Promise<CaseDetail | null> {
  try {
    const { data, error } = await supabase.functions.invoke('fetch-case-metadata', {
      body: {
        court_code: options.court_code,
        court_name: options.court_name,
        case_number: options.case_number,
        case_year: options.case_year,
        case_type: options.case_type,
      },
    });

    if (error) {
      console.error('Edge Function error:', error);
      return null;
    }

    if (data?.error) {
      console.error('Data error:', data.message || data.error);
      return null;
    }

    return data || null;
  } catch (err) {
    console.error('Exception in Edge Function:', err);
    return null;
  }
}

/**
 * REALTIME API Fetch - NO CAPTCHA required
 * Uses multiple public APIs to fetch current case data
 */
async function fetchViaRealtimeAPI(options: {
  court_code: string;
  court_name: string;
  case_number: string;
  case_year: number;
  case_type: string;
}): Promise<CaseDetail | null> {
  try {
    // Determine backend URL
    const backendURL = process.env.REACT_APP_BACKEND_URL ||
                      process.env.VITE_BACKEND_URL ||
                      'http://localhost:5000';

    const endpoint = `${backendURL}/api/case/fetch-realtime`;

    console.log(`[CaseService] Calling realtime API: ${endpoint}`);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        court_code: options.court_code,
        court_name: options.court_name,
        case_number: options.case_number,
        case_year: options.case_year,
        case_type: options.case_type,
      }),
    });

    if (!response.ok) {
      console.error(`Realtime API error: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (!data.success || !data.case_data) {
      console.error('Realtime API returned no data:', data.error);
      return null;
    }

    // Transform to CaseDetail format
    const caseData = data.case_data;
    
    return {
      case_title: caseData.case_title || `${options.case_type} ${options.case_number}/${options.case_year}`,
      case_number: caseData.case_number || `${options.case_type} ${options.case_number}/${options.case_year}`,
      filing_number: caseData.filing_number,
      cnr: caseData.cnr,
      case_status: caseData.case_status || 'Available',
      next_hearing_date: caseData.next_hearing_date,
      stage: caseData.stage,
      section: caseData.section,
      act: caseData.act,
      court_number: caseData.court_number,
      item_number: caseData.item_number,
      petitioner_name: caseData.petitioner_name,
      respondent_name: caseData.respondent_name,
      petitioner_advocate: caseData.petitioner_advocate,
      respondent_advocate: caseData.respondent_advocate,
      judge_name: caseData.judges || caseData.judge_name,
      listings: caseData.listings,
      orders: caseData.orders,
      ia_details: caseData.ia_details,
      history: caseData.history,
      court_name: options.court_name,
      court_website: null,
      source: data.data_source || 'Realtime API',
    };
  } catch (error) {
    console.error('[CaseService] Realtime API error:', error);
    return null;
  }
}

/**
 * Fetch case details via Backend API
 * Direct connection to Python scraper services
 */
async function fetchViaBackendAPI(options: {
  court_code: string;
  court_name: string;
  case_number: string;
  case_year: number;
  case_type: string;
}): Promise<CaseDetail | null> {
  try {
    // Determine backend URL
    const backendURL = process.env.REACT_APP_BACKEND_URL ||
                      process.env.VITE_BACKEND_URL ||
                      'http://localhost:5000';

    // Map court_code to court type (high court vs supreme court)
    const isSupremeCourt = options.court_code === 'supreme_court' || 
                          options.court_name?.toLowerCase().includes('supreme');
    
    const endpoint = isSupremeCourt 
      ? `${backendURL}/api/supreme-court/search`
      : `${backendURL}/api/high-court/search`;

    console.log(`[CaseService] Calling backend: ${endpoint}`);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        court_code: options.court_code,
        court_name: options.court_name,
        case_number: options.case_number,
        year: options.case_year,
        case_type: options.case_type,
      }),
    });

    if (!response.ok) {
      console.error(`Backend API error: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data.error) {
      console.error('Backend returned error:', data.message || data.error);
      return null;
    }

    // Handle both direct case data and session-based flow
    if (data.session_id) {
      // CAPTCHA required - would need interactive flow
      console.warn('[CaseService] CAPTCHA required - implement interactive flow');
      return null;
    }

    return data.case_data || data || null;
  } catch (err) {
    console.error('Exception in Backend API:', err);
    return null;
  }
}

/**
 * Fetch case details via public ECI API
 * Backup method using third-party public API
 */
async function fetchViaECIAPI(options: {
  court_code: string;
  court_name: string;
  case_number: string;
  case_year: number;
  case_type: string;
}): Promise<CaseDetail | null> {
  try {
    // Court ID mapping for ECI API
    const courtIdMap: Record<string, string> = {
      'supreme_court': '1',
      'telangana_hc': '33',
      'delhi_hc': '3',
      'bombay_hc': '2',
      'madras_hc': '4',
      'karnataka_hc': '5',
      'allahabad_hc': '6',
      'calcutta_hc': '7',
      'patna_hc': '8',
      'gujarat_hc': '9',
      'punjab_haryana_hc': '10',
      'rajasthan_hc': '11',
      'madhya_pradesh_hc': '12',
      'kerala_hc': '13',
      'andhra_pradesh_hc': '14',
      'orissa_hc': '15',
      'chhattisgarh_hc': '16',
      'jharkhand_hc': '17',
      'uttarakhand_hc': '18',
      'himachal_pradesh_hc': '19',
      'jammu_kashmir_hc': '20',
      'gauhati_hc': '21',
      'manipur_hc': '22',
      'meghalaya_hc': '23',
      'sikkim_hc': '24',
      'tripura_hc': '25',
    };

    const courtId = courtIdMap[options.court_code.toLowerCase()] || '17';
    const apiUrl = `https://apis.akshit.net/eciapi/${courtId}/high-court/case?case_number=${options.case_number}&case_year=${options.case_year}`;

    console.log(`[CaseService] Calling ECI API: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      console.error(`ECI API error: ${response.status}`);
      return null;
    }

    const data = await response.json();

    // Transform ECI API response to our format
    return {
      case_title: data.case_title || `${options.case_type} ${options.case_number}/${options.case_year}`,
      case_number: data.case_number || `${options.case_type} ${options.case_number}/${options.case_year}`,
      filing_number: data.filing_number || null,
      cnr: data.cnr || null,
      case_status: data.case_status || 'Unknown',
      next_hearing_date: data.next_hearing_date || null,
      stage: data.stage || null,
      section: data.section || null,
      act: data.act || null,
      court_number: data.court_number || null,
      item_number: data.item_number || null,
      petitioner_name: data.petitioner_name || null,
      respondent_name: data.respondent_name || null,
      petitioner_advocate: data.petitioner_advocate || null,
      respondent_advocate: data.respondent_advocate || null,
      judge_name: data.judge_name || null,
      listings: data.listings || [],
      orders: data.orders || [],
      ia_details: data.ia_details || [],
      history: data.history || [],
      court_name: options.court_name,
      court_website: null,
      source: 'ECI API',
    };
  } catch (err) {
    console.error('Exception in ECI API:', err);
    return null;
  }
}

/**
 * Create an empty case template when all sources fail
 * Guides user on how to find the information manually
 */
function createEmptyCaseTemplate(options: {
  court_name: string;
  case_number: string;
  case_year: number;
  case_type: string;
}): CaseDetail {
  return {
    case_title: `${options.case_type} ${options.case_number}/${options.case_year}`,
    case_number: `${options.case_type} ${options.case_number}/${options.case_year}`,
    case_status: 'Manual Entry Required',
    court_name: options.court_name,
    court_website: getCourtWebsite(options.court_name),
    source: 'Manual Entry',
    listings: [],
    orders: [],
    ia_details: [],
    history: [],
  };
}

/**
 * Get court website based on court name
 */
function getCourtWebsite(courtName: string): string | null {
  const courtWebsites: Record<string, string> = {
    'supreme court': 'https://www.supremecourt.gov.in',
    'delhi high court': 'https://delhihighcourt.nic.in',
    'bombay high court': 'https://www.bombayhighcourt.nic.in',
    'madras high court': 'https://www.madashighcourt.nic.in',
    'karnataka high court': 'https://www.karnatakaHighcourt.nic.in',
    'allahabad high court': 'https://www.allahabadhighcourt.in',
    'calcutta high court': 'https://www.calcuttahighcourt.nic.in',
    'patna high court': 'https://www.patnhighcourt.nic.in',
    'gujarat high court': 'https://www.gujarathighcourt.nic.in',
    'punjab haryana high court': 'https://www.phcindore.nic.in',
    'rajasthan high court': 'https://www.rajasthanhighcourt.nic.in',
    'madhya pradesh high court': 'https://www.mpindore.nic.in',
    'kerala high court': 'https://www.keralaHighcourt.nic.in',
    'andhra pradesh high court': 'https://www.apHighcourt.nic.in',
    'telangana high court': 'https://www.telanganaHighcourt.nic.in',
    'orissa high court': 'https://www.orrissahighcourt.nic.in',
    'chhattisgarh high court': 'https://www.chhattisgarhhighcourt.nic.in',
    'jharkhand high court': 'https://www.jharkhandhighcourt.nic.in',
    'uttarakhand high court': 'https://www.uttarakhandhighcourt.nic.in',
    'himachal pradesh high court': 'https://www.hphighcourt.nic.in',
    'jammu kashmir high court': 'https://www.jkhighcourt.nic.in',
    'gauhati high court': 'https://www.gauhatiHighcourt.nic.in',
  };

  const normalizedName = courtName.toLowerCase();
  for (const [key, value] of Object.entries(courtWebsites)) {
    if (normalizedName.includes(key)) {
      return value;
    }
  }

  return null;
}

/**
 * Fetch multiple cases in parallel
 * Useful for bulk searches
 */
export async function fetchMultipleCases(
  cases: Array<FetchCaseOptions>,
  concurrencyLimit: number = 3
): Promise<(CaseDetail | Error)[]> {
  const results: (CaseDetail | Error)[] = [];
  
  // Process cases with concurrency limit
  for (let i = 0; i < cases.length; i += concurrencyLimit) {
    const batch = cases.slice(i, i + concurrencyLimit);
    const batchPromises = batch.map((caseOptions) =>
      fetchCaseDetails(caseOptions).catch((err) => err)
    );
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  return results;
}

/**
 * Filter cases by status
 */
export function filterCasesByStatus(
  cases: CaseDetail[],
  status: 'pending' | 'disposed' | 'all'
): CaseDetail[] {
  if (status === 'all') return cases;

  return cases.filter((c) => {
    const caseStatus = c.case_status?.toLowerCase() || '';
    if (status === 'pending') {
      return !caseStatus.includes('disposed') && 
             !caseStatus.includes('withdrawn') &&
             !caseStatus.includes('dismissed');
    }
    if (status === 'disposed') {
      return caseStatus.includes('disposed') ||
             caseStatus.includes('withdrawn') ||
             caseStatus.includes('dismissed');
    }
    return true;
  });
}

/**
 * Sort cases by date
 */
export function sortCasesByDate(
  cases: CaseDetail[],
  order: 'asc' | 'desc' = 'desc'
): CaseDetail[] {
  return [...cases].sort((a, b) => {
    const dateA = new Date(a.next_hearing_date || 0).getTime();
    const dateB = new Date(b.next_hearing_date || 0).getTime();
    return order === 'desc' ? dateB - dateA : dateA - dateB;
  });
}

/**
 * Export case details to JSON
 */
export function exportCaseToJSON(caseDetail: CaseDetail): string {
  return JSON.stringify(caseDetail, null, 2);
}

/**
 * Export case details to CSV
 */
export function exportCaseToCSV(caseDetail: CaseDetail): string {
  const headers = [
    'Case Title',
    'Case Number',
    'Filing Number',
    'CNR',
    'Status',
    'Next Hearing',
    'Stage',
    'Section',
    'Act',
    'Petitioner',
    'Respondent',
    'Judge',
    'Court',
  ];

  const values = [
    caseDetail.case_title,
    caseDetail.case_number,
    caseDetail.filing_number || '',
    caseDetail.cnr || '',
    caseDetail.case_status,
    caseDetail.next_hearing_date || '',
    caseDetail.stage || '',
    caseDetail.section || '',
    caseDetail.act || '',
    caseDetail.petitioner_name || '',
    caseDetail.respondent_name || '',
    caseDetail.judge_name || '',
    caseDetail.court_name || '',
  ];

  return [headers, values].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
}
