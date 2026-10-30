# PG Seat Compass

NEET PG counselling helper built on MCC's official allotment results (2023 onwards).

- **Predictor** (`/`): enter a rank, category and quotas; see every seat whose closing rank is within reach, labelled Safer / Possible / Reach, with a link to the exact PDF page the closing rank came from.
- **Allotments** (`/allotments`): every allotment in every round, searchable.
- **Branch cutoffs** (`/cutoffs`): first and closing rank per branch, with other seasons alongside.
- **Seat matrix** (`/seat-matrix`): seats per institute, branch, quota and category for each season, plus a "Changes vs last year" view (new, increased, reduced and removed seats).
- **Institutes & fees** (`/institutes`, `/institutes/<MCC code>`): every institute with its fee, stipend, hostel and resignation rules as declared to MCC, plus seats and closing ranks per branch across seasons.
- **Rank Scan** (`/rank-scan`): what every rank in a range was allotted in each MCC round, including upgrades.
- **My choice list** (`/my-list`): several named lists, saved in the browser; reorder and copy.
- **Sources & method** (`/sources`): every official PDF used and how the data was extracted.

Every filtered view is a URL, so any result can be shared as a link.

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
npm run build && npm start   # production
```

Node 22. No database and no environment variables: the dataset ships in `data/pgdata.json` and is loaded into memory on the server.

## Deploy (Vercel)

1. Push this folder to a GitHub repo.
2. In Vercel, **Add New → Project**, import the repo, keep the defaults (framework: Next.js) and deploy.

`next.config.ts` makes sure `data/pgdata.json` is bundled with every server function.

## Code map

| Path | What it does |
|---|---|
| `src/lib/data.ts` | Loads `data/pgdata.json` once into column arrays; computes closing ranks per season and round set (cached). |
| `src/lib/query.ts` | Allotment queries: `predict`, `browse`, `cutoffs`, `rankScan`, `choiceDetails`. Pages and API routes both call these. |
| `src/lib/institutes.ts` | Seat-matrix and institute queries: `seatMatrix`, `seatChanges`, `listInstitutes`, `instituteDetail`. |
| `src/app/*/page.tsx` | Server-rendered pages. Filters live in the URL (`AutoForm` updates it as you type). |
| `src/app/api/predict` | The predictor as JSON (for a mobile app or partners). Same parameters as the home page. |
| `src/app/api/choices` | Details for a saved choice list. |
| `src/components/` | Small client components: auto-submitting filter form, add-to-list button, nav, choice list. |
| `pipeline/` | PDF → dataset scripts (see below). Not part of the web build. |

Ids in URLs and saved lists are stable across data rebuilds: institutes use a hash of their normalised name, branches and quotas use slugs. Institute pages use MCC's own 6-digit institute code, which the seat matrices print after every name and which stays the same across seasons.

## Updating the data (new MCC round)

The pipeline uses the **NamahaPDF** engine, read-only, from `../../NamahaPDF/NamahaPDF` (relative to `pipeline/`). Run the PDF scripts with NamahaPDF's own `tsx` so its modules resolve the same way it does:

```bash
T=../NamahaPDF/NamahaPDF/node_modules/.bin/tsx   # adjust to where NamahaPDF lives
```

1. Download the round's final result PDF from https://mcc.nic.in/pg-medical-counselling/ into `data/raw/`, named like `mcc2026_r2.pdf`.
2. Extract it:
   ```bash
   $T pipeline/extract-results.ts data/raw/mcc2026_r2.pdf data/parsed/mcc2026_r2.json --year 2026 --round r2
   ```
   The script prints row counts plus two checks: `rankOrderBreaks` and `emptyFields` should both be 0.
3. Add the file to `SOURCES` in `pipeline/build-dataset.ts` (round label + PDF URL path).
4. Rebuild the dataset and redeploy:
   ```bash
   npm run data:build
   ```

### New season: seat matrices and institute profiles

- **Seat matrices** (one per season for AIQ, central-internal, deemed and DNB): save as `data/raw/sm<year>_<aiq|central|deemed|dnb>.pdf`, then
  `$T pipeline/extract-seatmatrix.ts data/raw/sm2027_aiq.pdf data/parsed/sm2027_aiq.json --year 2027 --kind aiq`, and add the PDF's URL to `SM_SOURCES` in `pipeline/build-dataset.ts`.
- **Institute profiles** (fee, stipend, hostel, resignation rules): `python pipeline/fetch-profiles.py` downloads every institute's profile PDF from MCC's report (sequential, about 2,200 requests, resumable; update `BOARD` for a new season), then `$T pipeline/extract-profiles.ts`.

Then `npm run data:build`.

### How extraction works

- `pipeline/engine.ts` reads each page's text runs and ruling lines through the NamahaPDF parser and renderer, applying `/Rotate` so sideways pages come out upright.
- `pipeline/grid.ts` rebuilds table cells from the ruling lines, so text that wraps inside a cell stays in one cell.
- `pipeline/extract-results.ts` finds the header row and takes the **last** "Allotted Quota" block. Round 2/3 PDFs repeat earlier rounds side by side, so only seats allotted in that round are counted. Columns are matched to the header by x-position, because some header pages have spacer columns that data pages don't.
- `pipeline/build-dataset.ts` normalises quota, category and branch spellings across years (matching with spaces ignored, since some PDFs break words mid-word), assigns each institute a state, and writes `data/pgdata.json`.

## Not included yet

State quota counselling, fees / stipend / bond data, INI-CET, and cross-year institute matching (each season is compared on its own because MCC's institute names change between years).
