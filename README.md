# Signal — Resume Analyzer (Full Stack)

A resume-scoring app with a real backend: Express API + SQLite database for
history, PDF text extraction, and a scoring engine that checks structure,
action-verb usage, quantified impact, filler language, and role-specific
keywords. Frontend is vanilla HTML/CSS/JS with a Three.js particle hero —
no build step needed.

## Project structure

```
resume-analyzer-fullstack/
├── server/
│   ├── server.js       # Express app, REST API, serves the frontend
│   ├── analyzer.js      # scoring engine (pure function)
│   ├── db.js             # SQLite (better-sqlite3) persistence
│   └── package.json
├── public/
│   └── index.html         # frontend — talks to the API via fetch()
└── README.md
```

## Run it locally

Requires **Node.js 18+**.

```bash
cd server
npm install
npm start
```

Then open **http://localhost:3000** in your browser.

The server serves the `public/` folder itself, so frontend and backend run
from the same origin — no CORS setup needed on your machine, and the app
will work exactly like a single deployed site.

A SQLite file `server/analyses.db` is created automatically on first run
and stores every analysis (score, breakdown, matched keywords, timestamp).

## API reference

| Method | Route              | Body / params                     | Returns                                  |
|--------|--------------------|------------------------------------|-------------------------------------------|
| POST   | `/api/analyze`     | JSON `{ text, role }` **or** multipart `file`, `role` | full scored result + saved `id` |
| GET    | `/api/history`     | —                                   | last 50 scans (summary: score, date, filename) |
| GET    | `/api/history/:id` | —                                   | full stored result for one scan            |
| DELETE | `/api/history/:id` | —                                   | `{ ok: true }`                             |
| GET    | `/api/health`      | —                                   | `{ ok: true }` — used by the frontend's connection indicator |

`role` accepts: `swe`, `data`, `pm`, `design`, `marketing`, or empty string
for a general (role-agnostic) score.

## Notes

- PDF text extraction uses `pdf-parse` on the server — scanned/image-only
  PDFs won't extract text; paste the resume instead in that case.
- The scoring logic in `analyzer.js` is a heuristic model (regex + keyword
  rules), not a trained ML model — it's deterministic and fully explainable,
  which is why the "why" behind every score is shown in the UI.
- To deploy publicly, put this behind any Node host (Render, Railway, a VPS,
  etc.) and swap SQLite for a hosted Postgres if you expect concurrent
  writers — `better-sqlite3` is great for local/demo use but is single-file
  and not built for multi-instance deployments.
