#!/usr/bin/env node
// Pulls aq_attributions + aq_variants from Supabase and analyzes the campaign funnel.

const SUPABASE_URL = "https://nfeeatcbxfkewgyfkqxh.supabase.co";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mZWVhdGNieGZrZXdneWZrcXhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDIwOTAsImV4cCI6MjA4NDQ3ODA5MH0.zM31HeA3gGcDFt7AvuwF6R968DVK_7u7aZyjNZMbN8Y";

async function q(table, params = "") {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${params}`;
  const res = await fetch(url, {
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
      Prefer: "count=exact",
    },
  });
  if (!res.ok) {
    console.error(`[${table}] ${res.status}: ${await res.text()}`);
    return [];
  }
  return res.json();
}

function groupBy(arr, key) {
  const out = {};
  for (const row of arr) {
    const k = row[key] ?? "(null)";
    out[k] ??= [];
    out[k].push(row);
  }
  return out;
}

function fmtPct(n, d) {
  if (!d) return "0.00%";
  return `${((n / d) * 100).toFixed(2)}%`;
}

(async () => {
  const attrs = await q("aq_attributions", "select=*&order=landed_at.desc&limit=2000");
  const variants = await q("aq_variants", "select=*&order=deployed_at.desc&limit=50");
  const experiments = await q("aq_experiments", "select=*&order=started_at.desc&limit=20");
  const events = await q("aq_events", "select=*&order=created_at.desc&limit=100").catch(() => []);

  console.log("=".repeat(70));
  console.log("AUTOACQUIRE CAMPAIGN ANALYSIS");
  console.log("=".repeat(70));

  // --- 1. Raw volume ---
  console.log(`\n[TOTALS]`);
  console.log(`  attributions (landings): ${attrs.length}`);
  console.log(`  variants (ads deployed): ${variants.length}`);
  console.log(`  experiments: ${experiments.length}`);
  console.log(`  events: ${events.length}`);

  if (attrs.length === 0) {
    console.log("\nNo attribution data. Exiting.");
    return;
  }

  // --- 2. Date range ---
  const dates = attrs.map((a) => new Date(a.landed_at)).sort((a, b) => a - b);
  console.log(`  first landing: ${dates[0].toISOString()}`);
  console.log(`  last  landing: ${dates[dates.length - 1].toISOString()}`);

  // --- 3. Source breakdown ---
  console.log(`\n[BY utm_source]`);
  const bySource = groupBy(attrs, "utm_source");
  for (const [src, rows] of Object.entries(bySource)) {
    console.log(`  ${src.padEnd(15)} landings=${rows.length}`);
  }

  // --- 4. Campaign funnel ---
  console.log(`\n[FUNNEL — all paid traffic]`);
  const total = attrs.length;
  const puzzlePlayed = attrs.filter((a) => a.puzzle_played_at).length;
  const converted = attrs.filter((a) => a.converted).length;
  const authSignup = attrs.filter((a) => a.auth_signed_up_at).length;
  const capiSent = attrs.filter((a) => a.capi_sent).length;
  console.log(`  landings         ${total}`);
  console.log(`  puzzle_played    ${puzzlePlayed}  (${fmtPct(puzzlePlayed, total)})`);
  console.log(`  converted        ${converted}  (${fmtPct(converted, total)})`);
  console.log(`  auth_signed_up   ${authSignup}  (${fmtPct(authSignup, total)})`);
  console.log(`  capi_sent        ${capiSent}  (${fmtPct(capiSent, total)})`);

  // --- 5. Per adset (utm_term) ---
  console.log(`\n[BY utm_term (adset_id)]`);
  const byAdset = groupBy(attrs, "utm_term");
  const adsetRows = Object.entries(byAdset).map(([k, rows]) => ({
    adset: k,
    landings: rows.length,
    puzzle: rows.filter((r) => r.puzzle_played_at).length,
    conv: rows.filter((r) => r.converted).length,
  }));
  adsetRows.sort((a, b) => b.landings - a.landings);
  console.log(`  adset_id              landings  puzzle  conv   CVR`);
  for (const r of adsetRows) {
    console.log(
      `  ${String(r.adset).padEnd(20)}  ${String(r.landings).padStart(8)}  ${String(r.puzzle).padStart(6)}  ${String(r.conv).padStart(4)}   ${fmtPct(r.conv, r.landings)}`,
    );
  }

  // --- 6. utm_content diagnosis ---
  console.log(`\n[BY utm_content] (should be per-ad_id; bug = literal PLACEHOLDER)`);
  const byContent = groupBy(attrs, "utm_content");
  for (const [k, rows] of Object.entries(byContent)) {
    console.log(`  ${String(k).padEnd(25)} ${rows.length}`);
  }

  // --- 7. Variants table (what the agent knows) ---
  console.log(`\n[VARIANTS in DB — top 10 recent]`);
  console.log(`  name                         status          imp    clk    CTR     subs  CAC₹   spend₹  db_budget₹`);
  for (const v of variants.slice(0, 10)) {
    const spend = ((v.total_spend_paise || 0) / 100).toFixed(0);
    const budget = ((v.daily_budget_paise || 0) / 100).toFixed(0);
    const cac = ((v.cac_paise || 0) / 100).toFixed(0);
    const ctr = (v.ctr || 0).toFixed(2);
    console.log(
      `  ${String(v.name || "").padEnd(28)} ${String(v.status || "").padEnd(15)} ${String(v.impressions || 0).padStart(6)} ${String(v.clicks || 0).padStart(6)} ${ctr.padStart(6)}% ${String(v.subscriptions || 0).padStart(5)} ${cac.padStart(5)} ${spend.padStart(7)} ${budget.padStart(10)}`,
    );
  }

  // --- 8. Cross-check: agent's subscriptions vs actual conversions ---
  console.log(`\n[CROSS-CHECK — agent's view vs reality]`);
  const variantSubs = variants.reduce((s, v) => s + (v.subscriptions || 0), 0);
  const variantSpend = variants.reduce((s, v) => s + (v.total_spend_paise || 0), 0);
  console.log(`  agent thinks: ${variantSubs} subs across all variants, spend=₹${(variantSpend / 100).toFixed(0)}`);
  console.log(`  reality:      ${converted} conversions in aq_attributions for paid traffic`);
  if (variantSubs === 0 && converted > 0) {
    console.log(`  >>> BUG CONFIRMED: agent blind to ${converted} real conversions`);
  }

  // --- 9. Today's pulse ---
  const today = new Date().toISOString().slice(0, 10);
  const todayRows = attrs.filter((a) => a.landed_at.startsWith(today));
  console.log(`\n[TODAY ${today}] landings=${todayRows.length}, conv=${todayRows.filter((r) => r.converted).length}`);
})();
