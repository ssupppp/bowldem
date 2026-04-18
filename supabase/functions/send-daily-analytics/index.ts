/**
 * send-daily-analytics Edge Function
 * Triggered daily via pg_cron at 03:00 UTC (8:30 AM IST)
 *
 * Sends a comprehensive analytics report email to menonvikz@gmail.com:
 *   - Key metrics (games, players, win rate)
 *   - Growth (signups, email subs)
 *   - Acquisition Funnel (landing → tutorial → first guess → win → subscribe)
 *   - Meta Ads Performance (spend, impressions, clicks, CTR, CAC per variant)
 *   - Source Attribution (paid vs organic breakdown)
 *   - 7-Day Trend
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const RECIPIENT = "menonvikz@gmail.com";

function getYesterday(): string {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return yesterday.toISOString().split("T")[0];
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().split("T")[0];
}

function paiseToRupees(paise: number): string {
  return "\u20B9" + (paise / 100).toFixed(0);
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

interface FunnelMetrics {
  landings: number;
  paidLandings: number;
  organicLandings: number;
  tutorialPuzzleShown: number;
  tutorialFirstGuess: number;
  tutorialWon: number;
  tutorialLost: number;
  tutorialGraduated: number;
  firstGuess: number;
  gameStarted: number;
  gameWon: number;
  gameLost: number;
  gameCompleted: number;
  shareCompleted: number;
  leaderboardJoined: number;
  notificationEnabled: number;
}

interface MetaAdsMetrics {
  totalSpendStr: string;
  totalImpressions: number;
  totalClicks: number;
  overallCTR: string;
  paidLandings: number;
  paidPlayed: number;
  paidConverted: number;
  cacStr: string;
  variants: VariantMetrics[];
}

interface VariantMetrics {
  name: string;
  status: string;
  impressions: number;
  clicks: number;
  ctr: string;
  spendStr: string;
  landings: number;
  played: number;
  converted: number;
}

interface TrendDay {
  date: string;
  games: number;
}

Deno.serve(async (_req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const yesterday = getYesterday();
    const yesterdayStart = `${yesterday}T00:00:00Z`;
    const yesterdayEnd = `${yesterday}T23:59:59.999Z`;

    console.log(`Generating analytics report for ${yesterday}`);

    // ========================================================================
    // Phase 1: Original metrics (games, players, growth)
    // ========================================================================
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
      supabase
        .from("leaderboard_entries")
        .select("id", { count: "exact", head: true })
        .eq("puzzle_date", yesterday)
        .eq("is_seed", false),
      supabase.rpc("count_unique_players", { target_date: yesterday }),
      supabase.rpc("calc_win_rate", { target_date: yesterday }),
      supabase.rpc("calc_avg_guesses", { target_date: yesterday }),
      supabase
        .from("user_profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", yesterdayStart)
        .lt("created_at", yesterdayEnd),
      supabase
        .from("email_subscribers")
        .select("id", { count: "exact", head: true })
        .gte("subscribed_at", yesterdayStart)
        .lt("subscribed_at", yesterdayEnd),
      supabase
        .from("user_profiles")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("email_subscribers")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true),
      supabase
        .from("leaderboard_entries")
        .select("puzzle_date")
        .eq("is_seed", false)
        .gte("puzzle_date", daysAgo(7))
        .lte("puzzle_date", yesterday),
    ]);

    // Build metrics with fallbacks
    let uniquePlayers = 0;
    let winRate = 0;
    let avgGuesses: number | null = null;

    if (uniquePlayersResult.data !== null && !uniquePlayersResult.error) {
      uniquePlayers = uniquePlayersResult.data as number;
    } else {
      const { data: rawPlayers } = await supabase
        .from("leaderboard_entries")
        .select("device_id")
        .eq("puzzle_date", yesterday)
        .eq("is_seed", false);
      if (rawPlayers) {
        uniquePlayers = new Set(rawPlayers.map((r: { device_id: string }) => r.device_id)).size;
      }
    }

    if (winRateResult.data !== null && !winRateResult.error) {
      winRate = winRateResult.data as number;
    } else {
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

    if (avgGuessesResult.data !== null && !avgGuessesResult.error) {
      avgGuesses = avgGuessesResult.data as number;
    } else {
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
      gamesPlayed: gamesResult.count || 0,
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

    // ========================================================================
    // Phase 2: Acquisition Funnel from analytics_events
    // ========================================================================
    const funnelActions = [
      "app_opened",
      "tutorial_puzzle_shown",
      "tutorial_puzzle_first_guess",
      "tutorial_puzzle_won",
      "tutorial_puzzle_lost",
      "tutorial_puzzle_graduated",
      "first_guess",
      "game_started",
      "game_won",
      "game_lost",
      "game_completed",
      "share_completed",
      "leaderboard_joined",
      "notification_enabled",
    ];

    const { data: funnelData } = await supabase
      .from("analytics_events")
      .select("action, device_id")
      .eq("category", "funnel")
      .in("action", funnelActions)
      .gte("created_at", yesterdayStart)
      .lte("created_at", yesterdayEnd);

    // Count unique devices per funnel action
    const funnelCounts: Record<string, Set<string>> = {};
    for (const a of funnelActions) funnelCounts[a] = new Set();
    if (funnelData) {
      for (const row of funnelData) {
        if (funnelCounts[row.action]) {
          funnelCounts[row.action].add(row.device_id);
        }
      }
    }

    // ========================================================================
    // Phase 3: Meta Ads from aq_attributions + aq_variants
    // ========================================================================
    const [attrResult, variantsResult] = await Promise.all([
      supabase
        .from("aq_attributions")
        .select("utm_source, utm_term, puzzle_played_at, converted, landed_at")
        .gte("landed_at", yesterdayStart)
        .lte("landed_at", yesterdayEnd),
      supabase
        .from("aq_variants")
        .select("name, status, impressions, clicks, ctr, total_spend_paise, landing_page_views, subscriptions, meta_adset_id")
        .in("status", ["active", "paused", "winner"]),
    ]);

    // Attribution stats
    const paidAttr = (attrResult.data || []).filter(
      (a: { utm_source: string | null }) => a.utm_source === "meta"
    );
    const organicAttr = (attrResult.data || []).filter(
      (a: { utm_source: string | null }) => a.utm_source !== "meta"
    );
    const paidLandings = paidAttr.length;
    const organicLandings = organicAttr.length;
    const paidPlayed = paidAttr.filter(
      (a: { puzzle_played_at: string | null }) => a.puzzle_played_at !== null
    ).length;
    const paidConverted = paidAttr.filter(
      (a: { converted: boolean }) => a.converted
    ).length;

    // Build per-variant landing counts from attributions (by utm_term = adset_id)
    const landingsByAdset: Record<string, { landings: number; played: number; converted: number }> = {};
    for (const a of paidAttr) {
      const k = a.utm_term || "unknown";
      if (!landingsByAdset[k]) landingsByAdset[k] = { landings: 0, played: 0, converted: 0 };
      landingsByAdset[k].landings++;
      if (a.puzzle_played_at) landingsByAdset[k].played++;
      if (a.converted) landingsByAdset[k].converted++;
    }

    // Build variant rows
    const variants: VariantMetrics[] = (variantsResult.data || []).map(
      (v: {
        name: string;
        status: string;
        impressions: number;
        clicks: number;
        ctr: number;
        total_spend_paise: number;
        meta_adset_id: string | null;
      }) => {
        const adsetStats = v.meta_adset_id ? landingsByAdset[v.meta_adset_id] : null;
        return {
          name: v.name.length > 30 ? v.name.slice(0, 27) + "..." : v.name,
          status: v.status,
          impressions: v.impressions,
          clicks: v.clicks,
          ctr: v.ctr.toFixed(2) + "%",
          spendStr: paiseToRupees(v.total_spend_paise),
          landings: adsetStats?.landings || 0,
          played: adsetStats?.played || 0,
          converted: adsetStats?.converted || 0,
        };
      }
    );

    const totalSpendPaise = (variantsResult.data || []).reduce(
      (s: number, v: { total_spend_paise: number }) => s + v.total_spend_paise,
      0
    );
    const totalImpressions = (variantsResult.data || []).reduce(
      (s: number, v: { impressions: number }) => s + v.impressions,
      0
    );
    const totalClicks = (variantsResult.data || []).reduce(
      (s: number, v: { clicks: number }) => s + v.clicks,
      0
    );

    // Cumulative attributions (all-time) for lifetime totals row
    const { count: totalPaidLandingsAllTime } = await supabase
      .from("aq_attributions")
      .select("id", { count: "exact", head: true })
      .eq("utm_source", "meta");

    const funnelMetrics: FunnelMetrics = {
      landings: (attrResult.data || []).length,
      paidLandings,
      organicLandings,
      tutorialPuzzleShown: funnelCounts["tutorial_puzzle_shown"].size,
      tutorialFirstGuess: funnelCounts["tutorial_puzzle_first_guess"].size,
      tutorialWon: funnelCounts["tutorial_puzzle_won"].size,
      tutorialLost: funnelCounts["tutorial_puzzle_lost"].size,
      tutorialGraduated: funnelCounts["tutorial_puzzle_graduated"].size,
      firstGuess: funnelCounts["first_guess"].size,
      gameStarted: funnelCounts["game_started"].size,
      gameWon: funnelCounts["game_won"].size,
      gameLost: funnelCounts["game_lost"].size,
      gameCompleted: funnelCounts["game_completed"].size,
      shareCompleted: funnelCounts["share_completed"].size,
      leaderboardJoined: funnelCounts["leaderboard_joined"].size,
      notificationEnabled: funnelCounts["notification_enabled"].size,
    };

    const metaAds: MetaAdsMetrics = {
      totalSpendStr: paiseToRupees(totalSpendPaise),
      totalImpressions,
      totalClicks,
      overallCTR: totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) + "%" : "—",
      paidLandings,
      paidPlayed,
      paidConverted,
      cacStr: paidConverted > 0 ? paiseToRupees(totalSpendPaise / paidConverted) : "∞",
      variants,
    };

    // ========================================================================
    // Phase 4: Build and send email
    // ========================================================================
    const subject = `Bowldem Daily — ${yesterday} — ${metrics.gamesPlayed} games | ${paidLandings} paid landings`;
    const html = buildEmailHtml(yesterday, metrics, funnelMetrics, metaAds, trend, totalPaidLandingsAllTime || 0);

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
      `Analytics email sent: ${emailResult.id || "unknown"} — ${metrics.gamesPlayed} games, ${metrics.uniquePlayers} players, ${paidLandings} paid landings`
    );

    return new Response(
      JSON.stringify({
        status: "done",
        emailId: emailResult.id,
        metrics,
        funnel: funnelMetrics,
        metaAds,
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

// ============================================================================
// HTML email builder
// ============================================================================

function buildEmailHtml(
  date: string,
  m: DailyMetrics,
  f: FunnelMetrics,
  ads: MetaAdsMetrics,
  trend: TrendDay[],
  totalPaidLandingsAllTime: number
): string {

  // Funnel rate helper — returns "42%" or "—" if denominator is 0
  function rate(num: number, den: number): string {
    if (den === 0) return "—";
    return Math.round((num / den) * 100) + "%";
  }

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

  // Funnel step row helper
  function funnelRow(label: string, count: number, base: number, indent = false): string {
    const indentStyle = indent ? "padding-left:12px;color:#475569;" : "color:#334155;";
    return `<tr>
      <td style="padding:3px 0;font-size:13px;${indentStyle}">${label}</td>
      <td style="text-align:right;font-weight:600;font-size:13px;">${count}</td>
      <td style="text-align:right;font-size:13px;color:#64748b;">${rate(count, base)}</td>
    </tr>`;
  }

  // Variant row helper
  const variantRows = ads.variants
    .map(
      (v) =>
        `<tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:4px 2px;font-size:12px;color:#334155;max-width:120px;overflow:hidden;text-overflow:ellipsis;">${v.name}</td>
          <td style="padding:4px 2px;font-size:12px;text-align:right;">${v.impressions.toLocaleString()}</td>
          <td style="padding:4px 2px;font-size:12px;text-align:right;">${v.clicks}</td>
          <td style="padding:4px 2px;font-size:12px;text-align:right;">${v.ctr}</td>
          <td style="padding:4px 2px;font-size:12px;text-align:right;">${v.spendStr}</td>
          <td style="padding:4px 2px;font-size:12px;text-align:right;">${v.landings}</td>
          <td style="padding:4px 2px;font-size:12px;text-align:right;">${v.played}</td>
          <td style="padding:4px 2px;font-size:12px;text-align:right;">${v.converted}</td>
        </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:20px;">

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

  <!-- ============================================================ -->
  <!-- ACQUISITION FUNNEL (NEW) -->
  <!-- ============================================================ -->
  <div style="background:#fff;border-radius:8px;padding:14px 16px;margin-bottom:16px;border:1px solid #e2e8f0;">
    <div style="font-size:13px;font-weight:600;color:#1e3a5f;margin-bottom:4px;">ACQUISITION FUNNEL</div>
    <div style="font-size:11px;color:#94a3b8;margin-bottom:10px;">Unique devices yesterday — rate vs landings</div>
    <table style="width:100%;font-size:13px;border-collapse:collapse;">
      <tr style="color:#94a3b8;font-size:11px;text-transform:uppercase;border-bottom:1px solid #e2e8f0;">
        <td style="padding:4px 0;">Step</td>
        <td style="text-align:right;padding:4px 0;">Count</td>
        <td style="text-align:right;padding:4px 0;">Rate</td>
      </tr>
      ${funnelRow("Landings (total)", f.landings, f.landings)}
      ${funnelRow("└ Paid (Meta)", f.paidLandings, f.landings, true)}
      ${funnelRow("└ Organic", f.organicLandings, f.landings, true)}
      <tr><td colspan="3" style="border-bottom:1px solid #f1f5f9;padding:2px 0;"></td></tr>
      ${funnelRow("Tutorial puzzle shown", f.tutorialPuzzleShown, f.landings)}
      ${funnelRow("Tutorial first guess", f.tutorialFirstGuess, f.tutorialPuzzleShown || f.landings)}
      ${funnelRow("Tutorial won", f.tutorialWon, f.tutorialFirstGuess || 1)}
      ${funnelRow("Tutorial lost", f.tutorialLost, f.tutorialFirstGuess || 1)}
      ${funnelRow("Tutorial graduated", f.tutorialGraduated, f.tutorialPuzzleShown || 1)}
      <tr><td colspan="3" style="border-bottom:1px solid #f1f5f9;padding:2px 0;"></td></tr>
      ${funnelRow("Game started (daily)", f.gameStarted, f.landings)}
      ${funnelRow("First guess", f.firstGuess, f.gameStarted || f.landings)}
      ${funnelRow("Game won", f.gameWon, f.firstGuess || 1)}
      ${funnelRow("Game lost", f.gameLost, f.firstGuess || 1)}
      <tr><td colspan="3" style="border-bottom:1px solid #f1f5f9;padding:2px 0;"></td></tr>
      ${funnelRow("Shared result", f.shareCompleted, f.gameWon + f.gameLost || 1)}
      ${funnelRow("Joined leaderboard", f.leaderboardJoined, f.gameWon + f.gameLost || 1)}
      ${funnelRow("Enabled notifications", f.notificationEnabled, f.landings)}
    </table>
  </div>

  <!-- ============================================================ -->
  <!-- META ADS PERFORMANCE (NEW) -->
  <!-- ============================================================ -->
  <div style="background:#fff;border-radius:8px;padding:14px 16px;margin-bottom:16px;border:1px solid #e2e8f0;">
    <div style="font-size:13px;font-weight:600;color:#1e3a5f;margin-bottom:4px;">META ADS (cumulative)</div>
    <div style="font-size:11px;color:#94a3b8;margin-bottom:10px;">All active/paused variants — lifetime metrics</div>
    <table style="width:100%;font-size:13px;color:#334155;margin-bottom:12px;">
      <tr>
        <td style="padding:3px 0;">Total Spend</td>
        <td style="text-align:right;font-weight:700;color:#dc2626;">${ads.totalSpendStr}</td>
      </tr>
      <tr>
        <td style="padding:3px 0;">Impressions</td>
        <td style="text-align:right;font-weight:600;">${ads.totalImpressions.toLocaleString()}</td>
      </tr>
      <tr>
        <td style="padding:3px 0;">Clicks</td>
        <td style="text-align:right;font-weight:600;">${ads.totalClicks.toLocaleString()}</td>
      </tr>
      <tr>
        <td style="padding:3px 0;">CTR</td>
        <td style="text-align:right;">${ads.overallCTR}</td>
      </tr>
      <tr style="border-top:1px solid #e2e8f0;">
        <td style="padding:3px 0;">Paid landings (yesterday)</td>
        <td style="text-align:right;font-weight:600;">${ads.paidLandings}</td>
      </tr>
      <tr>
        <td style="padding:3px 0;">Played puzzle (paid)</td>
        <td style="text-align:right;font-weight:600;${ads.paidPlayed > 0 ? "color:#166534;" : "color:#dc2626;"}">${ads.paidPlayed}</td>
      </tr>
      <tr>
        <td style="padding:3px 0;">Converted (paid)</td>
        <td style="text-align:right;font-weight:600;${ads.paidConverted > 0 ? "color:#166534;" : "color:#dc2626;"}">${ads.paidConverted}</td>
      </tr>
      <tr>
        <td style="padding:3px 0;">CAC</td>
        <td style="text-align:right;font-weight:600;">${ads.cacStr}</td>
      </tr>
      <tr style="border-top:1px solid #e2e8f0;color:#64748b;">
        <td style="padding:3px 0;">Total paid landings (all-time)</td>
        <td style="text-align:right;">${totalPaidLandingsAllTime}</td>
      </tr>
    </table>

    ${
      ads.variants.length > 0
        ? `<div style="font-size:11px;font-weight:600;color:#64748b;margin-bottom:6px;text-transform:uppercase;">Per-Variant Breakdown</div>
    <div style="overflow-x:auto;">
    <table style="width:100%;border-collapse:collapse;font-size:12px;">
      <tr style="color:#94a3b8;font-size:10px;text-transform:uppercase;border-bottom:1px solid #e2e8f0;">
        <td style="padding:4px 2px;">Variant</td>
        <td style="padding:4px 2px;text-align:right;">Impr</td>
        <td style="padding:4px 2px;text-align:right;">Clk</td>
        <td style="padding:4px 2px;text-align:right;">CTR</td>
        <td style="padding:4px 2px;text-align:right;">Spend</td>
        <td style="padding:4px 2px;text-align:right;">Land</td>
        <td style="padding:4px 2px;text-align:right;">Play</td>
        <td style="padding:4px 2px;text-align:right;">Conv</td>
      </tr>
      ${variantRows}
    </table>
    </div>`
        : `<div style="font-size:13px;color:#94a3b8;font-style:italic;">No active ad variants</div>`
    }
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
