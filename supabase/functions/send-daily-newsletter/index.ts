/**
 * send-daily-newsletter Edge Function
 * Triggered daily via pg_cron at 8:00 AM IST (02:30 UTC)
 *
 * Flow:
 * 1. Calculate yesterday's puzzle ID + today's puzzle number
 * 2. Check/generate newsletter content (Grok via xAI API)
 * 3. Fetch active subscribers
 * 4. Send personalized emails via Resend (with yesterday's score)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PUZZLE_LOOKUP, PUZZLE_COUNT } from "./puzzle_data.ts";

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
}

function getDayNumber(date: Date): number {
  const diffMs = date.getTime() - EPOCH_DATE.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function getYesterdayPuzzleInfo(): {
  puzzleDate: string;
  dayNumber: number;
  todayNumber: number;
} {
  const now = new Date();
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);

  return {
    puzzleDate: yesterday.toISOString().split("T")[0],
    dayNumber: getDayNumber(yesterday),
    todayNumber: getDayNumber(today),
  };
}

/**
 * Generate newsletter content using Gemini 2.0 Flash (free tier)
 * Style-trained prompt based on ESPNcricinfo/Cricket Monthly voice
 * Falls back to a no-AI template if Gemini fails
 */
async function generateContent(
  puzzleData: PuzzleData
): Promise<NewsletterContent> {
  try {
    return await generateContentWithGemini(puzzleData);
  } catch (e: any) {
    const errMsg = e?.message || String(e);
    console.error("Gemini content generation failed, using fallback:", errMsg);
    const fallback = generateFallbackContent(puzzleData);
    // Tag fallback content so we can see it was a fallback in the response
    (fallback as any)._gemini_error = errMsg;
    return fallback;
  }
}

async function generateContentWithGemini(
  puzzleData: PuzzleData
): Promise<NewsletterContent> {
  const prompt = `You are a cricket writer whose voice is inspired by Andrew Miller and Sidharth Monga of ESPNcricinfo — literate, evocative sports writing with dry wit.

STYLE RULES:
- Write for a cricket-literate audience. Never explain what a yorker or cover drive is.
- Use rich, specific verbs: bludgeoned, planted, clubbed, suckered, flogged, slotted — NOT "hit", "scored", "played well"
- Mix long flowing sentences with short punchy ones for rhythm
- Drop the reader INTO a specific moment in the opening line — an image, an irony, a turning point
- Weave stats into narrative, never list them. "His 6/23 remained the finest figures ever produced against Australia" not "He took 6 wickets for 23 runs"
- Use irony and understatement: "the most pyrrhic wicket of the night", "numbers that don't begin to capture the absurdity"
- End with an emotional payoff — a lasting image or a line that lands
- NO exclamation marks. The writing does the exclaiming.
- NO generic words: amazing, incredible, fantastic, brilliant, epic
- NO AI phrases: "let's dive in", "without further ado", "in conclusion"
- NO bullet points or listicles
- 2-3 paragraphs, 200-250 words total

EXAMPLE OUTPUT STYLE:
"Shane Bond bowled the spell of his life at Port Elizabeth — six wickets for 23, the finest figures ever produced against Australia in a World Cup — and still ended up on the losing side. That is the cruelty of the 2003 tournament in a single scoreline."

Write a newsletter article about this match:
- Venue: ${puzzleData.venue}
- ${puzzleData.team1}: ${puzzleData.team1Score}
- ${puzzleData.team2}: ${puzzleData.team2Score}
- Result: ${puzzleData.result}
- Man of the Match: ${puzzleData.motm}
${puzzleData.matchContext ? `- Context: ${puzzleData.matchContext}` : ""}
${puzzleData.triviaFact ? `- Trivia: ${puzzleData.triviaFact}` : ""}
${puzzleData.playerHighlight ? `- Key performance: ${puzzleData.playerHighlight}` : ""}

Return ONLY valid JSON with two keys:
1. "headline": A punchy headline (max 80 chars). Specific, names the key moment or player.
2. "body": The article text. 2-3 paragraphs, 200-250 words. No heading, just the narrative.`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  const result = await response.json();
  console.log("Gemini raw response:", JSON.stringify(result).slice(0, 500));

  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error(
      `Empty response from Gemini. Status: ${response.status}. Body: ${JSON.stringify(result).slice(0, 300)}`
    );
  }

  // Extract JSON from response — handle markdown code blocks and extra whitespace
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`No JSON found in Gemini response: ${text.slice(0, 200)}`);

  return JSON.parse(jsonMatch[0]);
}

/**
 * Fallback: no-AI newsletter with just the answer reveal
 */
function generateFallbackContent(puzzleData: PuzzleData): NewsletterContent {
  return {
    headline: `${puzzleData.motm} was the answer`,
    body: `${puzzleData.team1} (${puzzleData.team1Score}) took on ${puzzleData.team2} (${puzzleData.team2Score}) at ${puzzleData.venue.split(",")[0]}. ${puzzleData.result}.\n\n${puzzleData.motm} was named Man of the Match.${puzzleData.playerHighlight ? " " + puzzleData.playerHighlight : ""}${puzzleData.matchContext ? "\n\n" + puzzleData.matchContext + "." : ""}`,
  };
}

/**
 * Build personalized score section
 */
function buildScoreSection(
  entry: { guesses_used: number; won: boolean } | null,
  percentile: number | null
): string {
  if (!entry) {
    return `<div style="background:#fef3c7;border-radius:8px;padding:12px 16px;margin-bottom:20px;font-size:14px;color:#92400e;text-align:center;">
      You missed yesterday's puzzle — it was a good one.
    </div>`;
  }

  if (!entry.won) {
    return `<div style="background:#fef2f2;border-radius:8px;padding:12px 16px;margin-bottom:20px;font-size:14px;color:#991b1b;text-align:center;">
      Tough one yesterday. You'll get today's.
    </div>`;
  }

  const guesses = entry.guesses_used;
  let message: string;
  if (guesses === 1) {
    message = "First guess. You absolute menace.";
  } else if (guesses <= 2) {
    message = `Cracked it in ${guesses} guesses.`;
  } else {
    message = `Got it in ${guesses}.`;
  }

  if (percentile && percentile < 100) {
    message += ` Better than ${percentile}% of players.`;
  }

  return `<div style="background:#f0fdf4;border-radius:8px;padding:12px 16px;margin-bottom:20px;font-size:14px;color:#166534;text-align:center;">
    <span style="font-size:18px;">&#127942;</span> ${message}
  </div>`;
}

/**
 * Build the HTML email template
 */
function buildEmailHtml(
  content: NewsletterContent,
  puzzleData: PuzzleData,
  dayNumber: number,
  todayNumber: number,
  scoreHtml: string
): string {
  const bodyParagraphs = content.body
    .split("\n")
    .filter((p: string) => p.trim())
    .map(
      (p: string) =>
        `<p style="margin:0 0 14px;color:#334155;font-size:15px;line-height:1.7;">${p}</p>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f9ff;font-family:'Georgia','Times New Roman',serif;">
<div style="max-width:540px;margin:0 auto;padding:20px;">

  <!-- Header -->
  <div style="padding:16px 0 12px;border-bottom:2px solid #1e3a5f;margin-bottom:20px;">
    <span style="font-size:20px;font-weight:700;color:#1e3a5f;font-family:'Segoe UI',Roboto,Arial,sans-serif;">Bowldem Daily</span>
  </div>

  <!-- Yesterday's Answer -->
  <div style="background:#1e3a5f;border-radius:8px;padding:14px 18px;margin-bottom:20px;color:#fff;">
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;margin-bottom:6px;">Yesterday's Answer — Puzzle #${dayNumber}</div>
    <div style="font-size:18px;font-weight:700;">${puzzleData.motm}</div>
    <div style="font-size:13px;color:#cbd5e1;margin-top:4px;">${puzzleData.venue.split(",")[0]}</div>
  </div>

  <!-- Your Score -->
  ${scoreHtml}

  <!-- The Story -->
  <div style="margin-bottom:24px;">
    <h2 style="color:#1e3a5f;font-size:19px;margin:0 0 14px;line-height:1.3;font-weight:700;">${content.headline}</h2>
    ${bodyParagraphs}
  </div>

  <!-- Scorecard Mini -->
  <div style="background:#f8fafc;border-radius:8px;padding:12px 16px;margin-bottom:24px;font-size:13px;color:#475569;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
    <div><strong>${puzzleData.team1}</strong> ${puzzleData.team1Score}</div>
    <div><strong>${puzzleData.team2}</strong> ${puzzleData.team2Score}</div>
    <div style="margin-top:6px;font-size:12px;color:#64748b;">${puzzleData.result}</div>
  </div>

  <!-- Today's Puzzle CTA -->
  <div style="background:#fff;border:2px solid #1e3a5f;border-radius:10px;padding:18px;text-align:center;margin-bottom:20px;">
    <div style="font-size:13px;color:#64748b;font-family:'Segoe UI',Roboto,Arial,sans-serif;margin-bottom:8px;">Puzzle #${todayNumber} is live now</div>
    <a href="https://bowldem.com" style="display:inline-block;background:#1e3a5f;color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:15px;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
      Play Today's Puzzle
    </a>
  </div>

  <!-- Footer -->
  <div style="text-align:center;padding:12px 0;color:#94a3b8;font-size:11px;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
    <a href="https://bowldem.com" style="color:#64748b;text-decoration:none;">bowldem.com</a>
    &nbsp;&middot;&nbsp;
    <a href="https://bowldem.com?unsubscribe={{email_b64}}" style="color:#94a3b8;text-decoration:underline;">Unsubscribe</a>
  </div>

</div>
</body>
</html>`;
}

/**
 * Send email via Resend API
 */
async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<string | null> {
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
Deno.serve(async (_req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { puzzleDate, dayNumber, todayNumber } = getYesterdayPuzzleInfo();

    console.log(
      `Newsletter for puzzle #${dayNumber} (${puzzleDate}), today is #${todayNumber}`
    );

    // 1. Get puzzle data from embedded lookup
    // Client logic: puzzleIndex = puzzleNumber % totalPuzzles, puzzle.id = index + 1
    const puzzleIndex = dayNumber % PUZZLE_COUNT;
    const puzzleId = puzzleIndex + 1;
    const raw = PUZZLE_LOOKUP[puzzleId];

    if (!raw) {
      console.log(`No puzzle data for id ${puzzleId} (day ${dayNumber}), skipping`);
      return new Response(
        JSON.stringify({ status: "skipped", reason: "no puzzle", puzzleId }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const puzzleData: PuzzleData = {
      venue: raw.v,
      team1: raw.t1,
      team1Score: raw.t1s,
      team2: raw.t2,
      team2Score: raw.t2s,
      result: raw.r,
      motm: raw.m,
      matchContext: raw.mc,
      triviaFact: raw.tf,
      playerHighlight: raw.ph,
    };

    // 2. Check content cache or generate
    let content: NewsletterContent;
    const { data: cached } = await supabase
      .from("newsletter_content")
      .select("*")
      .eq("puzzle_id", puzzleId)
      .single();

    if (cached) {
      console.log("Using cached content");
      content = { headline: cached.headline, body: cached.body };
    } else {
      console.log("Generating content via Grok");
      content = await generateContent(puzzleData);

      await supabase.from("newsletter_content").insert([
        {
          puzzle_id: puzzleId,
          headline: content.headline,
          body: content.body,
        },
      ]);
    }

    // 3. Fetch subscribers
    const { data: subscribers } = await supabase
      .from("email_subscribers")
      .select("email")
      .eq("is_active", true);

    if (!subscribers || subscribers.length === 0) {
      console.log("No active subscribers");
      return new Response(JSON.stringify({ status: "done", sent: 0 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // 4. Get yesterday's leaderboard stats for percentile calc
    const { data: allEntries } = await supabase
      .from("leaderboard_entries")
      .select("guesses_used, won, email")
      .eq("puzzle_date", puzzleDate)
      .eq("is_seed", false);

    const totalPlayers = allEntries?.length || 0;

    console.log(`Sending to ${subscribers.length} subscribers`);
    let sentCount = 0;

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

      // Find this subscriber's entry
      const entry =
        allEntries?.find(
          (e: { email: string }) => e.email === sub.email
        ) || null;

      // Calculate percentile if they won
      let percentile: number | null = null;
      if (entry?.won && totalPlayers > 0) {
        const betterCount =
          allEntries?.filter(
            (e: { won: boolean; guesses_used: number }) =>
              e.won && e.guesses_used < entry.guesses_used
          ).length || 0;
        percentile = Math.round(
          ((totalPlayers - betterCount) / totalPlayers) * 100
        );
      }

      const scoreHtml = buildScoreSection(entry, percentile);
      const html = buildEmailHtml(
        content,
        puzzleData,
        dayNumber,
        todayNumber,
        scoreHtml
      );
      const subject = `Bowldem Daily — ${content.headline}`;

      try {
        const resendId = await sendEmail(sub.email, subject, html);

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

    console.log(`Newsletter done: ${sentCount}/${subscribers.length}`);
    return new Response(
      JSON.stringify({
        status: "done",
        sent: sentCount,
        total: subscribers.length,
        headline: content.headline,
        gemini_error: (content as any)._gemini_error || null,
      }),
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
