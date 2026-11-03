# Data inventory

The one place that says what data the site has, what is missing, and why. **Update it in the same commit as any data change.**
State-by-state detail (sources, quirks, row counts, checks) lives in [STATES.md](STATES.md).

Last updated: 2026-11-03.

**Status:** ✅ on the site · 🟡 partial (some rounds missing) · 📥 downloaded, not parsed yet · ⏳ not published yet · ⛔ blocked · ⬜ not started

## 1. MCC (All India counselling)

| Data | Years | Status | Where it comes from |
|---|---|---|---|
| Allotments, all rounds (AIQ, deemed, central universities, DNB) | 2023, 2024, 2025 | ✅ | mcc.nic.in result PDFs → `data/parsed/mcc20xx_*.json` |
| Allotments 2026 | Round 1 | ✅ | Round 2 onwards ⏳ as MCC publishes |
| Seat matrix (AIQ, deemed, central, DNB) | 2023–2026 | ✅ | MCC seat matrix PDFs (`data/raw/sm20xx_*.pdf`) |
| Institute profiles (fees, stipend, bond, hostel) | current | ✅ | MCC institute profile pages, 2,036 institutes |
| Allotments before 2023 | 2021–2022 | ⬜ | MCC archive |

## 2. State counselling (allotments → closing ranks)

All ranks shown on the site are All India Ranks. Where a state prints only its own merit number or roll number, it is converted through that state's merit list or the NBEMS result (see section 4).

| State | 2025 | 2026 | Notes |
|---|---|---|---|
| Maharashtra | ✅ R1–R3, stray, special stray | ⏳ | |
| Karnataka (+ in-service) | ✅ R1–R3, stray, special stray | ⏳ | |
| Kerala | ✅ R1–R3, stray | ⏳ | |
| Andhra Pradesh | ✅ R1–R3, stray | ⏳ | closing ranks only (official last-rank table) |
| Rajasthan | ✅ R1–R3, stray | ⏳ | |
| Telangana | ✅ R1–R3, mop-up, stray | ⏳ | |
| Gujarat | ✅ R1–R3, stray | ✅ R1 | |
| Madhya Pradesh | 🟡 R1, R2, mop-up (no stray) | ✅ R1 | |
| Haryana | 🟡 R1 only | ⏳ | R2/R3/stray not found |
| Bihar | 🟡 R2, R3, stray (R1 withdrawn) | ⏳ | |
| Punjab | 🟡 R1, R2 | ✅ R1 | |
| Chhattisgarh | ✅ R1, mop-up, stray, special stray | ✅ R1 | |
| Himachal Pradesh | ✅ R1–R3, stray, special stray | ⏳ | |
| Jammu & Kashmir | ✅ R1–R3, mop-up, stray, special stray | ⏳ | |
| Goa | 🟡 R2, R3 | ✅ R1 | 2025 R1 file gone |
| **Uttar Pradesh** | ⛔ lists removed, no copies | ✅ R1 | added 2026-11-03 |
| **Assam** | 🟡 R2 only | ⏳ | added 2026-11-03; R1/R3/stray were notices without lists |
| **Odisha** | 🟡 R1 + upgraded R1 (admitted list) | ⏳ R1 due 5 Nov | added 2026-11-03 from Internet Archive copies |
| **West Bengal** | 🟡 R2 (all seats held after R2) + stray | ⏳ R1 due 4 Nov | added 2026-11-03. Result PDFs have no text mapping, read with NamahaPDF OCR (`pipeline/ocr-grid.ts`). R1 and R3 result files not found in any archive snapshot |
| Tamil Nadu | ⛔ needs NBEMS 2025 result | ⏳ R1 not out (PwD list out 31 Oct) | 2025 lists give TN rank + roll no. only; the 2025 NBEMS result is offline and not archived |
| Delhi | ✅ via MCC | ✅ via MCC | DU / IP University quotas are MCC rounds |
| Jharkhand | ⛔ portal reset | ⏳ R1 due 3–4 Nov | |
| Uttarakhand | ⛔ portal reset | ⏳ R1 not out (merit list out) | |
| Puducherry | ⛔ old site gone | ⏳ applications open | new site: centacpuducherry.in |
| Chandigarh | ⛔ | ⏳ | gmch.gov.in certificate revoked (cannot download safely) |
| Manipur, Tripura, Sikkim, Meghalaya | ⛔ no PG lists published | ⏳ | tiny pools; AIQ seats are in MCC data |

## 3. Other data the competitor sites show

| Data | Status | Notes |
|---|---|---|
| Fees per college | 🟡 | Yearly tuition per college × branch × quota, shown in the predictor. Sources: MCC institute profiles (MCC seats, government colleges in every state); state orders: Karnataka (KEA lists), Gujarat (ACPPGMEC), Rajasthan (govt + 6 private colleges), Andhra Pradesh (NTRUHS A/B/C), Telangana (G.O.Ms.107), Madhya Pradesh (DME fee report), West Bengal (fee committee memo), Bihar (8 college letters), Punjab (Govt corrigendum 2025), Himachal (AMRU prospectus). NRI fees in US$ are not recorded. ⛔ Kerala fee PDFs removed. Still to do: Maharashtra (FRA, per college), Uttar Pradesh (per-college scans), Chhattisgarh (no fee file found on CGDME), Haryana, Odisha private, J&K private, Telangana govt colleges without MCC code, 6 newer Telangana colleges (not in the fee order) |
| State-specific categories in the predictor | ✅ | "State category" picker (e.g. Karnataka Cat-2A, Maharashtra NT-C, Telangana BC-B) applies to that state's quotas. Not yet in the saved-list page |
| Stipend and service bond by state | 🟡 | ✅ Stipend by state (government colleges, from MCC profiles) on Colleges & Fees. ⬜ Bond rules: not in any data source; needs each state's government order / brochure (manual research) |
| Round calendar / key dates | ✅ | /calendar from MCC's 2026 schedules (data/calendar2026.json); update when MCC revises |
| Official notices feed + alerts | 🟡 | ✅ /notices reads MCC + 10 state sites hourly. ⬜ Other states load notices by script (linked only). ⬜ Email/push alerts |
| INI-CET (AIIMS, JIPMER, PGIMER) | ⬜ | Gettable (AIIMS publishes round PDFs) but a separate exam with its own rank: needs its own predictor input and pages |
| NEET MDS (dental) | ⬜ | Gettable, but a separate exam and dataset (dental colleges, MDS branches) |
| State data before 2025 | ⬜ | Gujarat goes back to 2021 |

## 4. Rank conversion sources (not shown on the site, used by the parsers)

| File | Covers | Status |
|---|---|---|
| `data/raw/nbems/neetpg2026_result.pdf` | every NEET PG 2026 roll no. → All India Rank and score | 📥 downloaded 2026-11-03 (natboard.edu.in/pdoof/), use for any 2026 list that prints only roll numbers |
| NEET PG 2025 full result | every 2025 roll no. → rank | ⛔ removed from natboard, not in the Internet Archive. Blocks Tamil Nadu 2025 |
| State merit lists (UP, Assam, Odisha, Rajasthan, Punjab, HP, J&K, Maharashtra) | that state's candidates | ✅ stored next to each state's PDFs |

## 5. Next checks

| When | What |
|---|---|
| 4 Nov 2026 | West Bengal 2026 R1 (wbmcc.nic.in); Jharkhand 2026 R1 (jceceb.jharkhand.gov.in) |
| 5 Nov 2026 | Odisha 2026 R1 (dmetodisha.in; the .gov.in site's certificate has expired) |
| this week | Uttarakhand 2026 R1 (meta-secure.com/HNBUMU_MDMS), Tamil Nadu 2026 R1, Assam 2026 R1 |
| after each round | MCC 2026 R2+, later 2026 rounds for UP, Gujarat, MP, Punjab, Chhattisgarh, Goa |


### Fee coverage (college × branch × quota with a fee), 2026-11-03

```
MCC              12370/21022  58%   no-MCC-code colleges: 0/304
Karnataka         2405/ 2405 100%   no-MCC-code colleges: 1747/1747
Andhra Pradesh    1202/ 1425  84%   no-MCC-code colleges: 864/991
Gujarat            821/ 1210  67%   no-MCC-code colleges: 653/924
Telangana          638/ 1205  52%   no-MCC-code colleges: 446/979
Maharashtra        453/ 1088  41%   no-MCC-code colleges: 0/598
Rajasthan          597/  920  64%   no-MCC-code colleges: 188/384
Madhya Pradesh     674/  718  93%   no-MCC-code colleges: 375/410
Uttar Pradesh      311/  711  43%   no-MCC-code colleges: 0/379
Kerala             198/  613  32%   no-MCC-code colleges: 0/410
West Bengal        364/  442  82%   no-MCC-code colleges: 134/172
Bihar              285/  354  80%   no-MCC-code colleges: 154/223
Punjab             352/  353  99%   no-MCC-code colleges: 165/166
Haryana            100/  278  35%   no-MCC-code colleges: 0/138
Chhattisgarh       103/  224  45%   no-MCC-code colleges: 0/111
Himachal Pradesh   118/  130  90%   no-MCC-code colleges: 30/42
Assam              129/  129 100%   no-MCC-code colleges: 0/0
Jammu & Kashmir     91/  123  73%   no-MCC-code colleges: 0/32
Odisha              76/  101  75%   no-MCC-code colleges: 0/19
Goa                 22/   22 100%   no-MCC-code colleges: 0/0
```