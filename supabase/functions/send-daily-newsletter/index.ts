/**
 * send-daily-newsletter Edge Function
 * Triggered daily via pg_cron at 8:00 AM IST (02:30 UTC)
 *
 * Flow:
 * 1. Calculate yesterday's puzzle ID
 * 2. Check/generate newsletter content (Gemini 2.0 Flash)
 * 3. Fetch active subscribers
 * 4. Send personalized emails via Resend
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Puzzle epoch — must match client-side constant
const EPOCH_DATE = new Date("2026-01-15T00:00:00Z");

interface PuzzleData {
  venue: string;
  team1: string;
  team1Score: string;
  team2: string;
  team2Score: string;
  result: string;
  motm: string;
  matchContext?: string;
  triviaFact?: string;
  playerHighlight?: string;
}

interface NewsletterContent {
  headline: string;
  body: string;
  did_you_know: string;
}

/**
 * Calculate yesterday's puzzle ID using the same epoch logic as the client
 */
function getYesterdayPuzzleInfo(): { puzzleDate: string; dayNumber: number } {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);

  const puzzleDate = yesterday.toISOString().split("T")[0];
  const diffMs = yesterday.getTime() - EPOCH_DATE.getTime();
  const dayNumber = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return { puzzleDate, dayNumber };
}

/**
 * Generate newsletter content using Gemini 2.0 Flash
 */
async function generateContent(puzzleData: PuzzleData): Promise<NewsletterContent> {
  const prompt = `You are a cricket enthusiast writing a short nostalgia email about a historic cricket match. Write like a fan reminiscing with another fan — warm, evocative, personal. NOT like a sports journalist or commentator.

Match details:
- Venue: ${puzzleData.venue}
- ${puzzleData.team1}: ${puzzleData.team1Score}
- ${puzzleData.team2}: ${puzzleData.team2Score}
- Result: ${puzzleData.result}
- Man of the Match: ${puzzleData.motm}
${puzzleData.matchContext ? `- Context: ${puzzleData.matchContext}` : ""}
${puzzleData.triviaFact ? `- Trivia: ${puzzleData.triviaFact}` : ""}
${puzzleData.playerHighlight ? `- Key performance: ${puzzleData.playerHighlight}` : ""}

Generate a JSON object with:
1. "headline": A punchy, nostalgic headline (max 100 chars). No quotes around it.
2. "body": 2-3 short paragraphs about the match. Capture the emotion, the moment, what made it special. Use "you" and "we" — make the reader feel like they were there.
3. "did_you_know": One surprising fact about this match or the players involved (1-2 sentences).

Return ONLY valid JSON, no markdown formatting.`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 1024,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  const result = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Empty response from Gemini");
  }

  return JSON.parse(text);
}

/**
 * Build the HTML email template
 */
function buildEmailHtml(
  content: NewsletterContent,
  puzzleData: PuzzleData,
  personalResult: string | null
): string {
  const personalSection = personalResult
    ? `<div style="background:#f0fdf4;border-radius:8px;padding:12px 16px;margin-bottom:20px;font-size:15px;color:#166534;text-align:center;">${personalResult}</div>`
    : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f9ff;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:20px;">
  <!-- Header -->
  <div style="text-align:center;padding:20px 0 16px;">
    <span style="font-size:28px;">🏏</span>
    <span style="font-size:22px;font-weight:700;color:#1e3a5f;margin-left:8px;">Bowldem</span>
    <div style="color:#64748b;font-size:13px;margin-top:4px;">Yesterday's Puzzle</div>
  </div>

  <!-- Card -->
  <div style="background:#fff;border-radius:12px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    ${personalSection}

    <!-- Headline -->
    <h2 style="color:#1e3a5f;font-size:20px;margin:0 0 16px;line-height:1.3;">${content.headline}</h2>

    <!-- Match Info -->
    <div style="background:#f8fafc;border-radius:8px;padding:12px 16px;margin-bottom:16px;font-size:14px;color:#475569;">
      <div><strong>${puzzleData.team1}</strong> ${puzzleData.team1Score}</div>
      <div style="color:#94a3b8;font-size:12px;margin:2px 0;">vs</div>
      <div><strong>${puzzleData.team2}</strong> ${puzzleData.team2Score}</div>
      <div style="margin-top:6px;font-size:13px;color:#1e3a5f;">${puzzleData.result}</div>
      <div style="margin-top:4px;font-size:13px;">⭐ MOTM: ${puzzleData.motm}</div>
    </div>

    <!-- Body -->
    <div style="color:#334155;font-size:15px;line-height:1.7;margin-bottom:16px;">
      ${content.body.split("\n").map((p: string) => `<p style="margin:0 0 12px;">${p}</p>`).join("")}
    </div>

    <!-- Did You Know -->
    <div style="background:#fefce8;border-left:3px solid #eab308;padding:10px 14px;border-radius:0 8px 8px 0;margin-bottom:20px;">
      <div style="font-size:12px;font-weight:600;color:#854d0e;margin-bottom:4px;">💡 DID YOU KNOW</div>
      <div style="font-size:14px;color:#713f12;">${content.did_you_know}</div>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin-top:20px;">
      <a href="https://bowldem.com" style="display:inline-block;background:#1e3a5f;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;">
        Play Today's Puzzle →
      </a>
    </div>
  </div>

  <!-- Footer -->
  <div style="text-align:center;padding:20px 0;color:#94a3b8;font-size:12px;">
    <a href="https://bowldem.com?unsubscribe={{email_b64}}" style="color:#94a3b8;text-decoration:underline;">Unsubscribe</a>
    &nbsp;·&nbsp; Bowldem — Daily Cricket Puzzles
  </div>
</div>
</body>
</html>`;
}

/**
 * Send email via Resend API
 */
async function sendEmail(to: string, subject: string, html: string): Promise<string | null> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Bowldem <hello@bowldem.com>",
      to: [to],
      subject,
      html: html.replace("{{email_b64}}", btoa(to)),
    }),
  });

  const result = await response.json();
  return result.id || null;
}

// Main handler
Deno.serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { puzzleDate, dayNumber } = getYesterdayPuzzleInfo();

    console.log(`Processing newsletter for puzzle date: ${puzzleDate}, day: ${dayNumber}`);

    // 1. Check for scheduled puzzle override, fall back to modulo
    const { data: scheduled } = await supabase
      .from("puzzle_schedule")
      .select("puzzle_id")
      .eq("schedule_date", puzzleDate)
      .single();

    // Get puzzle data — we need match details from the puzzle tables
    // The puzzle_id comes from schedule or modulo calculation
    // For now, fetch from match_puzzles view
    const { data: puzzleRow } = await supabase
      .from("public_puzzles")
      .select("*")
      .eq("puzzle_date", puzzleDate)
      .single();

    if (!puzzleRow) {
      console.log("No puzzle found for yesterday, skipping newsletter");
      return new Response(JSON.stringify({ status: "skipped", reason: "no puzzle" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Build puzzle data for content generation
    const puzzleData: PuzzleData = {
      venue: puzzleRow.venue || "",
      team1: puzzleRow.team1_name || "",
      team1Score: puzzleRow.team1_score || "",
      team2: puzzleRow.team2_name || "",
      team2Score: puzzleRow.team2_score || "",
      result: puzzleRow.result || "",
      motm: puzzleRow.motm_name || "",
      matchContext: puzzleRow.match_context || undefined,
      triviaFact: puzzleRow.trivia_fact || undefined,
      playerHighlight: puzzleRow.player_highlight || undefined,
    };

    // 2. Check newsletter_content cache
    let content: NewsletterContent;
    const { data: cached } = await supabase
      .from("newsletter_content")
      .select("*")
      .eq("puzzle_id", puzzleRow.id || dayNumber)
      .single();

    if (cached) {
      console.log("Using cached newsletter content");
      content = {
        headline: cached.headline,
        body: cached.body,
        did_you_know: cached.did_you_know,
      };
    } else {
      console.log("Generating newsletter content via Gemini");
      content = await generateContent(puzzleData);

      // Cache it
      await supabase.from("newsletter_content").insert([
        {
          puzzle_id: puzzleRow.id || dayNumber,
          headline: content.headline,
          body: content.body,
          did_you_know: content.did_you_know,
        },
      ]);
    }

    // 3. Fetch active subscribers
    const { data: subscribers } = await supabase
      .from("email_subscribers")
      .select("email")
      .eq("is_active", true)
      .eq("newsletter_enabled", true);

    if (!subscribers || subscribers.length === 0) {
      console.log("No active subscribers");
      return new Response(JSON.stringify({ status: "done", sent: 0 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log(`Sending to ${subscribers.length} subscribers`);
    let sentCount = 0;

    // 4. Send to each subscriber
    for (const sub of subscribers) {
      // Dedup check
      const { data: alreadySent } = await supabase
        .from("email_log")
        .select("id")
        .eq("email", sub.email)
        .eq("email_type", "daily_newsletter")
        .eq("puzzle_date", puzzleDate)
        .single();

      if (alreadySent) continue;

      // Personalize — check if they played yesterday
      let personalResult: string | null = null;
      const { data: entry } = await supabase
        .from("leaderboard_entries")
        .select("guesses_used, won")
        .eq("email", sub.email)
        .eq("puzzle_date", puzzleDate)
        .single();

      if (entry) {
        if (entry.won) {
          // Calculate percentile
          const { count: totalPlayers } = await supabase
            .from("leaderboard_entries")
            .select("id", { count: "exact", head: true })
            .eq("puzzle_date", puzzleDate);

          const { count: betterPlayers } = await supabase
            .from("leaderboard_entries")
            .select("id", { count: "exact", head: true })
            .eq("puzzle_date", puzzleDate)
            .eq("won", true)
            .lt("guesses_used", entry.guesses_used);

          const percentile = totalPlayers
            ? Math.round(((totalPlayers - (betterPlayers || 0)) / totalPlayers) * 100)
            : null;

          personalResult = `🏆 You got it in ${entry.guesses_used}!`;
          if (percentile) {
            personalResult += ` Faster than ${percentile}% of players.`;
          }
        } else {
          personalResult = `😔 You missed this one — but you're not alone!`;
        }
      } else {
        personalResult = `⏰ You didn't play yesterday — don't break your streak!`;
      }

      const html = buildEmailHtml(content, puzzleData, personalResult);
      const subject = `🏏 ${content.headline}`;

      try {
        const resendId = await sendEmail(sub.email, subject, html);

        // Log the send
        await supabase.from("email_log").insert([
          {
            email: sub.email,
            email_type: "daily_newsletter",
            puzzle_date: puzzleDate,
            resend_id: resendId,
          },
        ]);

        sentCount++;
      } catch (sendError) {
        console.error(`Failed to send to ${sub.email}:`, sendError);
      }
    }

    console.log(`Newsletter complete: sent ${sentCount}/${subscribers.length}`);
    return new Response(
      JSON.stringify({ status: "done", sent: sentCount, total: subscribers.length }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Newsletter error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
