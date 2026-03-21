/**
 * send-welcome-email Edge Function
 * Triggered by subscribeToEmails() on first auth sign-in
 *
 * Sends a one-time welcome email via Resend, then marks welcome_sent_at
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function buildWelcomeHtml(name: string, emailB64: string): string {
  const displayName = name || "there";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f9ff;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:20px;">
  <!-- Header -->
  <div style="text-align:center;padding:20px 0 16px;">
    <span style="font-size:28px;">🏏</span>
    <span style="font-size:22px;font-weight:700;color:#1e3a5f;margin-left:8px;">Bowldem</span>
  </div>

  <!-- Card -->
  <div style="background:#fff;border-radius:12px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <p style="color:#334155;font-size:16px;line-height:1.6;margin:0 0 16px;">
      Hey ${displayName},
    </p>

    <p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 16px;">
      Thanks for signing in. Here's what that gets you:
    </p>

    <ul style="color:#334155;font-size:15px;line-height:1.8;margin:0 0 16px;padding-left:20px;">
      <li>Scores and streaks saved across devices</li>
      <li>Permanent spot on the all-time leaderboard</li>
      <li>Daily email with yesterday's answer + cricket nostalgia (one-tap unsubscribe anytime)</li>
    </ul>

    <p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 20px;">
      One ask — hit reply and tell me what you think. What's fun, what's broken, what match should be a puzzle? I read every reply.
    </p>

    <p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 20px;">
      See you on the leaderboard,<br>
      Vikas
    </p>

    <!-- CTA -->
    <div style="text-align:center;margin-top:20px;">
      <a href="https://bowldem.com" style="display:inline-block;background:#1e3a5f;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;">
        Play Today's Puzzle →
      </a>
    </div>
  </div>

  <!-- Footer -->
  <div style="text-align:center;padding:20px 0;color:#94a3b8;font-size:12px;">
    <a href="https://bowldem.com?unsubscribe=${emailB64}" style="color:#94a3b8;text-decoration:underline;">Unsubscribe</a>
    &nbsp;·&nbsp; Bowldem — Daily Cricket Puzzles
  </div>
</div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  try {
    const { email, displayName } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "email is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check if welcome already sent (dedup)
    const { data: subscriber } = await supabase
      .from("email_subscribers")
      .select("welcome_sent_at")
      .eq("email", email)
      .single();

    if (subscriber?.welcome_sent_at) {
      return new Response(
        JSON.stringify({ status: "skipped", reason: "already sent" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Send via Resend
    const emailB64 = btoa(email);
    const html = buildWelcomeHtml(displayName || "", emailB64);

    const name = displayName ? displayName.split(" ")[0] : "";
    const subject = name ? `Welcome, ${name}` : "Welcome to Bowldem";

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Vikas from Bowldem <hello@bowldem.com>",
        reply_to: "menonvikz@gmail.com",
        to: [email],
        subject,
        html,
      }),
    });

    const resendResult = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("Resend error:", resendResult);
      return new Response(JSON.stringify({ error: "Failed to send email" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Mark welcome as sent
    await supabase
      .from("email_subscribers")
      .update({ welcome_sent_at: new Date().toISOString() })
      .eq("email", email);

    console.log(`Welcome email sent to ${email}, resend_id: ${resendResult.id}`);

    return new Response(
      JSON.stringify({ status: "sent", resend_id: resendResult.id }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Welcome email error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
