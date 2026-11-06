# Data inventory

The one place that says what data the site has, what is missing, and why. **Update it in the same commit as any data change.**
State-by-state detail (sources, quirks, row counts, checks) lives in [STATES.md](STATES.md).

Last updated: 2026-11-06.

Cross-check (2026-11-04): 96 Round 1 closing ranks (rank and seat count) compared by hand with neetvantage.com across MCC 2023–26, Karnataka, Maharashtra, West Bengal, Haryana, MP and Rajasthan: 96/96 match. Nothing copied from it. A dataset-wide outlier scan found and fixed: Bihar DQ (Divyang) seats filed as non-PwD, MP in-service candidates on general seats (now in-service quota), Punjab PwD / NRI seats inside other quotas, Punjab 2026 ranks printed as "1E+05" (now from the NBEMS 2026 result), J&K sports seats.

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
| Karnataka (+ in-service) | ✅ R1–R3, stray, special stray | ⏳ | 2024: R1, R2, R3, first stray (R4, 25-02-2025), second stray (state lists only) |
| Kerala | ✅ R1–R3, stray | ⏳ | |
| Andhra Pradesh | ✅ R1–R3, stray | ⏳ | 2025: closing ranks only (official last-rank table) |
| Rajasthan | ✅ R1–R3, stray | ✅ R1 | 2026 R1 (1,365) from pg.neetrajasthan.com via the GitHub mirror (sha256 matches) |
| Telangana | ✅ R1–R3, mop-up, stray | ⏳ | |
| Gujarat | ✅ R1–R3, stray | ✅ R1 | |
| Madhya Pradesh | 🟡 R1, R2, mop-up (no stray) | ✅ R1 | |
| Haryana | 🟡 R1, R3, stray (no R2) | ⏳ | R3 (revised 17-02-2026) and stray (24-02-2026) from DMER PDF copies on a consultancy's public Google Drive; R2 only on the portal's expired signed links |
| Bihar | ✅ R1 (revised), R2, R3, stray | ⏳ | R1 = REV_PGMAC25_FALT.pdf, still on the board site |
| Punjab | ✅ R1, R2, R3, stray | ✅ R1 | R3 (10-02-2026) from a Drive copy of the BFUHS PDF; stray from the Internet Archive copy |
| Chhattisgarh | ✅ R1, mop-up, stray, special stray | ✅ R1 | |
| Himachal Pradesh | ✅ R1–R3, stray, special stray | ⏳ | |
| Jammu & Kashmir | ✅ R1–R3, mop-up, stray, special stray | ✅ R1 | 2026 R1 added 2026-11-04 (notice 250, re-issued as nid 19360; the earlier nid 19361 link was empty) |
| Goa | ✅ R1, R2, R3, stray | ✅ R1 | R1 (neetpg2025merallot.pdf) and stray (strayrndallotlist.pdf) still on dte.goa.gov.in |
| **Uttar Pradesh** | 🟡 R1 MD/MS (2,733); R2, R3, stray not found | ✅ R1 | 2026 R1 added 2026-11-03. 2025 R1 from a consultancy's public Google Sheet export of upneet's pages (its 2026 sheet matched our own scrape 2,832/2,832); AIR via DGME UP's own 2025 merit lists |
| **Assam** | 🟡 R1, R2 (2024: R1) | ⏳ | R1 select list from the Internet Archive (10-12-2025); R2 now keeps only seats that changed from R1 (159, was 373 incl. held seats); R3/stray notices without lists |
| **Odisha** | ✅ R1, R2, R3, stray | ✅ R1 (04-11-2026, 374; AIR via the revised final merit list of 30-10-2026) | R2 = revised common allotment (21-12-2025); R3 / stray = rows admitted in R-3 / R-4 in the final admission list after stray (25-02-2026); Internet Archive copies |
| **West Bengal** | ✅ R1–R3, stray | ⏳ R1 due 4 Nov | added 2026-11-03. Result PDFs have no text mapping, read with NamahaPDF OCR (`pipeline/ocr-grid.ts`). R1 and R3 result files not found in any archive snapshot |
| Tamil Nadu | ⛔ needs NBEMS 2025 result | ⏳ R1 not out (PwD list out 31 Oct) | 2025 lists give TN rank + roll no. only; the 2025 NBEMS result is offline and not archived |
| Delhi | ✅ via MCC | ✅ via MCC | DU / IP University quotas are MCC rounds |
| **Jharkhand** | ✅ R1, R2, R3, stray (2024: R1–R3, stray, special stray) | ✅ R1 (03-11-2026) | added 2026-11-04: JCECEB allotment PDFs still on jceceb.jharkhand.gov.in/download/; AIR from the NBEMS result by roll no.; incentive marks > 0 = in-service quota |
| **Uttarakhand** | ✅ R1, R2, R3, stray (+ NRI rounds; 2024: R1–R3, stray, special stray) | ✅ R1 (315) | added 2026-11-04: HNBUMU broad sheets still on meta-secure.com/MDMS2024/UploadDocs/; NEET rank printed |
| **Puducherry** | ✅ R1 (admitted list), R2, R3, stray (2024: R1–R3, stray, special stray) | ⏳ | added 2026-11-04: CENTAC's own Google Drive copies of the provisional allotment lists (links from t.me/SRISAINEETPG); AIR printed in the lists |
| Chandigarh | ⛔ | ⏳ | gmch.gov.in certificate revoked (cannot download safely) |
| Manipur, Tripura, Sikkim, Meghalaya | ⛔ no PG lists published | ⏳ | tiny pools; AIQ seats are in MCC data |

## 3. Other data the competitor sites show

| Data | Status | Notes |
|---|---|---|
| Fees per college | 🟡 | Yearly tuition per college × branch × quota, shown in the predictor (8,100+ state fees + MCC profile fees). Official sources per state are named in pipeline/states/fees.ts and build-dataset.ts. ⛔ No official document: Kerala self-financing (fee notice removed), Chhattisgarh private colleges (CGDME has no fee file), ASCOMS Jammu, Telangana Category C (only "up to 3× B") and Telangana government colleges ("as notified", not published), MCC DNB hospitals (no fee declared to MCC). Maharashtra uses FRA 2024-25 approved fees (FRA's API returns nothing for 2025-26). NRI fees in US$ not recorded |
| Score → rank (/score-to-rank) | ✅ | `data/score2rank.json` (pipeline/score-table.ts) from the NBEMS 2025 and 2026 results: best/worst AIR and candidate count per score. ⛔ 2024 prints percentile, not score. Rebuild after each new NBEMS result |
| Quota eligibility (/eligibility) | 🟡 | MCC quotas from MCC's rules; state quotas judged from the quota type in our labels (State Quota, Institutional, Management, NRI, In-service, open to all), shown as "likely" / "check the brochure". ⬜ Per-state domicile rules from each brochure (texts for AP, Bihar, CG, Haryana, J&K, Rajasthan, HP, Maharashtra are in pipeline/scratch) |
| Clinical load (OPD/IPD/beds), merit-list position, round alerts | ⬜ | Rank and Seats / ZyNerd show these. Clinical load needs NMC or college data; alerts need accounts (after Razorpay) |
| State-specific categories in the predictor | ✅ | "State category" picker (e.g. Karnataka Cat-2A, Maharashtra NT-C, Telangana BC-B) applies to that state's quotas. Not yet in the saved-list page |
| Stipend and service bond by state | 🟡 | ✅ Stipend by state (MCC profiles). ✅ Bond / seat-leaving rules for 18 states from official documents: Andhra Pradesh, Bihar, Chhattisgarh, Goa, Gujarat, Haryana, Himachal, J&K (no general bond; Ladakh candidates only), Karnataka (seat-cancellation penalties only; the service-bond clause is in the e-bulletin, not found online), Kerala, Madhya Pradesh, Maharashtra, Odisha, Punjab (security deposit only), Rajasthan, Telangana, Uttar Pradesh, West Bengal. ⏳ Assam (DME file links return 404) |
| Round calendar / key dates | ✅ | /calendar from MCC's 2026 schedules (data/calendar2026.json); update when MCC revises |
| Official notices feed + alerts | 🟡 | ✅ /notices reads MCC + 10 state sites hourly. ⬜ Other states load notices by script (linked only). ⬜ Email/push alerts |
| INI-CET (AIIMS, JIPMER, PGIMER) | ⬜ | Gettable (AIIMS publishes round PDFs) but a separate exam with its own rank: needs its own predictor input and pages |
| NEET MDS (dental) | ⬜ | Gettable, but a separate exam and dataset (dental colleges, MDS branches) |
| State data before 2025 | 🟡 | ✅ 2024: Kerala, Maharashtra (R3 list lost; later-round candidates partly without AIR), Telangana, Madhya Pradesh, Himachal (R1–R3), West Bengal (R1–R3, stray, special stray), Gujarat (final closing ranks; also 2023), Goa (R1, R3, stray, special stray; R2 never archived), Chhattisgarh (R1 revised, R2, mop-up, stray), Punjab (R1–R3, special stray), Odisha (R1–R3), J&K (R1–R3, mop-up, stray, special stray; OCR of scans), Rajasthan (R1–R3, stray, special stray; R1/R2 from github.com/pramod-zillella/neet-rajasthan-pg-counselling, sha256-verified copies of the board's PDFs; its R3 copy is byte-identical to our archived one), Andhra Pradesh (Phase I–III, stray, special stray, 4,782 allotments, from archived NTR UHS college-wise lists; MQ special stray not archived), Bihar (R1, R2, R3, stray, special stray, still on BCECEB under pdf_Web/; R3 = FINAL_3RD_ROUND_2024_02_03.pdf), Assam (R1 only, archived DME select list), Karnataka (R1, R2, R3 mop-up, first stray, second stray; still on KEA under keawebentry456/pget2024/), Tamil Nadu (R1, R2, R3, mop-up, stray, special stray, 4,353 seats; still on tnmedicalselection.net/news/ but unlinked, found through the Internet Archive's captures of the home page; AIR via the 2024 rank lists + NBEMS 2024 result), Jharkhand (R1–R3, stray, special stray), Puducherry (R1–R3, stray, special stray; CENTAC's Google Drive copies), Uttarakhand (R1–R3, stray, special stray; HNBUMU broad sheets), Haryana (R1, R2, R3, stray; R3/stray from DMER PDF copies on a consultancy's public Google Drive, linked from t.me/SRISAINEETPG). AIR for Punjab, Odisha, J&K, Rajasthan, Assam 2024 comes from the NBEMS 2024 result. ⛔ 2024: UP (all rounds), Assam R2+, AP MQ special stray, Maharashtra R3 (file name reused) |

## 4. Rank conversion sources (not shown on the site, used by the parsers)

| File | Covers | Status |
|---|---|---|
| `data/raw/nbems/neetpg2026_result.pdf` | every NEET PG 2026 roll no. → All India Rank and score | 📥 downloaded 2026-11-03 (natboard.edu.in/pdoof/), use for any 2026 list that prints only roll numbers |
| NEET PG 2025 full result | every 2025 roll no. → rank | ✅ found via CollegeDekho's copy; the original is still on natboard.edu.in (natboard-data/pdf/NEETPG2025RESULT/…). 230,096 candidates → data/raw/nbems/neetpg2025_air.json (pipeline/nbems-result.ts). Unblocked Tamil Nadu 2025 |
| NEET PG 2024 full result | every 2024 roll no. → percentile + rank | ✅ NBEMS PDF (1,442 pages, unaltered NBEMS headers) via Zynerd's copy. Unblocks Punjab, Odisha, J&K 2024 |
| State merit lists (UP, Assam, Odisha, Rajasthan, Punjab, HP, J&K, Maharashtra) | that state's candidates | ✅ stored next to each state's PDFs |

## 5. Next checks

| When | What |
|---|---|
| 5 Nov 2026 | West Bengal 2026 R1 (wbmcc.nic.in; not out on 4 Nov, only the Round 1 provisional candidate list); Jharkhand 2026 R1 (neetpg.jceceb.co.in; not out on 4 Nov, latest is the 29-10 merit list) |
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