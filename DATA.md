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
| Fees per college | 🟡 | Yearly tuition per college × branch × quota, shown in the predictor (8,100+ state fees + MCC profile fees). Official sources per state are named in pipeline/states/fees.ts and build-dataset.ts. ⛔ No official document: Kerala self-financing (fee notice removed), Chhattisgarh private colleges (CGDME has no fee file), ASCOMS Jammu, Telangana Category C (only "up to 3× B") and Telangana government colleges ("as notified", not published), MCC DNB hospitals (no fee declared to MCC). Maharashtra uses FRA 2024-25 approved fees (FRA's API returns nothing for 2025-26). NRI fees in US$ not recorded |
| State-specific categories in the predictor | ✅ | "State category" picker (e.g. Karnataka Cat-2A, Maharashtra NT-C, Telangana BC-B) applies to that state's quotas. Not yet in the saved-list page |
| Stipend and service bond by state | 🟡 | ✅ Stipend by state (MCC profiles). ✅ Bond / seat-leaving rules for 17 states from official documents: Andhra Pradesh, Bihar, Chhattisgarh, Goa, Gujarat, Haryana, Himachal, J&K (no general bond; Ladakh candidates only), Karnataka (seat-cancellation penalties only; the service-bond clause is in the e-bulletin, not found online), Kerala, Madhya Pradesh, Maharashtra, Odisha, Punjab (security deposit only), Telangana, Uttar Pradesh, West Bengal. ⏳ Rajasthan (rajpgneet site down, archive down), Assam (DME file links return 404) |
| Round calendar / key dates | ✅ | /calendar from MCC's 2026 schedules (data/calendar2026.json); update when MCC revises |
| Official notices feed + alerts | 🟡 | ✅ /notices reads MCC + 10 state sites hourly. ⬜ Other states load notices by script (linked only). ⬜ Email/push alerts |
| INI-CET (AIIMS, JIPMER, PGIMER) | ⬜ | Gettable (AIIMS publishes round PDFs) but a separate exam with its own rank: needs its own predictor input and pages |
| NEET MDS (dental) | ⬜ | Gettable, but a separate exam and dataset (dental colleges, MDS branches) |
| State data before 2025 | 🟡 | ✅ 2024: Kerala, Maharashtra (R3 list lost; later-round candidates partly without AIR), Telangana, Madhya Pradesh, Himachal (R1–R3), West Bengal (R2, R3, stray, special stray; R1 never archived), Gujarat (final closing ranks; also 2023), Goa (R1, R3, stray, special stray from archived DTE files; R2 never archived, so R3 includes R2's changes), Chhattisgarh (R1 revised, R2, mop-up, stray; files located through Internet Archive listings of the DME uploads folder), Haryana (R1 only, DMER list hosted by UHSR; later rounds to retry when UHSR/the archive respond). ⛔ 2024: Andhra Pradesh, Bihar, Karnataka (files removed); Odisha, Punjab and J&K (2024 lists and merit lists give only state percentile / state rank, no All India Rank — NBEMS gave states percentiles in 2024; J&K 2024 R1–R3, mop-up, stray, special stray and merit lists are downloaded in data/raw/states/jk as scans). Possible workaround: the 2024 NBEMS result PDF listed every roll no. with marks; ranking by marks gives AIR up to ties — that PDF is not yet found (not in the Internet Archive, natboard removed it). ⏳ Assam 2024 (site returned 404 for all files today; retry), Rajasthan not yet checked (archive was down), Haryana R2+ (UHSR 503) |

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
Gujarat           1195/ 1210  98%   no-MCC-code colleges: 912/924
Telangana          693/ 1205  57%   no-MCC-code colleges: 501/979
Maharashtra        775/ 1088  71%   no-MCC-code colleges: 322/598
Rajasthan          597/  920  64%   no-MCC-code colleges: 188/384
Madhya Pradesh     674/  718  93%   no-MCC-code colleges: 375/410
Uttar Pradesh      675/  711  94%   no-MCC-code colleges: 364/379
Kerala             202/  613  32%   no-MCC-code colleges: 0/410
West Bengal        364/  442  82%   no-MCC-code colleges: 134/172
Bihar              285/  354  80%   no-MCC-code colleges: 154/223
Punjab             352/  353  99%   no-MCC-code colleges: 165/166
Haryana            202/  278  72%   no-MCC-code colleges: 102/138
Chhattisgarh       103/  224  45%   no-MCC-code colleges: 0/111
Himachal Pradesh   118/  130  90%   no-MCC-code colleges: 30/42
Assam              129/  129 100%   no-MCC-code colleges: 0/0
Jammu & Kashmir     91/  123  73%   no-MCC-code colleges: 0/32
Odisha              87/  101  86%   no-MCC-code colleges: 11/19
Goa                 22/   22 100%   no-MCC-code colleges: 0/0
```