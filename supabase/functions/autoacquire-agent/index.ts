/**
 * AutoAcquire Agent — Self-Improving Meta Ad Acquisition Loop
 *
 * Runs daily on cron. Fully autonomous:
 * 1. EVALUATE — Pull Meta Insights for active ads, update metrics
 * 2. DECIDE — Kill losers, promote winners, allocate budget
 * 3. GENERATE — Create new ad variants (copy + creative) via AI
 * 4. DEPLOY — Push new ads to Meta Marketing API
 * 5. LEARN — Log structured findings to learnings table
 *
 * Config lives in aq_strategy table. Human edits strategy, agent executes.
 *
 * Trigger: pg_cron daily at 06:00 UTC (11:30 AM IST)
 * Or invoke manually: POST /functions/v1/autoacquire-agent
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================================================
// ENV & CLIENTS
// ============================================================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const XAI_API_KEY = Deno.env.get("XAI_API_KEY"); // Grok — primary ad copy generator
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY"); // Gemini — fallback if Grok is down/out of credits
const META_ACCESS_TOKEN = Deno.env.get("META_ACCESS_TOKEN"); // Long-lived user token for Meta API
const META_GRAPH_API = "https://graph.facebook.com/v21.0";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ============================================================================
// TYPES
// ============================================================================

interface Strategy {
  budget: { daily_cap_paise: number; platform: string };
  goals: { primary_metric: string; target_cac_paise: number; min_impressions_before_judge: number; min_clicks_before_judge: number };
  cycle: { duration_days: number; max_concurrent_variants: number; early_kill_threshold: number; min_spend_before_kill_paise: number };
  allocation: { exploit_pct: number; explore_near_pct: number; explore_far_pct: number };
  brand: { voice: string; no_clickbait: boolean; product_name: string; url: string; tagline: string; player_count: number; puzzle_count: number };
  audiences: { primary: any; secondary: any };
  meta_account: { pixel_id: string | null; ad_account_id: string | null; page_id: string | null; system_user_token: string | null };
}

interface Variant {
  id: number;
  experiment_id: number;
  meta_ad_id: string | null;
  meta_adset_id: string | null;
  meta_creative_id: string | null;
  name: string;
  status: string;
  hook: string;
  body_text: string;
  headline: string;
  cta_type: string;
  budget_type: string;
  daily_budget_paise: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc_paise: number;
  total_spend_paise: number;
  subscriptions: number;
  frequency: number;
  parent_variant_id: number | null;
  mutation_type: string | null;
  image_url: string | null;
  image_prompt: string | null;
  meta_data: Record<string, any> | null;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

Deno.serve(async (req) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") return new Response("ok", { headers });

  // Allow dry_run mode via query param
  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dry_run") === "true";

  try {
    const log: string[] = [];
    const addLog = (msg: string) => {
      console.log(`[AutoAcquire] ${msg}`);
      log.push(msg);
    };

    addLog(`=== AutoAcquire Agent Cycle Start (dry_run=${dryRun}) ===`);

    // 1. Load strategy
    const strategy = await loadStrategy();
    addLog(`Strategy loaded. Budget: ₹${strategy.budget.daily_cap_paise / 100}/day`);

    // Check Meta account is configured — prefer env var for token (more secure than DB)
    const meta = strategy.meta_account;
    const metaToken = META_ACCESS_TOKEN || meta.system_user_token;
    if (!meta.ad_account_id || !metaToken || !meta.page_id) {
      addLog("ERROR: Meta account not configured. Set META_ACCESS_TOKEN env var + ad_account_id, page_id in aq_strategy.");
      return new Response(JSON.stringify({ success: false, log, error: "meta_not_configured" }), { status: 200, headers });
    }
    // Override strategy token with env var so downstream functions use it
    meta.system_user_token = metaToken;

    // Token preflight. If the long-lived user token has expired, every
    // downstream Meta call (insights, pause, create) silently fails — the
    // agent keeps running, writes useless rows, and you don't notice until
    // spend drifts or cron reports look empty. Fail loud here instead.
    const tokenCheck = await checkMetaToken(metaToken);
    if (!tokenCheck.valid) {
      addLog(`ERROR: Meta token invalid (${tokenCheck.reason}). Refresh required — cycle aborted.`);
      return new Response(
        JSON.stringify({ success: false, log, error: "meta_token_invalid", reason: tokenCheck.reason }),
        { status: 200, headers }
      );
    }
    if (tokenCheck.days_until_expiry !== null && tokenCheck.days_until_expiry < 14) {
      addLog(`WARN: Meta token expires in ${tokenCheck.days_until_expiry} days — refresh before it does.`);
    }

    // 2. ACTIVATE — check pending_review ads, activate approved ones
    if (!dryRun) {
      const activation = await activatePendingAds(meta);
      if (activation.activated > 0 || activation.rejected > 0 || activation.still_pending > 0) {
        addLog(`Activation: ${activation.activated} activated, ${activation.rejected} rejected, ${activation.still_pending} still pending`);
      }
    }

    // 3. Get current cycle
    const cycle = await getCurrentCycle(strategy);
    addLog(`Cycle #${cycle.cycle_number}, experiment: ${cycle.experiment?.id || "none"}`);

    // 4. EVALUATE — pull metrics from Meta for active variants
    const activeVariants = await getActiveVariants();
    addLog(`Active variants: ${activeVariants.length}`);

    if (activeVariants.length > 0) {
      await evaluateVariants(activeVariants, meta, dryRun);
      addLog("Metrics updated from Meta Insights API");

      // Refresh after update
      const updated = await getActiveVariants();

      // 4. DECIDE — kill losers, identify winners
      const decisions = await makeDecisions(updated, strategy, dryRun);
      addLog(`Decisions: ${decisions.killed.length} killed, ${decisions.winners.length} winners, ${decisions.promoted.length} promoted`);

      // 5. LEARN — extract findings from this cycle
      if (decisions.learnings.length > 0) {
        await saveLearnings(decisions.learnings, cycle.cycle_number);
        addLog(`Saved ${decisions.learnings.length} learnings`);
      }
    }

    // 6. GENERATE — create new variants if we have capacity
    const currentActive = await getActiveVariants();
    const slotsAvailable = strategy.cycle.max_concurrent_variants - currentActive.length;

    if (slotsAvailable > 0) {
      addLog(`${slotsAvailable} variant slots available — generating new ads`);

      // Load learnings for context
      const learnings = await loadLearnings();
      const winners = currentActive.filter((v) => v.status === "active" && v.ctr > 0);

      const newVariants = await generateVariants(slotsAvailable, strategy, learnings, winners, cycle);
      addLog(`Generated ${newVariants.length} new variants`);

      // 7. DEPLOY — push to Meta
      if (!dryRun) {
        for (const variant of newVariants) {
          await deployToMeta(variant, strategy, cycle);
          addLog(`Deployed: "${variant.headline}" (${variant.budget_type})`);
        }
      } else {
        for (const variant of newVariants) {
          addLog(`[DRY RUN] Would deploy: "${variant.headline}" — ${variant.hook}`);
        }
      }
    } else {
      addLog("All variant slots filled — no new ads needed this cycle");
    }

    // 8. Log cycle summary
    const summary = await buildCycleSummary(strategy);
    addLog(`Cycle summary: ${JSON.stringify(summary)}`);

    addLog("=== AutoAcquire Agent Cycle Complete ===");

    return new Response(JSON.stringify({ success: true, log, summary, dry_run: dryRun }), { status: 200, headers });
  } catch (error) {
    console.error("AutoAcquire agent error:", error);
    return new Response(JSON.stringify({ success: false, error: String(error) }), { status: 500, headers });
  }
});

// ============================================================================
// STRATEGY
// ============================================================================

async function loadStrategy(): Promise<Strategy> {
  const { data, error } = await supabase.from("aq_strategy").select("key, value");
  if (error) throw new Error(`Failed to load strategy: ${error.message}`);

  const strategy: any = {};
  for (const row of data || []) {
    strategy[row.key] = row.value;
  }
  return strategy as Strategy;
}

// ============================================================================
// CYCLE MANAGEMENT
// ============================================================================

async function getCurrentCycle(strategy: Strategy) {
  // Get the latest experiment
  const { data: latest } = await supabase
    .from("aq_experiments")
    .select("*")
    .order("cycle_number", { ascending: false })
    .limit(1)
    .single();

  if (!latest) {
    // First ever cycle — create cold start experiment
    const { data: experiment } = await supabase
      .from("aq_experiments")
      .insert([{
        cycle_number: 1,
        experiment_type: "cold_start",
        status: "running",
        config: { phase: "cold_start", note: "Initial 6-variant shotgun test" },
      }])
      .select()
      .single();

    return { cycle_number: 1, experiment: experiment, is_new: true };
  }

  // Check if current experiment has exceeded cycle duration
  const startedAt = new Date(latest.started_at);
  const now = new Date();
  const daysSinceStart = (now.getTime() - startedAt.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceStart >= strategy.cycle.duration_days && latest.status === "running") {
    // Complete current experiment, start new one
    await supabase
      .from("aq_experiments")
      .update({ status: "completed", evaluated_at: new Date().toISOString() })
      .eq("id", latest.id);

    const nextCycle = latest.cycle_number + 1;
    const { data: experiment } = await supabase
      .from("aq_experiments")
      .insert([{
        cycle_number: nextCycle,
        experiment_type: determineExperimentType(nextCycle),
        status: "running",
        config: { previous_cycle: latest.cycle_number },
      }])
      .select()
      .single();

    return { cycle_number: nextCycle, experiment: experiment, is_new: true };
  }

  return { cycle_number: latest.cycle_number, experiment: latest, is_new: false };
}

function determineExperimentType(cycleNumber: number): string {
  // Rotate experiment types: copy → creative → audience → repeat
  // With periodic wild cards
  if (cycleNumber <= 2) return "cold_start";
  if (cycleNumber % 7 === 0) return "explore_far"; // Wild card every 7 cycles
  const rotation = ["copy_test", "creative_test", "audience_test"];
  return rotation[(cycleNumber - 3) % rotation.length];
}

// ============================================================================
// EVALUATE — Pull metrics from Meta Insights API
// ============================================================================

async function getActiveVariants(): Promise<Variant[]> {
  const { data, error } = await supabase
    .from("aq_variants")
    .select("*")
    .in("status", ["active", "pending_review"])
    .order("created_at", { ascending: false });

  return (data || []) as Variant[];
}

async function evaluateVariants(variants: Variant[], meta: any, dryRun: boolean) {
  for (const variant of variants) {
    if (!variant.meta_ad_id) continue;

    try {
      // Pull insights from Meta
      const insightsUrl = `${META_GRAPH_API}/${variant.meta_ad_id}/insights?fields=impressions,clicks,ctr,cpc,cpm,spend,reach,frequency,actions&date_preset=maximum&access_token=${meta.system_user_token}`;

      const response = await fetch(insightsUrl);
      if (!response.ok) {
        console.warn(`Failed to get insights for ad ${variant.meta_ad_id}: ${response.status}`);
        continue;
      }

      const result = await response.json();
      const insights = result.data?.[0];
      if (!insights) continue;

      // Extract metrics
      const impressions = parseInt(insights.impressions || "0");
      const clicks = parseInt(insights.clicks || "0");
      const ctr = parseFloat(insights.ctr || "0");
      const cpcRaw = parseFloat(insights.cpc || "0");
      const cpc_paise = Math.round(cpcRaw * 100); // rupees → paise
      const cpmRaw = parseFloat(insights.cpm || "0");
      const cpm_paise = Math.round(cpmRaw * 100);
      const spendRaw = parseFloat(insights.spend || "0");
      const total_spend_paise = Math.round(spendRaw * 100);
      const reach = parseInt(insights.reach || "0");
      const frequency = parseFloat(insights.frequency || "0");

      // Parse Meta's `actions` array for Pixel-side Subscribe count.
      // This lets us cross-check Pixel vs CAPI vs aq_attributions and detect
      // attribution drift between the three sources.
      let pixelSubscribes = 0;
      if (Array.isArray(insights.actions)) {
        for (const a of insights.actions) {
          if (
            a.action_type === "subscribe" ||
            a.action_type === "offsite_conversion.fb_pixel_custom" ||
            a.action_type === "offsite_conversion.fb_pixel_subscribe"
          ) {
            pixelSubscribes += parseInt(a.value || "0");
          }
        }
      }

      // Count subscriptions from attribution table.
      // Match on utm_term (adset id) rather than utm_content (ad id) because:
      //   1. Design is 1 adset per variant, so adset id uniquely identifies the variant
      //   2. utm_content previously contained a literal "PLACEHOLDER_AD_ID" string
      //      (see link template construction below) which never matched anything
      const { count: subscriptions } = await supabase
        .from("aq_attributions")
        .select("*", { count: "exact", head: true })
        .eq("utm_term", variant.meta_adset_id)
        .eq("converted", true);

      const attributedSubs = subscriptions || 0;
      const cac_paise = attributedSubs > 0
        ? Math.round(total_spend_paise / attributedSubs)
        : 0;

      if (pixelSubscribes !== attributedSubs) {
        console.info(
          `[evaluate ${variant.meta_adset_id}] Pixel=${pixelSubscribes} vs aq_attributions=${attributedSubs} ` +
          `(delta=${pixelSubscribes - attributedSubs}) — investigate if persistent`
        );
      }

      // Update variant metrics
      if (!dryRun) {
        await supabase
          .from("aq_variants")
          .update({
            impressions,
            clicks,
            ctr,
            cpc_paise,
            cpm_paise,
            total_spend_paise,
            reach,
            frequency,
            subscriptions: attributedSubs,
            cac_paise,
          })
          .eq("id", variant.id);
      }
    } catch (e) {
      console.warn(`Error evaluating variant ${variant.id}:`, e);
    }
  }
}

// ============================================================================
// DECIDE — Kill losers, promote winners
// ============================================================================

interface DecisionResult {
  killed: Variant[];
  winners: Variant[];
  promoted: Variant[];
  learnings: any[];
}

/**
 * Per-variant funnel signal pulled live from aq_attributions. We join on
 * utm_term (adset id) — the 1:1 key for variants in this system. See the
 * attribution comments in evaluateVariants for why utm_content isn't used.
 */
async function getVariantSignal(
  variant: Variant
): Promise<{ landings: number; plays: number; subs: number }> {
  const ident = variant.meta_adset_id;
  if (!ident) return { landings: 0, plays: 0, subs: 0 };

  const [landingsRes, playsRes, subsRes] = await Promise.all([
    supabase.from("aq_attributions").select("id", { count: "exact", head: true }).eq("utm_term", ident),
    supabase.from("aq_attributions").select("id", { count: "exact", head: true }).eq("utm_term", ident).not("puzzle_played_at", "is", null),
    supabase.from("aq_attributions").select("id", { count: "exact", head: true }).eq("utm_term", ident).eq("converted", true),
  ]);

  return {
    landings: landingsRes.count || 0,
    plays: playsRes.count || 0,
    subs: subsRes.count || 0,
  };
}

/**
 * Tiered variant scoring. The recursion's whole worth depends on this — if
 * we rank by CTR alone (the old behavior), a clickbait hook with 0 plays
 * beats a mediocre hook with 5 conversions every single cycle.
 *
 *   Tier 1 (conversion signal):  score by inverse CAC, bounded.
 *   Tier 2 (engagement signal):  score by landing → play rate, bounded.
 *   Tier 3 (click signal only):  fall back to CTR × 10 (≈ old behavior).
 *
 * Tier separation is by constant offsets so a variant with even one
 * conversion always outranks any pure-CTR variant. Thresholds (20 landings,
 * 1 sub) are deliberately low for cold start — we need *any* real signal
 * before we start trusting it; statistical significance is aspirational at
 * this budget.
 */
function scoreVariant(v: Variant & { signal: { landings: number; plays: number; subs: number } }): number {
  const { landings, plays, subs } = v.signal;
  if (subs > 0) {
    const cacPaise = v.total_spend_paise / subs;
    // Lower CAC → higher score. 100000 = ₹1000 CAC → score 1. Clamped to 0–1000.
    return 20000 + Math.min(1000, 100000 / Math.max(1, cacPaise));
  }
  if (landings >= 20 && plays > 0) {
    return 10000 + 1000 * (plays / landings);
  }
  return (v.ctr || 0) * 10;
}

async function makeDecisions(variants: Variant[], strategy: Strategy, dryRun: boolean): Promise<DecisionResult> {
  const result: DecisionResult = { killed: [], winners: [], promoted: [], learnings: [] };

  if (variants.length < 2) return result;

  // Enrich every active variant with fresh attribution signal. This is N DB
  // round-trips per cycle but N <= max_concurrent_variants (4), so cost is
  // trivial compared to the Meta API calls we already make.
  const enriched = await Promise.all(
    variants.map(async (v) => ({ ...v, signal: await getVariantSignal(v) }))
  );

  const scored = enriched
    .map((v) => ({ ...v, score: scoreVariant(v) }))
    .sort((a, b) => b.score - a.score);
  const leader = scored[0];
  const leaderTier =
    leader.signal.subs > 0 ? "cac" : leader.signal.landings >= 20 && leader.signal.plays > 0 ? "play_rate" : "ctr";

  for (const variant of scored) {
    // Skip leader
    if (variant.id === leader.id) {
      result.winners.push(variant);
      continue;
    }

    // Only judge if minimum spend + impressions met. Without these guards
    // the kill threshold fires on variants that just haven't had a chance.
    if (variant.total_spend_paise < strategy.cycle.min_spend_before_kill_paise) continue;
    if (variant.impressions < strategy.goals.min_impressions_before_judge) continue;

    // Kill if score is below threshold relative to leader. Threshold is
    // strategy.cycle.early_kill_threshold (default 0.5 = kill if <50% of
    // leader's score). Works across all three tiers since score space is
    // ordered by tier.
    if (leader.score > 0 && variant.score / leader.score < strategy.cycle.early_kill_threshold) {
      result.killed.push(variant);

      if (!dryRun) {
        // Pause BOTH ad and ad set on Meta. Leaving the ad set active after
        // the ad is paused lets Meta auto-allocate spend to whatever remaining
        // ads exist in the set (default behavior). Kill at the set level too.
        const token = strategy.meta_account.system_user_token!;
        try {
          if (variant.meta_ad_id) await metaApiPost(variant.meta_ad_id, { status: "PAUSED" }, token);
        } catch (e) {
          console.warn(`Failed to pause ad ${variant.meta_ad_id}:`, e);
        }
        try {
          if (variant.meta_adset_id) await metaApiPost(variant.meta_adset_id, { status: "PAUSED" }, token);
        } catch (e) {
          console.warn(`Failed to pause adset ${variant.meta_adset_id}:`, e);
        }

        await supabase
          .from("aq_variants")
          .update({ status: "killed", killed_at: new Date().toISOString() })
          .eq("id", variant.id);
      }

      // Record a learning — dimension reflects which signal drove the kill,
      // so future cycles can bias generation toward the right dimension.
      if (leader.hook !== variant.hook) {
        const winner_cac = leader.signal.subs > 0 ? leader.total_spend_paise / leader.signal.subs : null;
        const loser_cac = variant.signal.subs > 0 ? variant.total_spend_paise / variant.signal.subs : null;
        result.learnings.push({
          category: "copy",
          dimension: leaderTier === "cac" ? "conversion" : leaderTier === "play_rate" ? "engagement" : "hook",
          finding: leaderTier === "cac"
            ? `Winner CAC ₹${Math.round((winner_cac || 0) / 100)} vs loser ₹${loser_cac ? Math.round(loser_cac / 100) : "∞"} — hook "${leader.hook?.slice(0, 50)}..." converts, "${variant.hook?.slice(0, 50)}..." doesn't.`
            : leaderTier === "play_rate"
            ? `Winner play rate ${(leader.signal.plays / Math.max(1, leader.signal.landings) * 100).toFixed(1)}% vs loser ${(variant.signal.plays / Math.max(1, variant.signal.landings) * 100).toFixed(1)}% — hook "${leader.hook?.slice(0, 50)}..." drives engaged clicks, "${variant.hook?.slice(0, 50)}..." drives bounces.`
            : `Hook "${leader.hook?.slice(0, 50)}..." outperformed "${variant.hook?.slice(0, 50)}..." on CTR — ${leader.ctr.toFixed(2)}% vs ${variant.ctr.toFixed(2)}%. (No conversion data yet.)`,
          confidence: leaderTier !== "ctr" ? "high" : variant.impressions > 2000 ? "medium" : "low",
          evidence: {
            winner_id: leader.id,
            loser_id: variant.id,
            tier: leaderTier,
            winner_score: leader.score,
            loser_score: variant.score,
            winner_signal: leader.signal,
            loser_signal: variant.signal,
            winner_ctr: leader.ctr,
            loser_ctr: variant.ctr,
          },
          implication: `Prefer hook style similar to: "${leader.hook?.slice(0, 80)}"`,
        });
      }
    }
  }

  // Check for creative fatigue on leader (frequency > 3).
  if (leader.frequency > 3) {
    result.learnings.push({
      category: "audience",
      dimension: "fatigue",
      finding: `Ad "${leader.name}" showing fatigue — frequency ${leader.frequency.toFixed(1)}. Consider rotating creative.`,
      confidence: "high",
      evidence: { variant_id: leader.id, frequency: leader.frequency, ctr: leader.ctr },
      implication: "Generate fresh mutations of this ad's winning elements",
    });
  }

  return result;
}

// ============================================================================
// GENERATE — Create new ad variants via AI (Grok)
// ============================================================================

// Meta's minimum daily budget for INR ad sets is ~₹93 (9300 paise). We use
// 12500 paise (₹125) to leave margin and avoid rejection on edge-case pacing.
// All allocation math must respect this floor — Meta silently overrides
// anything below it and the agent's internal budget accounting drifts from
// actual spend if we don't apply the floor at allocation time.
const META_MIN_BUDGET_PAISE = 12500;

function floorBudget(paise: number): number {
  return Math.max(Math.round(paise), META_MIN_BUDGET_PAISE);
}

async function generateVariants(
  count: number,
  strategy: Strategy,
  learnings: any[],
  winners: Variant[],
  cycle: any
): Promise<any[]> {
  const variants: any[] = [];

  // Determine budget split
  const dailyBudget = strategy.budget.daily_cap_paise;
  const alloc = strategy.allocation;

  // Determine how many of each type to create
  let exploitCount = 0;
  let exploreNearCount = 0;
  let exploreFarCount = 0;

  if (winners.length === 0 || cycle.cycle_number <= 2) {
    // Cold start — all explore_far
    exploreFarCount = count;
  } else {
    exploitCount = Math.max(0, Math.round(count * alloc.exploit_pct / 100));
    exploreNearCount = Math.max(0, Math.round(count * alloc.explore_near_pct / 100));
    exploreFarCount = Math.max(1, count - exploitCount - exploreNearCount);
  }

  // Generate explore_far (wild card) variants via AI
  for (let i = 0; i < exploreFarCount; i++) {
    const variant = await generateAdCopy(strategy, learnings, null, "explore_far");
    variant.daily_budget_paise = floorBudget(dailyBudget * alloc.explore_far_pct / 100 / Math.max(1, exploreFarCount));
    variants.push(variant);
  }

  // Generate explore_near (mutations of winners)
  for (let i = 0; i < exploreNearCount && i < winners.length; i++) {
    const parent = winners[i % winners.length];
    const variant = await generateAdCopy(strategy, learnings, parent, "explore_near");
    variant.parent_variant_id = parent.id;
    variant.daily_budget_paise = floorBudget(dailyBudget * alloc.explore_near_pct / 100 / Math.max(1, exploreNearCount));
    variants.push(variant);
  }

  // Exploit — clone winners with fresh budget. Carry the creative assets
  // (image_url, image_hash, video_id, thumbnail_url) forward from the parent
  // so a winning video ad gets reused verbatim instead of silently dropping
  // back to text-only on clone.
  for (let i = 0; i < exploitCount && i < winners.length; i++) {
    const parent = winners[i % winners.length];
    const parentMeta = parent.meta_data || {};
    const variant = {
      name: `Exploit: ${parent.name} (cycle ${cycle.cycle_number})`,
      hook: parent.hook,
      body_text: parent.body_text,
      headline: parent.headline,
      cta_type: parent.cta_type,
      budget_type: "exploit",
      parent_variant_id: parent.id,
      mutation_type: null,
      daily_budget_paise: floorBudget(dailyBudget * alloc.exploit_pct / 100 / Math.max(1, exploitCount)),
      targeting: strategy.audiences.primary,
      image_url: parent.image_url,
      image_prompt: parent.image_prompt,
      image_hash: parentMeta.image_hash || null,
      video_id: parentMeta.video_id || null,
      thumbnail_url: parentMeta.thumbnail_url || null,
    };
    variants.push(variant);
  }

  // Hard budget cap: if post-floor total exceeds daily_cap_paise, trim from
  // the end (lowest priority = explore_far, since we generate in explore_far
  // → explore_near → exploit order). This protects the wallet when Meta's
  // minimum-budget floor collides with a low daily cap — previous behavior
  // was to warn-and-continue, which could silently 2× spend if the cap was
  // set loosely. Cold-start still gets at least one variant.
  let totalAllocated = variants.reduce((s, v) => s + (v.daily_budget_paise || 0), 0);
  while (totalAllocated > dailyBudget && variants.length > 1) {
    const dropped = variants.pop()!;
    totalAllocated -= dropped.daily_budget_paise || 0;
    console.warn(
      `[budget] Dropped variant "${dropped.name}" (${dropped.budget_type}) — post-floor total would exceed daily_cap. ` +
      `Consider lowering max_concurrent_variants or raising daily_cap_paise.`
    );
  }
  if (totalAllocated > dailyBudget) {
    console.warn(
      `[budget] Even a single variant at Meta floor (${variants[0]?.daily_budget_paise} paise) exceeds daily_cap ${dailyBudget}. ` +
      `Shipping it anyway so cold-start isn't blocked — raise the cap to stop this warning.`
    );
  }

  return variants;
}

async function generateAdCopy(
  strategy: Strategy,
  learnings: any[],
  parent: Variant | null,
  budgetType: string
): Promise<any> {
  if (!XAI_API_KEY && !GEMINI_API_KEY) {
    // Neither provider configured — only path left is template fallback.
    // That's degenerate (random hook/body/headline combinations with no
    // learnings bias) so log it loudly enough to catch during cycle review.
    console.warn("[generate] No XAI_API_KEY or GEMINI_API_KEY set — using template fallback. Recursion will degenerate.");
    return generateTemplateCopy(strategy, parent, budgetType);
  }

  const brand = strategy.brand;
  const learningsSummary = learnings
    .filter((l) => l.confidence !== "low")
    .slice(0, 10)
    .map((l) => `- ${l.finding}`)
    .join("\n");

  const parentContext = parent
    ? `\nMUTATE this winning ad (change ONE element — hook, value prop, or tone):\n  Hook: "${parent.hook}"\n  Body: "${parent.body_text}"\n  Headline: "${parent.headline}"\n`
    : "\nCreate a FRESH concept — different angle from anything tried before.";

  const mutationDimension = parent
    ? ["hook", "body", "tone", "value_prop", "cta"][Math.floor(Math.random() * 5)]
    : null;

  const prompt = `You are an expert Meta Ads copywriter for ${brand.product_name}, a daily cricket puzzle game.

PRODUCT: ${brand.product_name} — ${brand.tagline}
URL: ${brand.url}
STATS: ${brand.player_count} players, ${brand.puzzle_count} puzzles (T20 WC + ODI)
VOICE: ${brand.voice}
${brand.no_clickbait ? "RULE: No clickbait, exaggeration, or false claims." : ""}

LEARNINGS FROM PAST ADS:
${learningsSummary || "No learnings yet — this is a fresh start."}
${parentContext}
${mutationDimension ? `INSTRUCTION: Specifically vary the ${mutationDimension} while keeping other elements similar.` : ""}

Generate ONE Meta ad. Return ONLY valid JSON:
{
  "hook": "first line that grabs attention (under 100 chars)",
  "body_text": "2-3 sentences expanding on the hook. Include a reason to click. Under 200 chars.",
  "headline": "short punchy headline for the ad card (under 27 chars)",
  "name": "internal name for this variant (short, descriptive)"
}`;

  // Provider chain: Grok (primary) → Gemini (fallback) → template.
  // Grok was the original generator; newsletter moved to Gemini when Grok
  // credits ran out. Same thing can happen here silently — the old code
  // went straight from Grok failure to random templates, torching the
  // learnings signal. This chain keeps AI generation going as long as any
  // provider works.
  const providers: Array<{ name: string; run: () => Promise<string> }> = [];
  if (XAI_API_KEY) providers.push({ name: "grok", run: () => callGrok(prompt) });
  if (GEMINI_API_KEY) providers.push({ name: "gemini", run: () => callGemini(prompt) });

  for (const provider of providers) {
    try {
      const content = await provider.run();
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error(`No JSON in ${provider.name} response`);

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        name: parsed.name || `${budgetType}_cycle_${Date.now()}`,
        hook: parsed.hook,
        body_text: parsed.body_text,
        headline: parsed.headline?.slice(0, 27),
        cta_type: "LEARN_MORE",
        budget_type: budgetType,
        mutation_type: mutationDimension,
        targeting: strategy.audiences.primary,
      };
    } catch (e) {
      console.warn(`[generate] ${provider.name} failed, trying next:`, e);
    }
  }

  console.warn("[generate] All AI providers failed — falling back to template.");
  return generateTemplateCopy(strategy, parent, budgetType);
}

async function callGrok(prompt: string): Promise<string> {
  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${XAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "grok-3-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      max_tokens: 300,
    }),
  });
  if (!response.ok) throw new Error(`Grok HTTP ${response.status}`);
  const result = await response.json();
  return result.choices?.[0]?.message?.content || "";
}

async function callGemini(prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.8, maxOutputTokens: 300 },
    }),
  });
  if (!response.ok) throw new Error(`Gemini HTTP ${response.status}`);
  const result = await response.json();
  return result.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

/**
 * Template-based fallback when AI is unavailable
 */
function generateTemplateCopy(strategy: Strategy, parent: Variant | null, budgetType: string): any {
  const hooks = [
    "Can you name this bowler from 3 clues?",
    "97% of cricket fans can't solve this",
    "Your daily cricket brain teaser is live",
    `${strategy.brand.player_count} players. Can you beat them?`,
    "3 clues. 1 bowler. Can you guess?",
    "Only true cricket nerds get this right",
    "Remember the spell that changed cricket history?",
    "Think you know your cricket? Prove it.",
  ];

  const bodies = [
    "A new puzzle drops every day. Guess the Man of the Match from venue and scorecard clues.",
    "Test your cricket memory with this Wordle-style puzzle. Free, daily, addictive.",
    "From T20 World Cup to ODI classics — how well do you really know cricket?",
    "One match. Four clues. Can you find the MOTM before your guesses run out?",
  ];

  const headlines = [
    "Play Bowldem Free",
    "Daily Cricket Puzzle",
    "Guess the MOTM",
    "Cricket Nerds Only",
    "Test Your Knowledge",
  ];

  const i = Math.floor(Math.random() * hooks.length);
  const j = Math.floor(Math.random() * bodies.length);
  const k = Math.floor(Math.random() * headlines.length);

  return {
    name: `template_${budgetType}_${Date.now()}`,
    hook: parent?.hook || hooks[i],
    body_text: parent?.body_text || bodies[j],
    headline: parent?.headline || headlines[k],
    cta_type: "LEARN_MORE",
    budget_type: budgetType,
    mutation_type: parent ? "template_variation" : null,
    targeting: strategy.audiences.primary,
  };
}

// ============================================================================
// DEPLOY — Push ads to Meta Marketing API
// ============================================================================

async function deployToMeta(variant: any, strategy: Strategy, cycle: any) {
  const meta = strategy.meta_account;
  const token = meta.system_user_token!;
  const adAccountId = meta.ad_account_id!;
  const pageId = meta.page_id!;

  try {
    // 1. Ensure campaign exists (one campaign for all AutoAcquire ads)
    const campaignId = await ensureCampaign(adAccountId, token, strategy);

    // 2. Create ad set with targeting + budget
    // variant.daily_budget_paise is already floored at allocation time
    // (see generateVariants / floorBudget). Use it directly.
    const dailyBudgetPaise = variant.daily_budget_paise;

    // Translate strategy.audiences interests (array of strings like "cricket"
    // or objects with {id, name}) into Meta's flexible_spec. If the strategy
    // seeds only string names, Meta ignores them silently — which is what was
    // happening before this fix. Send them as interest objects so the API
    // validates and applies them. Only accept object form with a Meta-issued
    // id; string-only interests are dropped with a warning.
    const rawInterests = Array.isArray(variant.targeting?.interests) ? variant.targeting.interests : [];
    const interestObjects = rawInterests
      .map((i: any) => (typeof i === "object" && i.id ? { id: String(i.id), name: i.name } : null))
      .filter(Boolean);
    if (rawInterests.length > 0 && interestObjects.length === 0) {
      console.warn(
        `[targeting] variant "${variant.name}" has interests but none are Meta-resolvable objects — running broad. ` +
        `Strategy seeded strings like "cricket"; resolve these to {id, name} via /search?type=adinterest in Meta.`
      );
    }

    const targetingPayload: any = {
      geo_locations: { countries: variant.targeting?.geo || ["IN"] },
      age_min: variant.targeting?.age_min || 18,
      age_max: variant.targeting?.age_max || 44,
      publisher_platforms: ["facebook", "instagram"],
      targeting_automation: { advantage_audience: 0 },
    };
    if (interestObjects.length > 0) {
      targetingPayload.flexible_spec = [{ interests: interestObjects }];
    }

    // optimization_goal is strategy-configurable. Default stays LINK_CLICKS
    // for compatibility with cold-start; once puzzle_played signal is stable
    // and Meta has a custom conversion registered for it, flip this to
    // OFFSITE_CONVERSIONS in strategy.goals to let Meta ML optimize mid-funnel.
    const optimizationGoal = strategy.goals?.optimization_goal || "LINK_CLICKS";

    const adSetData = {
      name: `AQ_${cycle.cycle_number}_${variant.budget_type}_${Date.now()}`,
      campaign_id: campaignId,
      billing_event: "IMPRESSIONS",
      optimization_goal: optimizationGoal,
      bid_strategy: "LOWEST_COST_WITHOUT_CAP",
      daily_budget: dailyBudgetPaise,
      targeting: JSON.stringify(targetingPayload),
      status: "PAUSED",
      start_time: new Date().toISOString(),
    };

    const adSet = await metaApiPost(`act_${adAccountId}/adsets`, adSetData, token);
    const adSetId = adSet.id;

    // 3. Create ad creative — branch by asset type.
    //
    // Attribution: utm_term = adset id (1:1 with variant). utm_content is
    // omitted — Meta won't interpolate the ad id into the URL at creation,
    // and a literal placeholder breaks the evaluator's attribution query.
    //
    // Asset precedence (until the video pipeline ships, all variants fall to
    // the last case — text-only link ads):
    //   1. variant.video_id       → video_data (feed + reels). Meta requires
    //                                image_url as the thumbnail fallback.
    //   2. variant.image_hash     → link_data + image_hash (single-image ad).
    //   3. text-only              → link_data alone (current behavior).
    //
    // Video is by far the highest-leverage upgrade per the India CPI data;
    // treat the first two branches as plumbing ready for the creative
    // pipeline. See bowldem-autoacquire.md backlog item B for the asset spec.
    const landingUrl = `${strategy.brand.url}?utm_source=meta&utm_medium=cpc&utm_campaign=${campaignId}&utm_term=${adSetId}`;
    const storySpec: any = { page_id: pageId };
    const cta = { type: variant.cta_type || "LEARN_MORE", value: { link: landingUrl } };

    if (variant.video_id) {
      storySpec.video_data = {
        video_id: variant.video_id,
        title: variant.headline,
        message: `${variant.hook}\n\n${variant.body_text}`,
        call_to_action: cta,
        // image_url is the thumbnail frame shown while the video loads.
        // Meta requires it for every video creative.
        image_url: variant.thumbnail_url || undefined,
      };
    } else if (variant.image_hash) {
      storySpec.link_data = {
        link: landingUrl,
        message: `${variant.hook}\n\n${variant.body_text}`,
        name: variant.headline,
        image_hash: variant.image_hash,
        call_to_action: { type: variant.cta_type || "LEARN_MORE" },
      };
    } else {
      storySpec.link_data = {
        link: landingUrl,
        message: `${variant.hook}\n\n${variant.body_text}`,
        name: variant.headline,
        call_to_action: { type: variant.cta_type || "LEARN_MORE" },
      };
    }

    const creativeData = {
      name: `AQ_creative_${variant.name}`,
      object_story_spec: JSON.stringify(storySpec),
    };

    const creative = await metaApiPost(`act_${adAccountId}/adcreatives`, creativeData, token);

    // 4. Create the ad
    const adData = {
      name: variant.name,
      adset_id: adSetId,
      creative: JSON.stringify({ creative_id: creative.id }),
      status: "PAUSED",
    };

    const ad = await metaApiPost(`act_${adAccountId}/ads`, adData, token);

    // 5. Creative attribution relies on utm_term (adset id) — see comment above.

    // 6. Save variant to DB with Meta IDs. image_url/image_prompt live in
    // dedicated columns; video_id and thumbnail_url are stashed in meta_data
    // JSONB (no column for them yet — video pipeline isn't built).
    await supabase.from("aq_variants").insert([{
      experiment_id: cycle.experiment?.id,
      meta_ad_id: ad.id,
      meta_adset_id: adSetId,
      meta_creative_id: creative.id,
      name: variant.name,
      status: "pending_review",
      hook: variant.hook,
      body_text: variant.body_text,
      headline: variant.headline,
      cta_type: variant.cta_type,
      budget_type: variant.budget_type,
      daily_budget_paise: variant.daily_budget_paise,
      parent_variant_id: variant.parent_variant_id || null,
      mutation_type: variant.mutation_type || null,
      targeting: variant.targeting,
      image_url: variant.image_url || null,
      image_prompt: variant.image_prompt || null,
      deployed_at: new Date().toISOString(),
      meta_data: {
        video_id: variant.video_id || null,
        thumbnail_url: variant.thumbnail_url || null,
        image_hash: variant.image_hash || null,
      },
    }]);

    // 7. Schedule activation check (the ad needs to pass review first)
    // Next cycle run will check pending_review ads and activate approved ones

  } catch (e) {
    console.error(`Failed to deploy variant "${variant.name}":`, e);
    // Save as draft so we can retry
    await supabase.from("aq_variants").insert([{
      experiment_id: cycle.experiment?.id,
      name: variant.name,
      status: "draft",
      hook: variant.hook,
      body_text: variant.body_text,
      headline: variant.headline,
      cta_type: variant.cta_type,
      budget_type: variant.budget_type,
      daily_budget_paise: variant.daily_budget_paise,
      parent_variant_id: variant.parent_variant_id || null,
      mutation_type: variant.mutation_type || null,
      targeting: variant.targeting,
      meta_data: { deploy_error: String(e) },
    }]);
  }
}

async function ensureCampaign(adAccountId: string, token: string, strategy: Strategy): Promise<string> {
  // Pick the most recent active campaign. maybeSingle tolerates zero rows;
  // ordering by created_at handles the case where a prior test left multiple
  // active rows (the old .single() would throw on that — silently bricking
  // deploy). If multiple exist, we use the newest; older rows should be
  // cleaned up manually but they're harmless here.
  const { data: existing } = await supabase
    .from("aq_campaigns")
    .select("meta_campaign_id, created_at")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.meta_campaign_id) return existing.meta_campaign_id;

  // Create a new campaign on Meta
  const campaignData = {
    name: `Bowldem AutoAcquire ${new Date().toISOString().slice(0, 10)}`,
    objective: "OUTCOME_TRAFFIC",
    status: "PAUSED",
    special_ad_categories: JSON.stringify([]),
    is_adset_budget_sharing_enabled: "false",
  };

  const campaign = await metaApiPost(`act_${adAccountId}/campaigns`, campaignData, token);

  // Save locally
  await supabase.from("aq_campaigns").insert([{
    meta_campaign_id: campaign.id,
    name: campaignData.name,
    objective: campaignData.objective,
    status: "active",
    daily_budget_paise: strategy.budget.daily_cap_paise,
    deployed_at: new Date().toISOString(),
  }]);

  return campaign.id;
}

// ============================================================================
// ACTIVATE — Check pending_review ads and activate approved ones
// ============================================================================

async function activatePendingAds(meta: any): Promise<{ activated: number; rejected: number; still_pending: number }> {
  const result = { activated: 0, rejected: 0, still_pending: 0 };

  const { data: pending } = await supabase
    .from("aq_variants")
    .select("id, meta_ad_id, meta_adset_id, experiment_id")
    .eq("status", "pending_review");

  if (!pending || pending.length === 0) return result;

  // Ensure campaign is active on Meta (it's created PAUSED)
  const { data: campaign } = await supabase
    .from("aq_campaigns")
    .select("meta_campaign_id")
    .eq("status", "active")
    .limit(1)
    .single();

  if (campaign?.meta_campaign_id) {
    try {
      await metaApiPost(campaign.meta_campaign_id, { status: "ACTIVE" }, meta.system_user_token);
    } catch (e) {
      console.warn("Failed to activate campaign:", e);
    }
  }

  for (const ad of pending) {
    if (!ad.meta_ad_id) continue;

    try {
      const adStatus = await metaApiGet(ad.meta_ad_id, "effective_status", meta.system_user_token);
      const status = adStatus.effective_status;

      // PAUSED = review passed (we created it paused), ACTIVE = already running
      // IN_PROCESS = still being reviewed by Meta
      // PENDING_REVIEW = waiting for review
      if (status === "PAUSED" || status === "ACTIVE") {
        // Activate ad + ad set
        await metaApiPost(ad.meta_ad_id, { status: "ACTIVE" }, meta.system_user_token);
        if (ad.meta_adset_id) {
          await metaApiPost(ad.meta_adset_id, { status: "ACTIVE" }, meta.system_user_token);
        }
        await supabase.from("aq_variants").update({ status: "active" }).eq("id", ad.id);
        result.activated++;
      } else if (status === "DISAPPROVED" || status === "WITH_ISSUES") {
        await supabase.from("aq_variants").update({
          status: "killed",
          killed_at: new Date().toISOString(),
          meta_data: { rejection_reason: status },
        }).eq("id", ad.id);
        result.rejected++;
      } else {
        // IN_PROCESS, PENDING_REVIEW, etc — still waiting
        result.still_pending++;
      }
    } catch (e) {
      console.warn(`Failed to check ad ${ad.meta_ad_id}:`, e);
      result.still_pending++;
    }
  }

  return result;
}

// ============================================================================
// LEARNINGS
// ============================================================================

async function loadLearnings(): Promise<any[]> {
  const { data } = await supabase
    .from("aq_learnings")
    .select("*")
    .is("superseded_by", null)
    .order("created_at", { ascending: false })
    .limit(20);

  return data || [];
}

async function saveLearnings(learnings: any[], cycleNumber: number) {
  const rows = learnings.map((l) => ({
    cycle_number: cycleNumber,
    category: l.category,
    dimension: l.dimension,
    finding: l.finding,
    confidence: l.confidence,
    evidence: l.evidence,
    implication: l.implication,
  }));

  await supabase.from("aq_learnings").insert(rows);
}

// ============================================================================
// CYCLE SUMMARY
// ============================================================================

async function buildCycleSummary(strategy: Strategy) {
  const { data: variants } = await supabase
    .from("aq_variants")
    .select("status, impressions, clicks, ctr, total_spend_paise, subscriptions")
    .in("status", ["active", "killed", "winner"]);

  const active = (variants || []).filter((v) => v.status === "active");
  const totalSpend = (variants || []).reduce((s, v) => s + (v.total_spend_paise || 0), 0);
  const totalClicks = (variants || []).reduce((s, v) => s + (v.clicks || 0), 0);
  const totalSubscriptions = (variants || []).reduce((s, v) => s + (v.subscriptions || 0), 0);

  return {
    active_variants: active.length,
    total_spend: `₹${(totalSpend / 100).toFixed(0)}`,
    total_clicks: totalClicks,
    total_subscriptions: totalSubscriptions,
    avg_ctr: active.length > 0
      ? (active.reduce((s, v) => s + (v.ctr || 0), 0) / active.length).toFixed(2) + "%"
      : "N/A",
    cac: totalSubscriptions > 0
      ? `₹${(totalSpend / 100 / totalSubscriptions).toFixed(0)}`
      : "N/A",
  };
}

// ============================================================================
// META API HELPERS
// ============================================================================

async function metaApiPost(endpoint: string, data: any, token: string): Promise<any> {
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${META_GRAPH_API}/${endpoint}`;

  const formData = new URLSearchParams();
  formData.append("access_token", token);
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  }

  const response = await fetch(url, {
    method: "POST",
    body: formData,
  });

  const result = await response.json();

  if (result.error) {
    throw new Error(`Meta API error: ${result.error.message} (code: ${result.error.code})`);
  }

  return result;
}

async function metaApiGet(objectId: string, fields: string, token: string): Promise<any> {
  const url = `${META_GRAPH_API}/${objectId}?fields=${fields}&access_token=${token}`;
  const response = await fetch(url);
  return response.json();
}

/**
 * Probe the Meta token before any real work. Uses /debug_token on the Graph
 * API — cheap, doesn't count toward ad-creation rate limits, and returns a
 * typed expiry we can surface as a warning before it bites.
 */
async function checkMetaToken(
  token: string
): Promise<{ valid: boolean; reason?: string; days_until_expiry: number | null }> {
  try {
    const url = `${META_GRAPH_API}/debug_token?input_token=${token}&access_token=${token}`;
    const response = await fetch(url);
    const result = await response.json();

    if (result.error) return { valid: false, reason: result.error.message, days_until_expiry: null };

    const data = result.data;
    if (!data) return { valid: false, reason: "no_data", days_until_expiry: null };
    if (data.is_valid === false) return { valid: false, reason: data.error?.message || "not_valid", days_until_expiry: null };

    // expires_at = 0 means "never expires" (System User tokens). Positive value
    // is a unix timestamp.
    const expiresAt = typeof data.expires_at === "number" ? data.expires_at : 0;
    let daysUntil: number | null = null;
    if (expiresAt > 0) {
      daysUntil = Math.round((expiresAt * 1000 - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysUntil <= 0) return { valid: false, reason: "expired", days_until_expiry: daysUntil };
    }
    return { valid: true, days_until_expiry: daysUntil };
  } catch (e) {
    return { valid: false, reason: `probe_failed: ${e}`, days_until_expiry: null };
  }
}
