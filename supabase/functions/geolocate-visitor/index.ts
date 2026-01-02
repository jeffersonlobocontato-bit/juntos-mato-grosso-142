import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract IP from headers (order of priority)
    const ip = 
      req.headers.get('cf-connecting-ip') || 
      req.headers.get('x-real-ip') || 
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      null;

    console.log('Received request for geolocation, IP:', ip);

    if (!ip) {
      console.log('No IP found in headers');
      return new Response(
        JSON.stringify({ city: null, region: null, country: 'BR', country_code: 'BR' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Skip localhost/private IPs
    if (ip.startsWith('127.') || ip.startsWith('192.168.') || ip.startsWith('10.') || ip === '::1') {
      console.log('Private IP detected, skipping geolocation');
      return new Response(
        JSON.stringify({ city: null, region: null, country: 'BR', country_code: 'BR' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call ip-api.com (free, 45 requests/minute limit)
    const geoResponse = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city`);
    const geoData = await geoResponse.json();

    console.log('Geolocation response:', geoData);

    if (geoData.status === 'success') {
      return new Response(
        JSON.stringify({
          city: geoData.city || null,
          region: geoData.regionName || null,
          country: geoData.country || 'Brasil',
          country_code: geoData.countryCode || 'BR',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.log('Geolocation failed:', geoData.message);
      return new Response(
        JSON.stringify({ city: null, region: null, country: 'BR', country_code: 'BR' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error in geolocate-visitor function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ city: null, region: null, country: 'BR', country_code: 'BR', error: errorMessage }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
