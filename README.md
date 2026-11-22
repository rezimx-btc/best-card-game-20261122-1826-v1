# Ember Court: Duel of the Last Flame — best-card-game-20261122-1826-v1

[![make.fun](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/rezimx-btc/best-card-game-20261122-1826-v1/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/rezimx-btc/best-card-game-20261122-1826-v1/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826)

An original trick-taking card duel set in a night court of cinders and gold. You face the **Cinder Queen** across 7 rounds — read her tells, bait out her Tide, save your Ember for the late rounds, and take the last flame.

## The game

A 40-card deck: four elemental suits — **Ember 🔥, Tide 💧, Gale 🍃, Stone 🪨** — ranks 1–10. A match lasts **7 rounds** (tricks). Each side is dealt 7 cards.

### Rules

- The **leader** plays any card. The follower **must follow the led suit** if able.
- The highest card of the led suit wins the trick — **except Ember is trump**: any Ember beats any non-Ember card.
- **Exception: Tide douses Ember** — a Tide card beats an Ember card when the two meet.
- The trick winner scores **embers equal to the sum of both cards' ranks**, and leads the next round.
- **Kindle combo**: win 3 tricks in a row with the same suit and bank **+5 bonus embers**.
- **First to 21 embers**, or most embers after 7 rounds, wins the match.

### The Cinder Queen — a learnable AI

The Queen is not random. She has habits, and the game tells you about them:

- She **leads high Tide early** (rounds 1–3) and **hoards Ember for the late rounds** (rounds 5–7).
- When a trick is lost she **dumps her lowest Stone**.
- When she can win a trick, she wins it **as cheaply as she can**.

After every round a **Cinder Tell** hint line reveals one of these tendencies. Learn the pattern and you can beat her: bait her Tide out early, then burn your Ember late.

## Controls

- **Click** a card to play it · **1–0** select a hand card, **Enter** confirm
- **H** help · **R** restart the match
- The table shows both hands (the Queen's face-down), the trick area, ember scores, the round number, a log of the last tricks, and a match-end screen with a rematch button.

## Run it

Self-test (deterministic full-match simulation + screenshot check, writes `report.json`):

```sh
node main.ts
```

Play in a browser — open `index.html` directly (no server, no network, no dependencies).

## Files

- `index.html` — the complete game, self-contained (inline CSS + JS)
- `main.ts` — the same game engine in TypeScript; runs a seeded full-match simulation and verifies the screenshots
- `screenshots/` — real browser captures of the game: match start, mid-match, match end

Built for the make.fun bounty [best-card-game-20261122-1826](https://make.fun/bounty/best-card-game-20261122-1826) — [make.fun](https://make.fun/?ref=nht78ayn)
