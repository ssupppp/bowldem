#!/usr/bin/env python3
"""
Complete ODI Processor for CricGuess
1. Extracts international players from ODI files
2. Adds them to players.json with countries, flags, teams
3. Creates puzzles referencing these players
"""

import json
import os
import random
from datetime import datetime
from typing import Dict, List, Any, Optional, Set


class CompleteODIProcessor:

    def __init__(self):
        self.starting_puzzle_id = 201
        self.processed_count = 0
        self.new_players_added = 0

        # Country to flag mapping for international teams
        self.country_flags = {
            'Australia': '🇦🇺',
            'India': '🇮🇳',
            'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
            'Pakistan': '🇵🇰',
            'Sri Lanka': '🇱🇰',
            'New Zealand': '🇳🇿',
            'South Africa': '🇿🇦',
            'West Indies': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
            'Bangladesh': '🇧🇩',
            'Zimbabwe': '🇿🇼',
            'Kenya': '🇰🇪',
            'Netherlands': '🇳🇱',
            'Ireland': '🇮🇪',
            'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
            'Afghanistan': '🇦🇫',
            'Canada': '🇨🇦',
            'UAE': '🇦🇪'
        }

        # Team to country mapping for international cricket
        self.team_to_country = {
            'Australia': 'Australia',
            'India': 'India',
            'England': 'England',
            'Pakistan': 'Pakistan',
            'Sri Lanka': 'Sri Lanka',
            'New Zealand': 'New Zealand',
            'South Africa': 'South Africa',
            'West Indies': 'West Indies',
            'Bangladesh': 'Bangladesh',
            'Zimbabwe': 'Zimbabwe',
            'Kenya': 'Kenya',
            'Netherlands': 'Netherlands',
            'Ireland': 'Ireland',
            'Scotland': 'Scotland',
            'Afghanistan': 'Afghanistan',
            'Canada': 'Canada',
            'UAE': 'UAE'
        }

    def run(self):
        """Main function to process ODI files and update both players and puzzles"""
        print("🏏 Complete ODI Processing Started!")
        print("Step 1: Extract and add international players")
        print("Step 2: Create puzzles with proper player references")
        print("=" * 60)

        try:
            # Step 1: Process players from ODI files
            print("\n📊 STEP 1: Processing International Players")
            print("-" * 40)

            extracted_players = self.extract_players_from_odi_files()
            if not extracted_players:
                print("❌ No players extracted. Stopping process.")
                return

            self.update_players_json(extracted_players)

            # Step 2: Create puzzles
            print(f"\n🧩 STEP 2: Creating ODI Puzzles")
            print("-" * 40)

            puzzles = self.create_odi_puzzles()
            if not puzzles:
                print("❌ No puzzles created.")
                return

            self.update_match_puzzles_json(puzzles)

            # Summary
            print("=" * 60)
            print("🎉 COMPLETE ODI PROCESSING FINISHED!")
            print(
                f"✅ Added {self.new_players_added} international players to players.json"
            )
            print(f"✅ Created {len(puzzles)} new ODI puzzles")
            print(f"🎮 Your CricGuess now has international cricket variety!")
            print("\n🔄 Restart your game to see the new content!")

            return puzzles

        except Exception as e:
            print(f"❌ Error in complete ODI processing: {str(e)}")
            return []

    def extract_players_from_odi_files(self) -> Dict[str, Dict]:
        """Extract all unique players from ODI files with their team info"""
        print("🔍 Scanning ODI files for international players...")

        odi_folder = "./odi"
        if not os.path.exists(odi_folder):
            print(f"❌ ODI folder not found: {odi_folder}")
            return {}

        odi_files = [f for f in os.listdir(odi_folder) if f.endswith('.json')]
        if not odi_files:
            print("❌ No JSON files found in ODI folder")
            return {}

        print(f"📁 Found {len(odi_files)} ODI files")

        # Use all files to extract comprehensive player list
        all_players = {}
        processed_files = 0

        for filename in odi_files:
            try:
                file_path = os.path.join(odi_folder, filename)
                with open(file_path, 'r', encoding='utf-8') as f:
                    cricsheet_data = json.load(f)

                info = cricsheet_data.get('info', {})
                if not info.get('players'):
                    continue

                # Extract players from this match
                for team, players in info['players'].items():
                    country = self.team_to_country.get(team, team)
                    flag = self.country_flags.get(country, '🏳️')

                    for player_name in players:
                        player_key = self.create_player_key(player_name)

                        if player_key not in all_players:
                            all_players[player_key] = {
                                'fullName': player_name,
                                'country': country,
                                'countryFlag': flag,
                                'teams': [team],
                                'aliases': self.generate_aliases(player_name)
                            }
                        else:
                            # Add team if not already present
                            if team not in all_players[player_key]['teams']:
                                all_players[player_key]['teams'].append(team)

                processed_files += 1
                if processed_files % 5 == 0:
                    print(
                        f"   📖 Processed {processed_files}/{len(odi_files)} files..."
                    )

            except Exception as e:
                print(f"   ⚠️ Skipped {filename}: {str(e)}")

        print(f"✅ Extracted {len(all_players)} unique international players")
        print("🌍 Countries represented:",
              set([p['country'] for p in all_players.values()]))

        return all_players

    def update_players_json(self, new_players: Dict[str, Dict]):
        """Update players.json with new international players"""
        print(
            f"\n💾 Updating players.json with {len(new_players)} international players..."
        )

        players_path = './src/data/players.json'

        try:
            # Read existing players
            if os.path.exists(players_path):
                with open(players_path, 'r', encoding='utf-8') as f:
                    existing_players = json.load(f)
                print(
                    f"📖 Read existing players: {len(existing_players)} players"
                )
            else:
                existing_players = {}
                print("📝 Creating new players.json file")

            # Add new players (avoid duplicates)
            added_count = 0
            updated_count = 0

            for player_key, player_data in new_players.items():
                if player_key not in existing_players:
                    existing_players[player_key] = player_data
                    added_count += 1
                else:
                    # Update teams list if new teams found
                    existing_teams = set(existing_players[player_key].get(
                        'teams', []))
                    new_teams = set(player_data['teams'])
                    if new_teams - existing_teams:  # If there are new teams
                        existing_players[player_key]['teams'] = list(
                            existing_teams | new_teams)
                        updated_count += 1

            # Write updated players file
            with open(players_path, 'w', encoding='utf-8') as f:
                json.dump(existing_players, f, indent=2, ensure_ascii=False)

            self.new_players_added = added_count
            print(f"✅ Players.json updated:")
            print(f"   📊 Total players: {len(existing_players)}")
            print(f"   ➕ New players added: {added_count}")
            print(f"   🔄 Players updated: {updated_count}")

            # Show sample of new players
            if added_count > 0:
                sample_players = list(new_players.keys())[:5]
                print(
                    f"   🌟 Sample new players: {', '.join([new_players[k]['fullName'] for k in sample_players])}"
                )

        except Exception as e:
            print(f"❌ Error updating players.json: {str(e)}")
            raise

    def create_odi_puzzles(self) -> List[Dict]:
        """Create ODI puzzles now that players are in the database"""
        print("🎲 Selecting random ODI matches for puzzles...")

        odi_folder = "./odi"
        odi_files = [f for f in os.listdir(odi_folder) if f.endswith('.json')]

        # Randomly select 10 files for puzzles
        random.shuffle(odi_files)
        selected_files = odi_files[:10]

        print(f"🎯 Selected {len(selected_files)} matches for puzzles:")
        for i, file in enumerate(selected_files, 1):
            print(f"   {i}. {file}")

        puzzles = []
        current_id = self.starting_puzzle_id

        for filename in selected_files:
            try:
                file_path = os.path.join(odi_folder, filename)
                with open(file_path, 'r', encoding='utf-8') as f:
                    cricsheet_data = json.load(f)

                puzzle = self.convert_to_cricguess_puzzle(
                    cricsheet_data, current_id)

                if puzzle and self.is_valid_puzzle(puzzle):
                    puzzles.append(puzzle)
                    teams = puzzle['matchData']['scorecard']['teams']
                    date = puzzle['matchData']['scorecard']['date']
                    player = puzzle['matchData']['scorecard'][
                        'player_of_match']
                    print(
                        f"✅ ID {current_id}: {' vs '.join(teams)} - {date} (Player: {player})"
                    )
                    current_id += 1
                    self.processed_count += 1
                else:
                    print(f"⚠️ Skipped: {filename} (invalid data)")

            except Exception as e:
                print(f"❌ Error processing {filename}: {str(e)}")

        print(f"\n🎉 Created {len(puzzles)} valid ODI puzzles!")
        return puzzles

    def convert_to_cricguess_puzzle(self, cricsheet_data: Dict,
                                    puzzle_id: int) -> Optional[Dict]:
        """Convert cricsheet data to CricGuess puzzle format"""
        try:
            info = cricsheet_data['info']

            # Validation checks
            if not info.get('player_of_match') or not info.get(
                    'teams') or not cricsheet_data.get('innings'):
                raise ValueError('Missing required data')

            if not isinstance(info['player_of_match'], list) or len(
                    info['player_of_match']) == 0:
                raise ValueError('No player of match')

            player_performances = self.calculate_player_stats(cricsheet_data)
            team_scores = self.calculate_team_scores(cricsheet_data['innings'])
            player_of_match = info['player_of_match'][0]
            target_player_key = self.create_player_key(player_of_match)

            # Ensure target player exists in performances
            if target_player_key not in player_performances:
                raise ValueError(
                    f'Target player {target_player_key} not found in match performances'
                )

            match_data = {
                'scorecard': {
                    'teams': info['teams'],
                    'venue': info.get('venue', 'Unknown Venue'),
                    'date': info['dates'][0],
                    'season': self.extract_season(info['dates'][0]),
                    'winner': info.get('outcome',
                                       {}).get('winner', 'No Result'),
                    'player_of_match': player_of_match,
                    'team_scores': team_scores
                },
                'playerPerformances': player_performances
            }

            puzzle = {
                'id': puzzle_id,
                'targetPlayer': target_player_key,
                'puzzleType': 'scorecard',
                'puzzleContent': self.generate_puzzle_content(match_data),
                'puzzleDescription': 'Guess the Player of the Match',
                'matchData': match_data,
                'trivia': self.generate_trivia(match_data)
            }

            return puzzle

        except Exception as e:
            print(f"   ⚠️ Conversion error: {str(e)}")
            return None

    def calculate_player_stats(self, cricsheet_data: Dict) -> Dict:
        """Calculate player statistics from ball-by-ball data"""
        info = cricsheet_data['info']
        innings = cricsheet_data['innings']
        player_stats = {}

        # Initialize all players from team lists
        for team, players in info['players'].items():
            for player in players:
                player_key = self.create_player_key(player)
                player_stats[player_key] = {
                    'full_name': player,
                    'team': team,
                    'runs_in_match': 0,
                    'wickets_in_match': 0,
                    'balls_faced': 0,
                    'balls_bowled': 0,
                    'boundaries': {
                        'fours': 0,
                        'sixes': 0
                    },
                    'played_in_match': False
                }

        # Process ball-by-ball data
        for inning in innings:
            if not inning.get('overs'):
                continue

            for over in inning['overs']:
                if not over.get('deliveries'):
                    continue

                for delivery in over['deliveries']:
                    batter_key = self.create_player_key(delivery['batter'])
                    bowler_key = self.create_player_key(delivery['bowler'])
                    runs = delivery.get('runs', {})

                    # Update batting stats
                    if batter_key in player_stats:
                        player_stats[batter_key]['played_in_match'] = True
                        player_stats[batter_key]['runs_in_match'] += runs.get(
                            'batter', 0)
                        player_stats[batter_key]['balls_faced'] += 1

                        if runs.get('batter') == 4:
                            player_stats[batter_key]['boundaries'][
                                'fours'] += 1
                        elif runs.get('batter') == 6:
                            player_stats[batter_key]['boundaries'][
                                'sixes'] += 1

                    # Update bowling stats
                    if bowler_key in player_stats:
                        player_stats[bowler_key]['played_in_match'] = True
                        player_stats[bowler_key]['balls_bowled'] += 1

                        # Handle wickets
                        if delivery.get('wickets'):
                            for wicket in delivery['wickets']:
                                if wicket.get('kind') not in [
                                        'run out', 'retired hurt'
                                ]:
                                    player_stats[bowler_key][
                                        'wickets_in_match'] += 1

        # Return only players who actually played
        played_players = {
            k: v
            for k, v in player_stats.items() if v['played_in_match']
        }
        return played_players

    def calculate_team_scores(self, innings: List[Dict]) -> Dict:
        """Calculate team scores from innings data"""
        scores = {}

        for inning in innings:
            total_runs = 0
            total_wickets = 0

            if inning.get('overs'):
                for over in inning['overs']:
                    if over.get('deliveries'):
                        for delivery in over['deliveries']:
                            total_runs += delivery.get('runs',
                                                       {}).get('total', 0)
                            if delivery.get('wickets'):
                                total_wickets += len(delivery['wickets'])

            scores[inning['team']] = {
                'runs': total_runs,
                'wickets': total_wickets
            }

        return scores

    def update_match_puzzles_json(self, new_puzzles: List[Dict]):
        """Update match_puzzles.json with alternating IPL-ODI pattern"""
        print(f"\n💾 Creating alternating IPL-ODI puzzle sequence...")

        try:
            puzzles_path = './src/data/match_puzzles.json'

            # Read existing puzzles
            if os.path.exists(puzzles_path):
                with open(puzzles_path, 'r', encoding='utf-8') as f:
                    existing_data = json.load(f)
                print(
                    f"📖 Read existing IPL puzzles: {len(existing_data['puzzles'])} puzzles"
                )
            else:
                existing_data = {'puzzles': [], 'metadata': {}}
                print("📝 Creating new match_puzzles.json file")

            # Create alternating sequence: IPL → ODI → IPL → ODI...
            ipl_puzzles = existing_data['puzzles']
            odi_puzzles = new_puzzles
            alternating_puzzles = []

            # Reassign IDs to create proper alternating sequence
            current_id = 1
            max_puzzles = max(len(ipl_puzzles), len(odi_puzzles))

            print(f"🔄 Creating alternating sequence...")
            print(f"   🏏 IPL puzzles: {len(ipl_puzzles)}")
            print(f"   🌍 ODI puzzles: {len(odi_puzzles)}")

            for i in range(max_puzzles):
                # Add IPL puzzle (odd positions: 1, 3, 5, 7...)
                if i < len(ipl_puzzles):
                    ipl_puzzle = ipl_puzzles[i].copy()
                    ipl_puzzle['id'] = current_id
                    alternating_puzzles.append(ipl_puzzle)
                    print(
                        f"   📍 ID {current_id}: IPL - {ipl_puzzle['matchData']['scorecard']['teams'][0]} vs {ipl_puzzle['matchData']['scorecard']['teams'][1]}"
                    )
                    current_id += 1

                # Add ODI puzzle (even positions: 2, 4, 6, 8...)
                if i < len(odi_puzzles):
                    odi_puzzle = odi_puzzles[i].copy()
                    odi_puzzle['id'] = current_id
                    alternating_puzzles.append(odi_puzzle)
                    print(
                        f"   📍 ID {current_id}: ODI - {odi_puzzle['matchData']['scorecard']['teams'][0]} vs {odi_puzzle['matchData']['scorecard']['teams'][1]}"
                    )
                    current_id += 1

            # Update metadata
            updated_data = {
                'puzzles': alternating_puzzles,
                'metadata': {
                    **existing_data.get('metadata', {}), 'total_puzzles':
                    len(alternating_puzzles),
                    'puzzles_created':
                    len(alternating_puzzles),
                    'last_updated':
                    datetime.now().isoformat(),
                    'puzzle_pattern':
                    'alternating_ipl_odi',
                    'ipl_puzzles_count':
                    len(ipl_puzzles),
                    'odi_puzzles_count':
                    len(odi_puzzles),
                    'international_players_added':
                    self.new_players_added,
                    'sequence_info':
                    'IPL (odd IDs) alternating with ODI (even IDs)'
                }
            }

            # Write updated file
            with open(puzzles_path, 'w', encoding='utf-8') as f:
                json.dump(updated_data, f, indent=2, ensure_ascii=False)

            print(f"\n✅ Match_puzzles.json updated with alternating pattern:")
            print(f"   📊 Total puzzles: {len(alternating_puzzles)}")
            print(f"   🏏 IPL puzzles: {len(ipl_puzzles)} (odd IDs)")
            print(f"   🌍 ODI puzzles: {len(odi_puzzles)} (even IDs)")
            print(f"   🔄 Pattern: IPL → ODI → IPL → ODI...")

            # Show sequence preview
            print(f"\n📋 Puzzle Sequence Preview:")
            for i, puzzle in enumerate(alternating_puzzles[:8], 1):
                puzzle_type = "IPL" if puzzle['id'] % 2 == 1 else "ODI"
                teams = puzzle['matchData']['scorecard']['teams']
                print(
                    f"   {puzzle['id']}. {puzzle_type}: {teams[0]} vs {teams[1]}"
                )
            if len(alternating_puzzles) > 8:
                print(
                    f"   ... and {len(alternating_puzzles) - 8} more puzzles")

        except Exception as e:
            print(f"❌ Error updating match_puzzles.json: {str(e)}")
            raise

    def generate_puzzle_content(self, match_data: Dict) -> str:
        """Generate puzzle content display"""
        scorecard = match_data['scorecard']
        teams = scorecard['teams']
        venue = scorecard['venue']
        date = scorecard['date']
        winner = scorecard['winner']
        team_scores = scorecard['team_scores']

        team1_score = f"{teams[0]}: {team_scores[teams[0]]['runs']}/{team_scores[teams[0]]['wickets']}"
        team2_score = f"{teams[1]}: {team_scores[teams[1]]['runs']}/{team_scores[teams[1]]['wickets']}"

        return f"""🏏 Match Scorecard 🏏
{teams[0]} vs {teams[1]}
Venue: {venue}
Date: {date}

{team1_score}
{team2_score}

Winner: {winner}
Player of the Match: ?"""

    def generate_trivia(self, match_data: Dict) -> str:
        """Generate trivia for the puzzle"""
        scorecard = match_data['scorecard']
        venue = scorecard['venue']
        date = scorecard['date']
        player_of_match = scorecard['player_of_match']
        teams = scorecard['teams']
        year = datetime.strptime(date, '%Y-%m-%d').year

        trivia_options = [
            f"This classic ODI was played at {venue} in {year}.",
            f"{player_of_match} delivered a match-winning performance in this international encounter.",
            f"A memorable clash between {' and '.join(teams)} showcasing the golden era of ODI cricket.",
            f"This {year} ODI at {venue} featured {player_of_match}'s exceptional performance."
        ]

        return random.choice(trivia_options)

    # Helper functions
    def create_player_key(self, player_name: str) -> str:
        """Create a standardized player key"""
        import re
        return re.sub(r'[^a-zA-Z]', '', player_name).upper()

    def generate_aliases(self, player_name: str) -> List[str]:
        """Generate common aliases for a player"""
        aliases = []

        # Add surname
        parts = player_name.split()
        if len(parts) > 1:
            aliases.append(parts[-1])  # Last name

        # Add initials + surname
        if len(parts) > 1:
            initials = ''.join([p[0] for p in parts[:-1]])
            aliases.append(f"{initials} {parts[-1]}")

        # Add without periods/dots
        clean_name = player_name.replace('.', '')
        if clean_name != player_name:
            aliases.append(clean_name)

        return list(set(aliases))  # Remove duplicates

    def extract_season(self, date_string: str) -> str:
        """Extract season from date"""
        year = datetime.strptime(date_string, '%Y-%m-%d').year
        return f"{year-1}/{str(year)[-2:]}"

    def is_valid_puzzle(self, puzzle: Dict) -> bool:
        """Validate if puzzle has all required data"""
        try:
            has_valid_target = (puzzle['targetPlayer']
                                and puzzle['targetPlayer']
                                in puzzle['matchData']['playerPerformances'])
            has_valid_teams = len(
                puzzle['matchData']['scorecard']['teams']) == 2
            has_enough_players = len(
                puzzle['matchData']['playerPerformances']) >= 8
            has_scores = (
                puzzle['matchData']['scorecard']['team_scores']
                and len(puzzle['matchData']['scorecard']['team_scores']) == 2)

            return has_valid_target and has_valid_teams and has_enough_players and has_scores
        except:
            return False


def main():
    """Main execution function"""
    print("🚀 Complete ODI Processor for CricGuess")
    print("This will add international players AND create ODI puzzles")
    print("Both players.json and match_puzzles.json will be updated\n")

    processor = CompleteODIProcessor()
    results = processor.run()

    if results:
        print(f"\n🎊 COMPLETE SUCCESS!")
        print(f"🌍 Your CricGuess now features international cricket!")
        print(f"🔄 Restart your game to experience the new content")
    else:
        print("\n⚠️ Processing incomplete. Check errors above.")


if __name__ == "__main__":
    main()
