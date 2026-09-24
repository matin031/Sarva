# Student leaderboard UI

Front-end only. Both integrations currently pass explicitly fictional data and
show a visible demo label. No API, database query, migration, authentication or
score persistence was added.

## Locations

- `/game#games-leaderboard`: after the galaxy, with a shortcut in the hero.
  Keeping the section outside `GamesGalaxy` preserves the space cable's existing
  height calculation and planet positions.
- `/aruz#aruz-leaderboard`: after the aruz games and before the interactive demo.
- Shared renderer: `components/UI/leaderboard/StudentLeaderboard.tsx`.
- Public data contract: `components/UI/leaderboard/types.ts`.
- Fictional fixtures: `components/UI/leaderboard/demo-data.ts`.

## Proposed product policy, not backend logic

The game hub defaults to an overall competitive leaderboard and lets visitors
choose an individual competitive game. Vocabulary practice is omitted. The aruz
page has its own boards, including listening, rapid scansion, the weight bridge
and Kimia. The final eligible games remain a product decision; change the passed
boards to change the picker.

Weekly and all-time views both work with separate fixture rankings. Their scores
are illustrative, not a formula for combining incomparable game scores. Define
a normalized scoring policy before enabling a real overall board.

## Backend handoff

Pass `boards: readonly LeaderboardBoard[]`, `variant: "games" | "aruz"`, and
`isDemo: boolean`. Each board supplies an ID, label, short description, score
label and `periods` containing `week` and `all-time` entry arrays. Entries have a
stable ID, first/last names, optional city/school, and numeric score. The provider
must return entries in rank order and handle ties; the renderer never calculates
cross-game scores or reorders real data. The component supports empty boards and
fewer than three students.

Replace fixture imports at the integration points and set `isDemo={false}` only
when supplying real data. Empty, whitespace-only, null or missing city/school
values render `نگفته :(` independently. No profile photo is required: medallions
use name initials. No current-user position or live-update claim is fabricated.

## Visual behavior

Gold/silver/bronze medallions, a shallow three-dimensional podium, a floating
gold crown and a pointer tilt. Colors follow site surface/palette variables;
the medal metals intentionally retain their recognizable materials. CSS loops
pause offscreen, during scrolling, in a hidden tab or via the pause control.
Reduced-motion and the site's low-quality mode disable CSS animation. There is
no additional canvas, WebGL context or dependency.

Design references: [Duolingo's weekly leagues](https://blog.duolingo.com/duolingo-leagues-leaderboards/)
and [Kaggle's separated ranking categories](https://www.kaggle.com/rankings?group=notebooks).
The visual implementation is original and uses no external images.
