// Supabase Edge Function: fetch-case-metadata
// AUTOMATIC case fetching with CAPTCHA solving
// Uses backend API for automatic case retrieval

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
        error: 'Missing required fields',
        required: ['court_code', 'case_number', 'case_year', 'case_type']
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    console.log(`Edge Function: Fetching ${case_type} ${case_number}/${case_year} from ${court_name}`);

    // Try REALTIME fetch from backend API first (NO CAPTCHA)
    try {
      const backendUrl = Deno.env.get('BACKEND_API_URL') || 'http://localhost:5000';
      const realtimeUrl = `${backendUrl}/api/case/fetch-realtime`;
      
      console.log(`Attempting realtime fetch from: ${realtimeUrl}`);
      
      const realtimeResponse = await fetch(realtimeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          court_code,
          court_name,
          case_number,
          case_year: parseInt(case_year.toString()),
          case_type
        }),
      });

      if (realtimeResponse.ok) {
        const result = await realtimeResponse.json();
        
        if (result.success && result.case_data) {
          console.log('✓ Realtime fetch successful!');
          
          return new Response(JSON.stringify({
            ...result.case_data,
            source: result.data_source || 'Realtime API',
            realtime: true,
            fetched_at: result.fetched_at,
          }), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }
      }
      Realtime fetch failed, trying fallback sources...');
    } catch (backendError) {
      console.log(`Realtime {
      console.log(`Backend API unavailable: ${backendError.message}`);
    }

    // Fallback 1: Try ECI public API
    try {
      console.log('Trying ECI API fallback...');
      
      const courtIdMap: Record<string, string> = {
        'telangana_hc': '33',
        'supreme_court': '1',
        'delhi_hc': '3',
        'bombay_hc': '2',
        'madras_hc': '4',
        'karnataka_hc': '5',
        'allahabad_hc': '6',
        'calcutta_hc': '7',
        'patna_hc': '8',
        'gujarathc': '9',
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

      const courtId = courtIdMap[court_code] || '17';
      const eciUrl = `https://apis.akshit.net/eciapi/${courtId}/high-court/case?case_number=${case_number}&case_year=${case_year}`;
      
      const eciResponse = await fetch(eciUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });

      if (eciResponse.ok) {
        const eciData = await eciResponse.json();
        console.log('✓ ECI API data retrieved');
        
        return new Response(JSON.stringify({
          case_title: eciData.case_title || `${case_type} ${case_number}/${case_year}`,
          case_number: eciData.case_number || `${case_type} ${case_number}/${case_year}`,
          filing_number: eciData.filing_number || null,
          cnr: eciData.cnr || null,
          case_status: eciData.case_status || 'Unknown',
          next_hearing_date: eciData.next_hearing_date || null,
          stage: eciData.stage || null,
          section: eciData.section || null,
          act: eciData.act || null,
          court_number: eciData.court_number || null,
          item_number: eciData.item_number || null,
          petitioner_name: eciData.petitioner_name || null,
          respondent_name: eciData.respondent_name || null,
          petitioner_advocate: eciData.petitioner_advocate || null,
          respondent_advocate: eciData.respondent_advocate || null,
          judge_name: eciData.judge_name || null,
          listings: eciData.listings || [],
          orders: eciData.orders || [],
          ia_details: eciData.ia_details || [],
          history: eciData.history || [],
          court_name: court_name || 'High Court',
          court_website: null,
          source: 'ECI API (Fallback)',
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
    } catch (eciError) {
      console.log(`ECI API failed: ${eciError.message}`);
    }

    // Fallback 2: Return error - all sources failed
    return new Response(JSON.stringify({
      error: 'Failed to fetch case automatically',
      message: 'All automatic sources failed. The case may not exist or court websites may be temporarily unavailable.',
      case_reference: `${case_type} ${case_number}/${case_year}`,
      court_name: court_name,
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error: any) {
    console.error('Edge Function error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
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
