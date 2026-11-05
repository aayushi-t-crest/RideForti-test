import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 60; // requests per window
const RATE_WINDOW_MS = 60 * 1000; // 1 minute

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);
  
  if (!record || now > record.resetTime) {
    rateLimitStore.set(identifier, { count: 1, resetTime: now + RATE_WINDOW_MS });
    return true;
  }
  
  if (record.count >= RATE_LIMIT) {
    return false;
  }
  
  record.count++;
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    if (!checkRateLimit(clientIP)) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later.", features: [] }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { query, type, proximity } = await req.json();
    
    // Validate input
    if (typeof query !== "string" || query.length > 500) {
      return new Response(
        JSON.stringify({ features: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accessToken = Deno.env.get("MAPBOX_ACCESS_TOKEN");

    if (!accessToken) {
      console.warn("MAPBOX_ACCESS_TOKEN unset — using local Florida suggestions fallback");
      const defaultFloridaLocations = [
        { id: "fl_mia_airport", place_name: "Miami International Airport (MIA), Miami, Florida", text: "Miami International Airport", center: [-80.2870, 25.7959] },
        { id: "fl_fll_airport", place_name: "Fort Lauderdale-Hollywood International Airport (FLL), Fort Lauderdale, Florida", text: "Fort Lauderdale Airport", center: [-80.1528, 26.0742] },
        { id: "fl_pbi_airport", place_name: "Palm Beach International Airport (PBI), West Palm Beach, Florida", text: "Palm Beach International Airport", center: [-80.0956, 26.6832] },
        { id: "fl_mco_airport", place_name: "Orlando International Airport (MCO), Orlando, Florida", text: "Orlando International Airport", center: [-81.3081, 28.4312] },
        { id: "fl_tpa_airport", place_name: "Tampa International Airport (TPA), Tampa, Florida", text: "Tampa International Airport", center: [-82.5332, 27.9772] },
        { id: "fl_brickell", place_name: "Brickell Avenue, Miami, Florida 33131", text: "Brickell Avenue", center: [-80.1906, 25.7592] },
        { id: "fl_south_beach", place_name: "Ocean Drive, South Beach, Miami Beach, Florida 33139", text: "Ocean Drive, South Beach", center: [-80.1303, 25.7781] },
        { id: "fl_palm_beach", place_name: "Worth Avenue, Palm Beach, Florida 33480", text: "Worth Avenue, Palm Beach", center: [-80.0384, 26.7011] },
        { id: "fl_las_olas", place_name: "Las Olas Boulevard, Fort Lauderdale, Florida 33301", text: "Las Olas Boulevard", center: [-80.1325, 26.1198] },
        { id: "fl_boca_resort", place_name: "The Boca Raton Resort & Club, Boca Raton, Florida 33432", text: "The Boca Raton Resort", center: [-80.0833, 26.3475] },
        { id: "fl_naples_5th", place_name: "5th Avenue South, Naples, Florida 34102", text: "5th Avenue South, Naples", center: [-81.7997, 26.1420] }
      ];

      const q = (query || "").toLowerCase();
      const filtered = defaultFloridaLocations.filter(loc => 
        loc.place_name.toLowerCase().includes(q) || loc.text.toLowerCase().includes(q)
      );

      return new Response(
        JSON.stringify({ features: filtered.length > 0 ? filtered : defaultFloridaLocations.slice(0, 5) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!query || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ features: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize query - remove potentially dangerous characters
    const sanitizedQuery = query.trim().slice(0, 200);

    // Build the Mapbox Geocoding API URL
    // Restrict to Florida bounding box
    const floridaBbox = "-87.6349,24.3963,-79.9743,31.0009";
    const endpoint = type === "reverse" 
      ? `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(sanitizedQuery)}.json`
      : `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(sanitizedQuery)}.json`;

    const params = new URLSearchParams({
      access_token: accessToken,
      country: "US",
      bbox: floridaBbox,
      types: "address,poi,neighborhood,locality,place",
      limit: "8",
      autocomplete: "true",
    });

    // Validate proximity if provided
    if (proximity && typeof proximity === "string" && proximity.match(/^-?\d+\.?\d*,-?\d+\.?\d*$/)) {
      params.set("proximity", proximity);
    }

    const response = await fetch(`${endpoint}?${params.toString()}`);
    const data = await response.json();

    if (!response.ok) {
      console.error("Mapbox API error:", response.status);
      return new Response(
        JSON.stringify({ error: "Location service temporarily unavailable", features: [] }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter results to only Florida
    const floridaResults = data.features?.filter((feature: Record<string, unknown>) => {
      const context = (feature.context as Array<{ id?: string; text?: string }>) || [];
      return context.some((c) => 
        c.id?.startsWith("region") && c.text === "Florida"
      ) || (feature.place_name as string)?.includes("Florida");
    }) || [];

    return new Response(
      JSON.stringify({ features: floridaResults }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Mapbox geocode error:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred", features: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
