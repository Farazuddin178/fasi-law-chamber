// Supabase Edge Function - Updated with Python API Integration
// Calls the Python court scraper backend for real case data

// @ts-ignore - Deno imports
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const body = await req.json();
    const { court_code, case_number, case_year, case_type, court_name } = body || {};

    if (!court_code || !case_number || !case_year || !case_type) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: court_code, case_number, case_year, case_type',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Try calling Python backend API first
    try {
      console.log(`[INFO] Attempting to call Python backend for case: ${case_type} ${case_number}/${case_year}`);
      
      // Map court codes to Python API court codes
      const courtCodeMap: Record<string, string> = {
        'telangana_hc': 'TELANGANA',
        'supreme_court': 'SUPREME',
        'delhi_hc': 'DELHI',
        'bombay_hc': 'BOMBAY',
        'madras_hc': 'MADRAS',
        'karnataka_hc': 'KARNATAKA',
        'allahabad_hc': 'ALLAHABAD',
        'calcutta_hc': 'CALCUTTA',
        'patna_hc': 'PATNA',
        'gujarat_hc': 'GUJARAT',
        'punjab_haryana_hc': 'PUNJAB_HARYANA',
        'rajasthan_hc': 'RAJASTHAN',
        'madhya_pradesh_hc': 'MADHYA_PRADESH',
        'kerala_hc': 'KERALA',
        'andhra_pradesh_hc': 'ANDHRA_PRADESH',
        'orissa_hc': 'ORISSA',
        'chhattisgarh_hc': 'CHHATTISGARH',
        'jharkhand_hc': 'JHARKHAND',
        'uttarakhand_hc': 'UTTARAKHAND',
        'himachal_pradesh_hc': 'HIMACHAL_PRADESH',
        'jammu_kashmir_hc': 'JAMMU_KASHMIR',
        'gauhati_hc': 'GAUHATI',
        'manipur_hc': 'MANIPUR',
        'meghalaya_hc': 'MEGHALAYA',
        'sikkim_hc': 'SIKKIM',
        'tripura_hc': 'TRIPURA',
      };

      const pythonCourtCode = courtCodeMap[court_code] || 'TELANGANA';
      
      // Call Python backend
      // NOTE: Replace 'localhost:5000' with your actual Python API URL
      const pythonApiUrl = `http://localhost:5000/api/high-court/search`;
      
      console.log(`[INFO] Calling Python API: ${pythonApiUrl}`);
      
      const pythonResponse = await fetch(pythonApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Supabase-EdgeFunction/1.0',
        },
        body: JSON.stringify({
          court_name: pythonCourtCode,
          case_type: case_type,
          case_number: case_number,
          year: case_year,
        }),
      });

      if (pythonResponse.ok) {
        const pythonData = await pythonResponse.json();
        console.log('[SUCCESS] Data from Python API');
        
        // Transform to match expected format
        const transformedData = {
          case_title: pythonData.case_title || `${case_type} ${case_number}/${case_year}`,
          case_number: pythonData.case_number || `${case_type} ${case_number}/${case_year}`,
          filing_number: pythonData.filing_number || null,
          cnr: pythonData.cnr || null,
          case_status: pythonData.case_status || 'Unknown',
          next_hearing_date: pythonData.next_hearing_date || null,
          stage: pythonData.stage || null,
          section: pythonData.section || null,
          act: pythonData.act || null,
          court_number: pythonData.court_number || null,
          item_number: pythonData.item_number || null,
          petitioner_name: pythonData.petitioner_name || null,
          respondent_name: pythonData.respondent_name || null,
          petitioner_advocate: pythonData.petitioner_advocate || null,
          respondent_advocate: pythonData.respondent_advocate || null,
          judge_name: pythonData.judge_name || null,
          listings: pythonData.listings || [],
          orders: pythonData.orders || [],
          ia_details: pythonData.ia_details || [],
          history: pythonData.history || [],
          court_name: court_name || 'High Court',
          source: 'Python Backend API',
        };

        return new Response(JSON.stringify(transformedData), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      } else {
        console.log(`[WARN] Python API returned status ${pythonResponse.status}, falling back to manual entry`);
      }
    } catch (pythonError) {
      console.log(`[WARN] Python API call failed: ${pythonError.message}, falling back to manual entry`);
    }

    // Fallback: Return template with court links for manual entry
    const courtLinks: Record<string, string> = {
      'telangana_hc': 'https://hcts.nic.in/caseStatus',
      'supreme_court': 'https://main.sci.gov.in/case-status',
      'delhi_hc': 'https://delhihighcourt.nic.in/case_status.asp',
      'bombay_hc': 'https://bombayhighcourt.nic.in/case_status.php',
      'madras_hc': 'https://www.hcmadras.tn.gov.in/casestatus/',
      'karnataka_hc': 'https://karnatakajudiciary.kar.nic.in/casestatus/',
      'allahabad_hc': 'https://www.allahabadhighcourt.in/casestatus/',
      'calcutta_hc': 'https://calcuttahighcourt.gov.in/CaseStatus/',
      'patna_hc': 'https://patnahighcourt.gov.in/casestatus/',
      'gujarat_hc': 'https://gujarathighcourt.nic.in/casestatus',
      'punjab_haryana_hc': 'https://highcourtchd.gov.in/case_status/',
      'rajasthan_hc': 'https://hcraj.nic.in/case_status/',
      'madhya_pradesh_hc': 'https://mphc.gov.in/casestatus',
      'kerala_hc': 'https://hckerala.gov.in/case_status/',
      'andhra_pradesh_hc': 'https://aphc.gov.in/case_status/',
      'orissa_hc': 'https://orissahighcourt.nic.in/case_status/',
      'chhattisgarh_hc': 'https://highcourt.cg.gov.in/casestatus/',
      'jharkhand_hc': 'https://jharkhandhighcourt.nic.in/case_status',
      'uttarakhand_hc': 'https://highcourtofuttarakhand.gov.in/casestatus/',
      'himachal_pradesh_hc': 'https://hphighcourt.nic.in/casestatus/',
      'jammu_kashmir_hc': 'https://jkhighcourt.nic.in/casestatus/',
      'gauhati_hc': 'https://ghconline.gov.in/Case/CaseNumber.aspx',
      'manipur_hc': 'https://hcmimphal.nic.in/case_status/',
      'meghalaya_hc': 'https://meghalayahighcourt.nic.in/case_status/',
      'sikkim_hc': 'http://highcourtofsikkim.nic.in/case_status/',
      'tripura_hc': 'https://thc.nic.in/case_status/',
    };

    const websiteLink = courtLinks[court_code] || null;

    const fallbackResponse = {
      case_title: `${case_type} ${case_number}/${case_year}`,
      case_number: `${case_type} ${case_number}/${case_year}`,
      filing_number: null,
      cnr: null,
      case_status: 'Awaiting Data',
      next_hearing_date: null,
      stage: null,
      section: null,
      act: null,
      court_number: null,
      item_number: null,
      petitioner_name: 'Manual entry required',
      respondent_name: 'Manual entry required',
      petitioner_advocate: null,
      respondent_advocate: null,
      judge_name: null,
      listings: [],
      orders: [],
      ia_details: [],
      history: [],
      court_name: court_name || 'Unknown Court',
      court_website: websiteLink,
      source: 'Fallback - Manual Entry',
      _instructions: websiteLink ? {
        step1: `Visit: ${websiteLink}`,
        step2: `Search for: ${case_type} ${case_number}/${case_year}`,
        step3: 'Copy case details and save',
      } : null,
    };

    return new Response(JSON.stringify(fallbackResponse), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ 
      error: 'Request failed',
      message: String(error),
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});
