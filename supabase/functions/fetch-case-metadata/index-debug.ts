// ULTRA SIMPLE DEBUG VERSION - Test if Edge Function works at all

// @ts-ignore
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // Just return a simple success message
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Edge Function is working!',
      timestamp: new Date().toISOString(),
      case_title: 'WP 1495/2026 - DEBUG MODE',
      case_number: 'WP 1495/2026',
      case_status: 'DEBUG - Function deployed successfully',
      petitioner_name: 'Test Petitioner',
      respondent_name: 'Test Respondent',
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ 
      error: 'Failed',
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
