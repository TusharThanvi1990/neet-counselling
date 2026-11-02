# State counselling tracker

One row per state counselling board. Update this file whenever a state moves forward.

**Status:** ✅ live on the site · 🔧 in progress · ⏳ queued · ⛔ blocked (reason in notes)

**Columns**
- **Priority:** P1 = big seat count, do first · P2 = medium · P3 = small board, quick win
- **Rank in PDF:** whether the official list prints the All India Rank (AIR) directly or only a state merit number we must map

Every state follows the same steps:
1. Download the official allotment PDFs into `data/raw/states/<state>/`.
2. Write `pipeline/states/<state>.ts`. It produces `data/parsed/<xx>2025_<round>.json`, with candidate names never kept.
3. Map in `pipeline/build-dataset.ts`: colleges to MCC codes, local category and quota codes, course names.
4. Rebuild data, check the predictor and Rank Scan, then push.

## NEET PG: state closing ranks

| # | State | Board / source | Priority | Years | Rank in PDF | Status | Rows | Notes |
|---|---|---|---|---|---|---|---|---|
| 1 | Maharashtra | State CET Cell (DMER PG CAP) | P1 | 2025 | State merit no. → AIR via merit list | ✅ | 10,801 | 5 rounds; 31 govt colleges linked to MCC codes |
| 2 | Karnataka | KEA | P1 | 2025 | AIR | ✅ | 7,986 | 5 rounds + 3 in-service rounds; 34 colleges + 24 DNB hospitals linked to MCC codes; closing ranks cross-checked against findmybranch (exact match) |
| 3 | Uttar Pradesh | DGME UP (upneet.gov.in) | P1 | 2026 | | ⛔ | | 2025 lists removed from upneet.gov.in (site reset for 2026) and not in the Web Archive. Capture 2026 Round 1 when published (choice filling open Nov 2026) |
| 4 | Tamil Nadu | TN Selection Committee (tnmedicalselection.net) | P1 | 2025 | State rank (GRANK) + NEET roll no. | ⛔ | | 2025 GQ/MQ/PwD lists for R1–R3 + stray downloaded (data/raw/states/tamilnadu). Needs NBEMS full NEET PG 2025 result PDF (roll no. → AIR) to convert ranks. 2026 counselling live now |
| 5 | Kerala | CEE Kerala | P1 | 2025 | AIR | ✅ | 2,879 | 3 phases + stray; 12 govt colleges/cancer centres linked to MCC codes; matches CEE's official last-rank table (11/12 spot checks; in-service quota uses CEE's service rank) |
| 6 | Rajasthan | Rajasthan NEET PG Board (SMS Medical College) | P1 | 2025 | State merit no. + roll no. → AIR via State Merit Lists | ✅ | 3,447 | 3 rounds + stray; rajpgneet2025.in offline (503), PDFs from Internet Archive copies of official URLs; in-service (bonus marks) split into own quota; 17 govt colleges + 20 district hospitals linked; seat category = Allotted Category column (differs from findmybranch, which appears to group by candidate category) |
| 7 | West Bengal | WBMCC | P1 | 2025 | | ⛔ | | 2025 PG archive page has notices only; result PDFs not linked. Web Archive lookup was down (503) — retry |
| 8 | Telangana | KNRUHS | P1 | 2025 | AIR | ✅ | 4,111 | CQ + MQ college-wise lists, 3 phases + additional mop-up + stray (in-service mop-up included); 11 govt colleges linked; matches findmybranch closing ranks (7/7 checks) |
| 9 | Andhra Pradesh | Dr NTR UHS | P1 | 2025 | AIR (closing ranks only) | ✅ | 2,614 closing ranks | Official last-rank table (drntr.uhsap.in/index/adms_lastranks), per seat type × category × local area × round; 17 govt colleges linked |
| 10 | Gujarat | ACPGMEC | P1 | 2025 | | ⏳ | | |
| 11 | Madhya Pradesh | DME MP | P1 | 2025 | | ⏳ | | |
| 12 | Haryana | DMER Haryana / UHSR | P2 | 2025 | | ⏳ | | |
| 13 | Bihar | BCECEB (PGMAC) | P2 | 2025 | | ⏳ | | |
| 14 | Punjab | BFUHS | P2 | 2025 | | ⏳ | | |
| 15 | Odisha | DMET Odisha | P2 | 2025 | | ⏳ | | |
| 16 | Delhi | MCC (DU / IP University quota) | P2 | 2025 | AIR | ⏳ | | Possibly already in our MCC data as quotas; check |
| 17 | Puducherry | CENTAC | P2 | 2025 | | ⏳ | | |
| 18 | Assam | DME Assam | P2 | 2025 | | ⏳ | | |
| 19 | Chhattisgarh | DME Chhattisgarh | P2 | 2025 | | ⏳ | | |
| 20 | Jharkhand | JCECEB | P2 | 2025 | | ⏳ | | |
| 21 | Uttarakhand | HNBUMU | P2 | 2025 | | ⏳ | | |
| 22 | Himachal Pradesh | AMRU | P3 | 2025 | | ⏳ | | |
| 23 | Jammu & Kashmir | JKBOPEE | P3 | 2025 | | ⏳ | | |
| 24 | Goa | DTE Goa (GMC) | P3 | 2025 | | ⏳ | | |
| 25 | Chandigarh | GMCH-32 | P3 | 2024–25 | | ⏳ | | |
| 26 | Manipur | RIMS / JNIMS committee | P3 | 2025 | | ⏳ | | |
| 27 | Tripura | DME Tripura (TRMCC) | P3 | 2025 | | ⏳ | | |
| 28 | Sikkim | H&FW Sikkim (SMIMS) | P3 | 2025 | | ⏳ | | |
| 29 | Meghalaya | NEIGRIHMS | P3 | 2024–25 | | ⏳ | | |

## Other data (after the P1 states)

| Item | Source | Status | Notes |
|---|---|---|---|
| Stipend & service bond by state | State G.O.s, prospectuses | ⏳ | Hand-built table with a source link per state |
| Round calendar / key dates | MCC + state schedule PDFs | ⏳ | |
| Official notices feed + alerts | MCC, NBEMS, NMC, state sites | ⏳ | Needs a scheduled checker |
| INI-CET (AIIMS, JIPMER, PGIMER) | AIIMS allotment PDFs | ⏳ | |
| NEET MDS (MCC, TN, Puducherry) | MCC + state PDFs | ⏳ | |
| Earlier years for states (2023–24) | Same boards | ⏳ | After 2025 is done for P1 states |
