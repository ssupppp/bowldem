/**
 * seed-daily-leaderboard Edge Function
 * Triggered daily via pg_cron at 00:15 UTC (5:45 AM IST)
 *
 * Inserts 3-6 realistic seed entries into leaderboard_entries
 * so the daily leaderboard looks active for early visitors.
 * Entries are marked is_seed = true and excluded from analytics.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Puzzle epoch — must match client-side constant
const EPOCH_DATE = new Date("2026-01-15T00:00:00Z");

// Cricket-themed display names for seed entries
const SEED_NAMES = [
  "CricFan42",
  "Dhoni7",
  "GullyBowler",
  "SixHitter",
  "OffSpinner99",
  "CoverDrive",
  "YorkerKing",
  "SpinWizard",
  "BoundaryBoss",
  "StumpedYa",
  "Googly101",
  "SlipCordon",
  "NightWatch",
  "ThirdUmpire",
  "DuckOut",
  "FullToss",
  "LBW_Expert",
  "RunOut",
  "EdgedIt",
  "WicketMaiden",
];

/**
 * Get today's puzzle info using the same epoch logic as the client
 */
function getTodayPuzzleInfo(): { puzzleDate: string; puzzleNumber: number } {
  const now = new Date();
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const puzzleDate = today.toISOString().split("T")[0];
  const diffMs = today.getTime() - EPOCH_DATE.getTime();
  const puzzleNumber = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return { puzzleDate, puzzleNumber };
}

/**
 * Seeded random using a simple hash — deterministic per date
 * so re-invocations on the same day produce the same names
 */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/**
 * Weighted random guesses — mostly 2-4 (realistic winning distribution)
 */
function randomGuesses(rand: () => number, won: boolean): number {
  if (!won) return 5;
  const r = rand();
  if (r < 0.1) return 1; // 10% — lucky guess
  if (r < 0.4) return 2; // 30%
  if (r < 0.75) return 3; // 35%
  return 4; // 25%
}

// Main handler
Deno.serve(async (_req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { puzzleDate, puzzleNumber } = getTodayPuzzleInfo();

    console.log(
      `Seeding leaderboard for ${puzzleDate} (puzzle #${puzzleNumber})`
    );

    // Check if seeds already exist for today
    const { count } = await supabase
      .from("leaderboard_entries")
      .select("id", { count: "exact", head: true })
      .eq("puzzle_date", puzzleDate)
      .eq("is_seed", true);

    if (count && count > 0) {
      console.log(`Seeds already exist for ${puzzleDate} (${count} entries)`);
      return new Response(
        JSON.stringify({
          status: "skipped",
          reason: "already seeded",
          count,
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Determine number of seeds: 3-6
    const dateSeed = puzzleNumber * 31 + 7;
    const rand = seededRandom(dateSeed);
    const numSeeds = 3 + Math.floor(rand() * 4); // 3, 4, 5, or 6

    // Pick random names without replacement
    const shuffled = [...SEED_NAMES].sort(() => rand() - 0.5);
    const selectedNames = shuffled.slice(0, numSeeds);

    // Build seed entries with staggered timestamps (00:15 – 06:00 UTC)
    const baseTime = new Date(`${puzzleDate}T00:15:00Z`);
    const maxOffset = 5 * 60 + 45; // 5h45m in minutes (00:15 to 06:00)

    const entries = selectedNames.map((name, i) => {
      const won = rand() < 0.8; // 80% win rate
      const guesses = randomGuesses(rand, won);

      // Stagger timestamps across the window
      const minuteOffset = Math.floor(
        (maxOffset / numSeeds) * i + rand() * (maxOffset / numSeeds)
      );
      const createdAt = new Date(baseTime.getTime() + minuteOffset * 60 * 1000);

      return {
        display_name: name,
        device_id: `seed_${puzzleDate}_${name.toLowerCase()}`,
        puzzle_date: puzzleDate,
        puzzle_number: puzzleNumber,
        guesses_used: guesses,
        won,
        is_seed: true,
        created_at: createdAt.toISOString(),
      };
    });

    // Insert all seed entries
    const { error } = await supabase
      .from("leaderboard_entries")
      .insert(entries);

    if (error) {
      throw new Error(`Insert failed: ${error.message}`);
    }

    console.log(
      `Seeded ${entries.length} entries: ${entries.map((e) => `${e.display_name} (${e.won ? e.guesses_used : "L"})`).join(", ")}`
    );

    return new Response(
      JSON.stringify({
        status: "done",
        seeded: entries.length,
        entries: entries.map((e) => ({
          name: e.display_name,
          guesses: e.guesses_used,
          won: e.won,
          time: e.created_at,
        })),
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Seed error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
