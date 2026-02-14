# Building Buldim: Passion, Traffic Jams, and the Art of Chiseling a Game

## The Passion

I've been thinking about this game constantly. Not just when I'm at my desk — in traffic jams, day in day out, grappling with the same problem: how do I make this game engaging?

The problem at hand was the feedback system. It needed to be cracked, and it needed to be cracked with high certainty of data. Every version I built, something was off. The clues didn't click. The guesses didn't drive you forward. The payoff wasn't there.

And then, stuck in a jam one day, the current system hit me. I couldn't wait to get back on the game after that.

That's the thing about building something you care about. The tool doesn't solve the problem. You solve the problem — in your head, away from the screen, turning it over and over until it breaks open. The tool is what you pick up after.

## The Chiseling

Michelangelo supposedly said the sculpture is already inside the stone. You just chip away everything that isn't it. That's what building this game has felt like.

I started on May 23, 2025 — an empty Replit scaffold. By July 7, I had a working game. Autocomplete input, five guesses, four clues. You type a cricketer's name, pick from the suggestions, and the game tells you how close you are. That was the first version that felt like something.

But then I kept chiseling. On that same day — July 7 — I made four commits trying a completely different direction: squad selection. Instead of typing a name, you'd see both teams' squads laid out as cards and tap on a player.

It didn't work. Not technically — technically it was fine. It didn't work as a game.

The game was not fun when all that was required was to tap on a player name when the squad is presented. No effort, and therefore the payoff is not worth it.

That's the insight that took me months to fully understand but felt wrong immediately. When you tap a name from a list, you're recognising. When you type a name from memory, you're recollecting. Recognition is easy. Recollection is hard. And the payoff of a game is directly proportional to the effort you put in.

The current version — autocomplete — demands that you scratch your brain cells on what the answer could be. Each guess drives you forward. When you get the answer, it's a massive payoff. That's the game. That's what I was chiseling toward.

## The Right Combination of Clues

The clues went through their own evolution.

The first version gave you four things: whether the guessed player was from the same country, whether they played in the same match, their runs in that match, and their wickets in that match. Match-specific stats. The problem is — unless you remember the exact scorecard of CSK vs MI on April 12, 2024 — those numbers mean nothing to you.

The current version uses career stats within a format. You guess a player, and the game tells you:

- **Role** — Batsman, Bowler, or All-rounder. Same or different from the answer.
- **Runs** — Their career runs in that format. Higher, lower, or exact.
- **Wickets** — Same idea.
- **Matches** — Same idea.

These are numbers fans actually know. You know roughly where Kohli sits in IPL runs. You know Bumrah has a certain number of wickets. The clues become useful because they connect to knowledge you already carry around. Each guess narrows the field and drives you closer. Three guesses. That's all you get.

## The Data Problem

Naming was hard because of multiple data sources. One was Cricsheet and one was via scraping. Inconsistent names, inconsistent records, inconsistent results.

"BB McCullum" in one place. "MCCULLUM" in another. "Brendon McCullum" in a third. The same player, three different identities. Multiply that across thousands of cricketers and you've got a mess that no amount of clever code can reconcile cleanly.

So I did what I should have done earlier: moved all to Cricsheet and revised focus only on data that is available from that single source. Cut the other source entirely. Constrained the game to what one dataset could reliably provide.

It meant fewer matches, fewer players, fewer puzzles. But the ones that remained actually worked. The names resolved. The stats were consistent. The game stopped breaking in invisible ways.

Subtracting a data source felt like losing something. It was gaining everything.

## The Gap

July 30, 2025. The commit message reads: *"Save current working state 30h July before making changes to feedback system."*

Then — nothing. For five months.

The game wasn't abandoned. I was thinking about it constantly. The feedback system was the thing I couldn't crack. The clues I had weren't driving the right kind of thinking. The guesses felt random instead of deductive. I knew the answer was somewhere but I couldn't see it yet.

It was the passion that brought me back. Not a new tool, not a new model. Constantly thinking about the problem at hand — how to make the game engaging. Stuck in traffic jams day in day out. Grappling with this. And then one day, in a jam, the current system hit me.

January 4, 2026. One commit: *"Initial commit — CricGuess MVP."* The comeback.

## Claude Code as the Chisel

I should be clear about what Claude Code is and isn't in this story.

It's the chisel. It's not the sculptor. The breakthrough — career format stats, autocomplete over squad selection, three guesses, the clue combination — that all happened in my head. In traffic. Away from any screen.

But when I came back in January with the answer, Claude Code let me move fast. The earlier commits tell the story — July 7 had four commits in a single day, 1,500 lines of insertions, trying to brute-force my way to the right design by writing code. The January commit is surgical. I knew what I wanted. The tool helped me execute it.

The copy-paste era — the first real commit dropped 174,508 lines in one go, raw CSV files, scraped JSON, everything dumped in — that was me trying to get the raw material into place. Claude Code was about precision. Knowing what to cut. Knowing what to keep.

## The Names

The repo is called `bowldem`. The code header says `CricGuess`. I've called it `Buldim` and `VOLTA` at different points.

When you're building something alone, the name changes as you understand what the thing actually is. It started as a cricket wordle clone. Then it became a match puzzle game. Then a squad discovery game. Then back to what it always should have been — a guessing game where the answer is on the tip of your tongue and three guesses is all you get to scratch it out.

The name will settle when the game does. Maybe it already has.

## What I Learned

The game was not fun when all that was required was to tap on a player name when the squad is presented. No effort, and therefore the payoff is not worth it.

I keep coming back to that line because it's the whole lesson. Not just for this game — for building anything. The easy path isn't always the right one. Squad selection was easier to build, easier to use, easier to understand. And it was worse. Autocomplete is harder. It demands something from the player. And that demand is what makes the reward feel earned.

I scratch away, guess by guess, and uncover what the real answer is. That's the game. That's also what building it felt like.
