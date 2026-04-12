/**
 * meta-capi-event Edge Function
 * Sends conversion events to Meta Conversions API (server-side).
 *
 * Called by the frontend attribution module when a user subscribes.
 * This bypasses ad blockers and iOS ATT restrictions.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHash } from "https://deno.land/std@0.208.0/crypto/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Meta CAPI credentials (set via supabase secrets)
const META_PIXEL_ID = Deno.env.get("META_PIXEL_ID");
const META_CAPI_TOKEN = Deno.env.get("META_CAPI_TOKEN");

const GRAPH_API_VERSION = "v21.0";

/**
 * SHA-256 hash a string (Meta requires hashed PII)
 */
async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  // CORS headers
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  try {
    const { event_name, email, fbclid, utm_source, utm_content } = await req.json();

    if (!META_PIXEL_ID || !META_CAPI_TOKEN) {
      console.warn("Meta CAPI not configured — skipping event send");
      return new Response(
        JSON.stringify({ success: false, reason: "meta_not_configured" }),
        { status: 200, headers }
      );
    }

    if (!event_name) {
      return new Response(
        JSON.stringify({ error: "event_name required" }),
        { status: 400, headers }
      );
    }

    // Build the event payload
    const eventTime = Math.floor(Date.now() / 1000);
    const eventId = `bowldem_${event_name}_${eventTime}_${Math.random().toString(36).slice(2, 8)}`;

    const userData: Record<string, any> = {};

    // Hash email for matching
    if (email) {
      userData.em = [await sha256(email)];
    }

    // Include fbclid for click-through attribution
    if (fbclid) {
      userData.fbc = `fb.1.${eventTime}.${fbclid}`;
    }

    const eventPayload = {
      data: [
        {
          event_name,
          event_time: eventTime,
          event_id: eventId,
          action_source: "website",
          event_source_url: "https://bowldem.com",
          user_data: userData,
          custom_data: {
            content_name: "bowldem_newsletter",
            utm_source: utm_source || undefined,
            utm_content: utm_content || undefined,
          },
        },
      ],
    };

    // Send to Meta CAPI
    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${META_PIXEL_ID}/events?access_token=${META_CAPI_TOKEN}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(eventPayload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Meta CAPI error:", JSON.stringify(result));
      return new Response(
        JSON.stringify({ success: false, error: result }),
        { status: 200, headers } // Return 200 so frontend doesn't retry
      );
    }

    // Update attribution record — mark CAPI sent
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    if (email) {
      await supabase
        .from("aq_attributions")
        .update({ capi_sent: true, capi_sent_at: new Date().toISOString() })
        .eq("email", email.toLowerCase().trim())
        .eq("capi_sent", false);
    }

    console.log(`Meta CAPI: sent ${event_name} event, events_received: ${result.events_received}`);

    return new Response(
      JSON.stringify({ success: true, events_received: result.events_received }),
      { status: 200, headers }
    );
  } catch (error) {
    console.error("CAPI event error:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 200, headers } // 200 so frontend doesn't retry
    );
  }
});
