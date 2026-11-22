// Ember Court: Duel of the Last Flame — self-test entrypoint.
// Run: node main.ts  (Node 22+, built-ins only)
// Simulates one deterministic full match with the same engine rules as
// index.html, verifies the screenshot PNGs, and writes report.json.
// Written in CommonJS-style TypeScript (erasable syntax only, no
// import/export) so it runs under `node main.ts` with no package.json.
const fs = require("node:fs");
const path = require("node:path");

type Suit = "Ember" | "Tide" | "Gale" | "Stone";
interface Card { suit: Suit; rank: number }
type Side = "player" | "ai";

const SUITS: Suit[] = ["Ember", "Tide", "Gale", "Stone"];
const SEED = 20261122;

/** mulberry32 seeded PRNG — deterministic; never Math.random / Date.now. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function (): number {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildDeck(): Card[] {
  const d: Card[] = [];
  for (const s of SUITS) for (let r = 1; r <= 10; r++) d.push({ suit: s, rank: r });
  return d;
}

function shuffle(deck: Card[], rand: () => number): Card[] {
  const d = deck.slice();
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const t = d[i]; d[i] = d[j]; d[j] = t;
  }
  return d;
}

/**
 * Trick winner, from the leader's point of view: "leader" | "follower".
 * Ember is trump; Tide douses Ember when the two meet; otherwise the
 * highest card of the led suit wins, and an off-suit non-trump loses.
 */
function trickWinner(lead: Card, follow: Card): "leader" | "follower" {
  const leadEmber = lead.suit === "Ember";
  const folEmber = follow.suit === "Ember";
  const leadTide = lead.suit === "Tide";
  const folTide = follow.suit === "Tide";
  if ((leadEmber && folTide) || (leadTide && folEmber)) return "follower";
  if (leadEmber && !folEmber) return "leader";
  if (folEmber && !leadEmber) return "follower";
  if (follow.suit === lead.suit) return follow.rank > lead.rank ? "follower" : "leader";
  return "leader";
}

function legalPlays(hand: Card[], ledSuit: Suit | null): Card[] {
  if (!ledSuit) return hand.slice();
  const follow = hand.filter((c) => c.suit === ledSuit);
  return follow.length ? follow : hand.slice();
}

function lowCard(cards: Card[]): Card {
  return cards.slice().sort((a, b) => a.rank - b.rank)[0];
}
function highCard(cards: Card[]): Card {
  return cards.slice().sort((a, b) => b.rank - a.rank)[0];
}

/**
 * Cinder Queen AI — a learnable pattern:
 *  - leads her highest Tide in rounds 1-3, her highest Ember in rounds 5-7;
 *  - otherwise leads her lowest Stone;
 *  - as follower she wins as cheaply as she can, and when a trick is lost
 *    she dumps her lowest Stone.
 */
function aiChooseCard(hand: Card[], ledCard: Card | null, round: number, isLeader: boolean): Card {
  const bySuit = (s: Suit): Card[] => hand.filter((c) => c.suit === s);
  if (isLeader) {
    if (round <= 3 && bySuit("Tide").length) return highCard(bySuit("Tide"));
    if (round >= 5 && bySuit("Ember").length) return highCard(bySuit("Ember"));
    if (bySuit("Stone").length) return lowCard(bySuit("Stone"));
    return lowCard(hand);
  }
  const led = ledCard as Card;
  const legal = legalPlays(hand, led.suit);
  const winning = legal.filter((c) => trickWinner(led, c) === "follower");
  if (winning.length) return lowCard(winning);
  if (bySuit("Stone").length) return lowCard(bySuit("Stone"));
  return lowCard(legal);
}

/** Simple player policy for the simulation: lead lowest, follow to win cheaply. */
function playerChooseCard(hand: Card[], ledCard: Card | null, isLeader: boolean): Card {
  if (isLeader) return lowCard(hand);
  const led = ledCard as Card;
  const legal = legalPlays(hand, led.suit);
  const winning = legal.filter((c) => trickWinner(led, c) === "follower");
  if (winning.length) return lowCard(winning);
  return lowCard(legal);
}

interface TrickLog {
  round: number;
  leader: Side;
  lead: Card;
  follow: Card;
  winner: Side;
  points: number;
  kindleBonus: number;
}

interface MatchResult {
  playerEmbers: number;
  aiEmbers: number;
  winner: Side | "draw";
  roundsPlayed: number;
  kindleCount: number;
  tricks: TrickLog[];
}

/** Play one full deterministic match. Kindle: 3 straight tricks won with the same suit = +5. */
function simulateMatch(seed: number): MatchResult {
  const rand = mulberry32(seed);
  const deck = shuffle(buildDeck(), rand);
  const playerHand = deck.slice(0, 7);
  const aiHand = deck.slice(7, 14);
  let leader: Side = "player";
  let playerEmbers = 0;
  let aiEmbers = 0;
  let streakSuit: Suit | null = null;
  let playerStreak = 0;
  let aiStreak = 0;
  let kindleCount = 0;
  const tricks: TrickLog[] = [];

  const take = (hand: Card[], card: Card): void => {
    const i = hand.indexOf(card);
    if (i >= 0) hand.splice(i, 1);
  };

  for (let round = 1; round <= 7; round++) {
    const leadSide = leader;
    const leadCard = leadSide === "player"
      ? playerChooseCard(playerHand, null, true)
      : aiChooseCard(aiHand, null, round, true);
    take(leadSide === "player" ? playerHand : aiHand, leadCard);
    const folSide: Side = leadSide === "player" ? "ai" : "player";
    const folCard = folSide === "player"
      ? playerChooseCard(playerHand, leadCard, false)
      : aiChooseCard(aiHand, leadCard, round, false);
    take(folSide === "player" ? playerHand : aiHand, folCard);

    const res = trickWinner(leadCard, folCard);
    const winner: Side = res === "leader" ? leadSide : folSide;
    const winCard = winner === leadSide ? leadCard : folCard;
    const points = leadCard.rank + folCard.rank;
    let kindleBonus = 0;
    const streak = winner === "player" ? playerStreak : aiStreak;
    if (streakSuit === winCard.suit && streak === 2) {
      kindleBonus = 5;
      kindleCount++;
    }
    if (winner === "player") {
      playerStreak = streakSuit === winCard.suit ? playerStreak + 1 : 1;
      aiStreak = 0;
      playerEmbers += points + kindleBonus;
    } else {
      aiStreak = streakSuit === winCard.suit ? aiStreak + 1 : 1;
      playerStreak = 0;
      aiEmbers += points + kindleBonus;
    }
    streakSuit = winCard.suit;
    tricks.push({ round, leader: leadSide, lead: leadCard, follow: folCard, winner, points, kindleBonus });
    leader = winner;
    if (playerEmbers >= 21 || aiEmbers >= 21) break;
  }

  const winner: Side | "draw" =
    playerEmbers === aiEmbers ? "draw" : playerEmbers > aiEmbers ? "player" : "ai";
  return { playerEmbers, aiEmbers, winner, roundsPlayed: tricks.length, kindleCount, tricks };
}

interface ShotInfo {
  file: string;
  width: number;
  height: number;
  bytes: number;
}

interface Report {
  game: string;
  competition: string;
  seed: number;
  rules: string[];
  match: MatchResult;
  screenshots: ShotInfo[];
  checks: { name: string; passed: boolean }[];
  summary: string;
}

/** Read a PNG's width/height from its IHDR header (stdlib only, no image libs). */
function readPngSize(filePath: string): { width: number; height: number } {
  const buf = fs.readFileSync(filePath);
  if (buf.length < 33) throw new Error("PNG too small: " + filePath);
  if (buf[0] !== 0x89 || buf[1] !== 0x50 || buf[2] !== 0x4e || buf[3] !== 0x47) {
    throw new Error("Not a PNG file: " + filePath);
  }
  // IHDR chunk starts at offset 8: length(4) + "IHDR"(4), then width(4) + height(4) big-endian.
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height };
}

function main(): void {
  const outDir = process.env.MAKEFUN_OUTPUT_DIR || "./out";
  fs.mkdirSync(outDir, { recursive: true });

  const match = simulateMatch(SEED);

  // Rule spot-checks (deterministic assertions on the engine).
  const checks: { name: string; passed: boolean }[] = [
    { name: "ember_trump_beats_gale", passed: trickWinner({ suit: "Ember", rank: 1 }, { suit: "Gale", rank: 10 }) === "leader" },
    { name: "ember_trump_beats_tide_when_led", passed: trickWinner({ suit: "Gale", rank: 10 }, { suit: "Ember", rank: 1 }) === "follower" },
    { name: "tide_douses_ember_led", passed: trickWinner({ suit: "Ember", rank: 10 }, { suit: "Tide", rank: 1 }) === "follower" },
    { name: "tide_douses_ember_followed", passed: trickWinner({ suit: "Tide", rank: 1 }, { suit: "Ember", rank: 10 }) === "follower" },
    { name: "higher_led_suit_wins", passed: trickWinner({ suit: "Stone", rank: 4 }, { suit: "Stone", rank: 9 }) === "follower" },
    { name: "off_suit_non_trump_loses", passed: trickWinner({ suit: "Gale", rank: 3 }, { suit: "Stone", rank: 10 }) === "leader" },
    { name: "deck_has_40_cards", passed: buildDeck().length === 40 },
    { name: "match_played_7_rounds_or_early_win", passed: match.roundsPlayed >= 1 && match.roundsPlayed <= 7 },
    { name: "embers_sum_matches_tricks", passed: match.tricks.reduce((s, t) => s + t.points + t.kindleBonus, 0) === match.playerEmbers + match.aiEmbers },
  ];

  // Verify the screenshot files exist and read their real dimensions.
  const shotsDir = path.join(__dirname, "screenshots");
  const shotFiles = ["shot-1.png", "shot-2.png", "shot-3.png"];
  const screenshots: ShotInfo[] = [];
  for (const file of shotFiles) {
    const full = path.join(shotsDir, file);
    const size = readPngSize(full);
    const bytes = fs.statSync(full).size;
    screenshots.push({ file, width: size.width, height: size.height, bytes });
    checks.push({ name: "screenshot_" + file + "_is_1280x800", passed: size.width === 1280 && size.height === 800 });
  }

  const failed = checks.filter((c) => !c.passed);
  if (failed.length) {
    throw new Error("self-test checks failed: " + failed.map((c) => c.name).join(", "));
  }

  const winnerText = match.winner === "draw" ? "draw" : match.winner === "player" ? "You win" : "Cinder Queen wins";
  const report: Report = {
    game: "Ember Court: Duel of the Last Flame",
    competition: "best-card-game-20261122-1826",
    seed: SEED,
    rules: [
      "40-card deck, 4 suits (Ember, Tide, Gale, Stone), ranks 1-10",
      "7 rounds; follower must follow the led suit if able",
      "Ember is trump; Tide douses Ember when the two meet",
      "Trick winner scores the sum of both cards' ranks and leads next",
      "Kindle: 3 tricks in a row won with the same suit banks +5 embers",
      "First to 21 embers, or most embers after 7 rounds, wins the match",
    ],
    match,
    screenshots,
    checks,
    summary:
      "Deterministic match (seed " + SEED + "): " + winnerText + " " +
      match.playerEmbers + "-" + match.aiEmbers + " in " + match.roundsPlayed +
      " rounds, " + match.kindleCount + " Kindle bonus(es); " +
      screenshots.length + " screenshots verified at 1280x800.",
  };

  const outPath = path.join(outDir, "report.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n", "utf8");
  console.log(report.summary);
}

main();

