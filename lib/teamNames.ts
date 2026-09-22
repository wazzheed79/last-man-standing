/** Short labels so Premier League team names fit on narrow phone screens */
export function shortTeamName(name: string | null | undefined): string {
  if (!name) return ''
  const n = name
    .replace(/ FC$/i, '')
    .replace(/ AFC$/i, '')
    .replace(/ and Hove Albion$/i, '')
    .trim()

  const map: Record<string, string> = {
    'Manchester United': 'Man Utd',
    'Manchester City': 'Man City',
    'Tottenham Hotspur': 'Spurs',
    'Nottingham Forest': "Nott'm Forest",
    Brighton: 'Brighton',
    'West Ham United': 'West Ham',
    'Wolverhampton Wanderers': 'Wolves',
    'Newcastle United': 'Newcastle',
    'Leicester City': 'Leicester',
    'Ipswich Town': 'Ipswich',
    'Crystal Palace': 'Palace',
    'AFC Bournemouth': 'Bournemouth',
    Bournemouth: 'Bournemouth',
    'Sheffield United': 'Sheffield Utd',
    'Leeds United': 'Leeds',
    'Aston Villa': 'Aston Villa',
    Arsenal: 'Arsenal',
    Chelsea: 'Chelsea',
    Everton: 'Everton',
    Fulham: 'Fulham',
    Liverpool: 'Liverpool',
    Southampton: 'Southampton',
    Sunderland: 'Sunderland',
  }

  if (map[n]) return map[n]
  for (const [k, v] of Object.entries(map)) {
    if (n.includes(k) || k.includes(n)) return v
  }
  return n
}
