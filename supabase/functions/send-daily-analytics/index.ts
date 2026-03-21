/**
 * send-daily-analytics Edge Function
 * Triggered daily via pg_cron at 03:00 UTC (8:30 AM IST)
 *
 * Sends a plain-text analytics summary email to menonvikz@gmail.com
 * with key metrics from the previous day + 7-day trend.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const RECIPIENT = "menonvikz@gmail.com";

/**
 * Get yesterday's date string (YYYY-MM-DD) in UTC
 */
function getYesterday(): string {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return yesterday.toISOString().split("T")[0];
}

/**
 * Get date N days ago
 */
function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().split("T")[0];
}

interface DailyMetrics {
  gamesPlayed: number;
  uniquePlayers: number;
  winRate: number;
  avgGuesses: number | null;
  newSignups: number;
  newEmailSubs: number;
  totalRegistered: number;
  totalEmailSubs: number;
}

interface TrendDay {
  date: string;
  games: number;
}

// Main handler
Deno.serve(async (_req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const yesterday = getYesterday();

    console.log(`Generating analytics report for ${yesterday}`);

    // Run all queries in parallel
    const [
      gamesResult,
      uniquePlayersResult,
      winRateResult,
      avgGuessesResult,
      newSignupsResult,
      newEmailSubsResult,
      totalRegisteredResult,
      totalEmailSubsResult,
      trendResult,
    ] = await Promise.all([
      // Games played yesterday (excluding seeds)
      supabase
        .from("leaderboard_entries")
        .select("id", { count: "exact", head: true })
        .eq("puzzle_date", yesterday)
        .eq("is_seed", false),

      // Unique players yesterday (excluding seeds)
      supabase.rpc("count_unique_players", { target_date: yesterday }),

      // Win rate yesterday (excluding seeds)
      supabase.rpc("calc_win_rate", { target_date: yesterday }),

      // Avg guesses for winners yesterday (excluding seeds)
      supabase.rpc("calc_avg_guesses", { target_date: yesterday }),

      // New auth signups yesterday
      supabase
        .from("user_profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", `${yesterday}T00:00:00Z`)
        .lt("created_at", `${yesterday}T23:59:59.999Z`),

      // New email subs yesterday
      supabase
        .from("email_subscribers")
        .select("id", { count: "exact", head: true })
        .gte("subscribed_at", `${yesterday}T00:00:00Z`)
        .lt("subscribed_at", `${yesterday}T23:59:59.999Z`),

      // Total registered users
      supabase
        .from("user_profiles")
        .select("id", { count: "exact", head: true }),

      // Total active email subs
      supabase
        .from("email_subscribers")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true),

      // 7-day trend — games per day
      supabase
        .from("leaderboard_entries")
        .select("puzzle_date")
        .eq("is_seed", false)
        .gte("puzzle_date", daysAgo(7))
        .lte("puzzle_date", yesterday),
    ]);

    // Build metrics
    const gamesPlayed = gamesResult.count || 0;

    // For unique players, win rate, avg guesses — use RPC results or fallback to raw query
    let uniquePlayers = 0;
    let winRate = 0;
    let avgGuesses: number | null = null;

    if (uniquePlayersResult.data !== null) {
      uniquePlayers = uniquePlayersResult.data as number;
    }
    if (winRateResult.data !== null) {
      winRate = winRateResult.data as number;
    }
    if (avgGuessesResult.data !== null) {
      avgGuesses = avgGuessesResult.data as number;
    }

    // If RPCs don't exist yet, fall back to manual queries
    if (uniquePlayersResult.error) {
      const { data: rawPlayers } = await supabase
        .from("leaderboard_entries")
        .select("device_id")
        .eq("puzzle_date", yesterday)
        .eq("is_seed", false);
      if (rawPlayers) {
        uniquePlayers = new Set(rawPlayers.map((r: { device_id: string }) => r.device_id)).size;
      }
    }

    if (winRateResult.error) {
      const { data: allEntries } = await supabase
        .from("leaderboard_entries")
        .select("won")
        .eq("puzzle_date", yesterday)
        .eq("is_seed", false);
      if (allEntries && allEntries.length > 0) {
        const wins = allEntries.filter((e: { won: boolean }) => e.won).length;
        winRate = Math.round((wins / allEntries.length) * 100);
      }
    }

    if (avgGuessesResult.error) {
      const { data: winners } = await supabase
        .from("leaderboard_entries")
        .select("guesses_used")
        .eq("puzzle_date", yesterday)
        .eq("is_seed", false)
        .eq("won", true);
      if (winners && winners.length > 0) {
        const sum = winners.reduce(
          (a: number, w: { guesses_used: number }) => a + w.guesses_used,
          0
        );
        avgGuesses = Math.round((sum / winners.length) * 100) / 100;
      }
    }

    const metrics: DailyMetrics = {
      gamesPlayed,
      uniquePlayers,
      winRate,
      avgGuesses,
      newSignups: newSignupsResult.count || 0,
      newEmailSubs: newEmailSubsResult.count || 0,
      totalRegistered: totalRegisteredResult.count || 0,
      totalEmailSubs: totalEmailSubsResult.count || 0,
    };

    // Build 7-day trend
    const trendMap: Record<string, number> = {};
    for (let i = 7; i >= 1; i--) {
      trendMap[daysAgo(i)] = 0;
    }
    if (trendResult.data) {
      for (const row of trendResult.data) {
        const d = row.puzzle_date as string;
        if (trendMap[d] !== undefined) {
          trendMap[d]++;
        }
      }
    }
    const trend: TrendDay[] = Object.entries(trendMap).map(([date, games]) => ({
      date,
      games,
    }));

    // Build email
    const subject = `Bowldem Daily — ${yesterday} — ${metrics.gamesPlayed} games`;
    const html = buildEmailHtml(yesterday, metrics, trend);

    // Send via Resend
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Bowldem Analytics <hello@bowldem.com>",
        to: [RECIPIENT],
        subject,
        html,
      }),
    });

    const emailResult = await emailResponse.json();

    console.log(
      `Analytics email sent: ${emailResult.id || "unknown"} — ${metrics.gamesPlayed} games, ${metrics.uniquePlayers} players`
    );

    return new Response(
      JSON.stringify({
        status: "done",
        emailId: emailResult.id,
        metrics,
        trend,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Analytics error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

/**
 * Build a clean, scannable HTML email
 */
function buildEmailHtml(
  date: string,
  m: DailyMetrics,
  trend: TrendDay[]
): string {
  const trendRows = trend
    .map((t) => {
      const dayName = new Date(t.date + "T12:00:00Z").toLocaleDateString(
        "en-US",
        { weekday: "short", month: "short", day: "numeric" }
      );
      const bar = "█".repeat(Math.min(t.games, 30)) || "░";
      return `<tr><td style="padding:2px 8px 2px 0;color:#64748b;font-size:13px;white-space:nowrap;">${dayName}</td><td style="padding:2px 4px;font-family:monospace;font-size:13px;color:#1e3a5f;">${bar}</td><td style="padding:2px 0 2px 6px;font-size:13px;color:#334155;font-weight:600;">${t.games}</td></tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
<div style="max-width:520px;margin:0 auto;padding:20px;">

  <!-- Header -->
  <div style="padding:16px 0 12px;border-bottom:2px solid #1e3a5f;">
    <span style="font-size:18px;font-weight:700;color:#1e3a5f;">Bowldem Daily Report</span>
    <span style="float:right;color:#64748b;font-size:14px;">${date}</span>
  </div>

  <!-- Key Metrics -->
  <table style="width:100%;border-collapse:collapse;margin:16px 0;">
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;">
        <div style="color:#64748b;font-size:12px;text-transform:uppercase;">Games Played</div>
        <div style="font-size:28px;font-weight:700;color:#1e3a5f;">${m.gamesPlayed}</div>
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;">
        <div style="color:#64748b;font-size:12px;text-transform:uppercase;">Unique Players</div>
        <div style="font-size:28px;font-weight:700;color:#1e3a5f;">${m.uniquePlayers}</div>
      </td>
    </tr>
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;">
        <div style="color:#64748b;font-size:12px;text-transform:uppercase;">Win Rate</div>
        <div style="font-size:22px;font-weight:600;color:#166534;">${m.winRate}%</div>
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;">
        <div style="color:#64748b;font-size:12px;text-transform:uppercase;">Avg Guesses (Winners)</div>
        <div style="font-size:22px;font-weight:600;color:#1e3a5f;">${m.avgGuesses !== null ? m.avgGuesses.toFixed(1) : "—"}</div>
      </td>
    </tr>
  </table>

  <!-- Growth -->
  <div style="background:#fff;border-radius:8px;padding:14px 16px;margin-bottom:16px;border:1px solid #e2e8f0;">
    <div style="font-size:13px;font-weight:600;color:#1e3a5f;margin-bottom:8px;">GROWTH</div>
    <table style="width:100%;font-size:14px;color:#334155;">
      <tr><td style="padding:3px 0;">New signups (auth)</td><td style="text-align:right;font-weight:600;">${m.newSignups}</td></tr>
      <tr><td style="padding:3px 0;">New email subscribers</td><td style="text-align:right;font-weight:600;">${m.newEmailSubs}</td></tr>
      <tr style="border-top:1px solid #f1f5f9;"><td style="padding:3px 0;color:#64748b;">Total registered</td><td style="text-align:right;">${m.totalRegistered}</td></tr>
      <tr><td style="padding:3px 0;color:#64748b;">Total email subs</td><td style="text-align:right;">${m.totalEmailSubs}</td></tr>
    </table>
  </div>

  <!-- 7-Day Trend -->
  <div style="background:#fff;border-radius:8px;padding:14px 16px;border:1px solid #e2e8f0;">
    <div style="font-size:13px;font-weight:600;color:#1e3a5f;margin-bottom:8px;">7-DAY TREND (games/day)</div>
    <table style="width:100%;">${trendRows}</table>
  </div>

  <!-- Footer -->
  <div style="text-align:center;padding:16px 0;color:#94a3b8;font-size:11px;">
    Bowldem Analytics — auto-generated, do not reply
  </div>

</div>
</body>
</html>`;
}
