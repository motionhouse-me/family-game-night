# Game Night 🎲

A home page where you pick a game: Far Out 🪐, Same Brain 🧠, Word Bomb 💣 and The Imposter 🕵️ (up to 30 players each).

## What's in here

```
game-night/
├── netlify.toml               ← tells Netlify where things are (don't move)
├── package.json               ← installs Netlify Blobs (rooms & scores)
├── public/                    ← everything people see
│   ├── index.html             ← the Game Night menu
│   ├── far-out/index.html     ← Far Out (at yoursite.netlify.app/far-out/)
│   ├── same-brain/            ← Same Brain 🧠 (page, theme.css, game.js)
│   ├── word-bomb/             ← Word Bomb 💣 (page, theme.css, game.js)
│   ├── imposter/              ← The Imposter 🕵️ (page, theme.css, game.js)
│   └── play/                  ← engine the three new games share (rooms, votes, scores, awards)
├── lib/
│   ├── content.js             ← 500+ Same Brain prompts, 330+ Imposter word pairs (add more freely!)
│   └── words.js               ← English dictionary Word Bomb checks words against
└── netlify/functions/
    ├── far-out.mjs            ← Far Out's server
    └── night.js               ← server for Same Brain, Word Bomb and The Imposter
```

## Putting it on Netlify (via GitHub)

1. On GitHub, create a new repo called `game-night`.
2. Click **uploading an existing file**, then drag in everything *inside* the unzipped `game-night` folder
   (the `public` and `netlify` folders, `netlify.toml`, `package.json`, `README.md`). GitHub keeps the folders.
3. Click **Commit changes**.
4. In Netlify, go to **Add new project → Import an existing project**, pick the `game-night` repo and click **Deploy**.
5. Under **Project configuration → General → Project name**, rename it to `game-night` (if that name's free).
6. If your team requires login to view sites, turn it off under **Project configuration → Access & security → Visitor access**, so everyone can join.

## Adding another game

1. Put the game in its own folder: `public/<game-name>/index.html`.
2. If it needs a server function, put it in `netlify/functions/<game-name>.mjs` and give it
   its own path, e.g. `export const config = { path: "/api/<game-name>" };`
3. On `public/index.html`, change one of the "Coming soon" cards into a link to `/<game-name>/`.

Keep each game's folder name, API path and storage name different, so games never clash with each other.
Far Out uses `/far-out/`, `/api/far-out` and the Blobs store `far-out-rooms`.

## The three new games

Each game is separate: its own page, its own look, its own room codes. All three work like Far Out:
the host picks how many rounds, everyone votes 👍 before each round, answers are timed, and the game
ends with a champion, awards, a 😂 hall of fame and an all-time family leaderboard.

They share `/api/night`, and each keeps its rooms in its own Blobs store: `same-brain-rooms`,
`word-bomb-rooms`, `imposter-rooms`. To add prompts or word pairs, edit `lib/content.js` (one per line).
