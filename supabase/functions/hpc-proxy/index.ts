import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const body = await req.json();
    const { action, job_id, hpc_job_id, ...payload } = body;

    const HPC_BASE_URL = Deno.env.get("HPC_BASE_URL");
    if (!HPC_BASE_URL) {
      return new Response(
        JSON.stringify({ error: "HPC server not configured. Set HPC_BASE_URL secret." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const HPC_API_KEY = Deno.env.get("HPC_API_KEY") || "";
    const hpcHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (HPC_API_KEY) {
      hpcHeaders["Authorization"] = `Bearer ${HPC_API_KEY}`;
    }

    let hpcResponse: Response;

    switch (action) {
      case "submit":
        hpcResponse = await fetch(`${HPC_BASE_URL}/jobs`, {
          method: "POST",
          headers: hpcHeaders,
          body: JSON.stringify({ job_id, ...payload }),
        });
        break;

      case "status":
        hpcResponse = await fetch(`${HPC_BASE_URL}/jobs/${hpc_job_id || job_id}/status`, {
          headers: hpcHeaders,
        });
        break;

      case "logs":
        hpcResponse = await fetch(`${HPC_BASE_URL}/jobs/${hpc_job_id || job_id}/logs`, {
          headers: hpcHeaders,
        });
        break;

      case "metrics":
        hpcResponse = await fetch(`${HPC_BASE_URL}/jobs/${hpc_job_id || job_id}/metrics`, {
          headers: hpcHeaders,
        });
        break;

      case "cancel":
        hpcResponse = await fetch(`${HPC_BASE_URL}/jobs/${hpc_job_id || job_id}/cancel`, {
          method: "POST",
          headers: hpcHeaders,
        });
        break;

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    const responseData = await hpcResponse.text();
    return new Response(responseData, {
      status: hpcResponse.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
