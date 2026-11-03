# State counselling tracker

One row per state counselling board. Update this file whenever a state moves forward. The overall inventory (MCC, states, other data, next checks) is in [DATA.md](DATA.md).

**Status:** ✅ live on the site · 🟡 partial · 📥 downloaded, not parsed · 🔧 in progress · ⏳ queued · ⛔ blocked (reason in notes)

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
| 3 | Uttar Pradesh | DGME UP (upneet.gov.in) | P1 | 2026 R1 | State merit position + roll no. → AIR via UP State Merit List | ✅ | 2,832 (2026 R1) | 2025 lists removed and not archived. 2026 R1 from the Institute Wise Allotted Candidates pages (one ASP.NET page per institute, 71 institutes, saved as HTML). Roll no. matched to the MD/MS merit list (6,084, all matched). PMHS in-service (weightage > 0) own quota; minority campuses own quota; 34 govt colleges linked to MCC codes, private colleges not in MCC. BS/SS codes (only on diploma seats) treated as OBC/SC |
| 4 | Tamil Nadu | TN Selection Committee (tnmedicalselection.net) | P1 | 2025 | State rank (GRANK) + NEET roll no. | ⛔ | | 2025 GQ/MQ/PwD lists for R1–R3 + stray downloaded (data/raw/states/tamilnadu). Needs NBEMS full NEET PG 2025 result PDF (roll no. → AIR) to convert ranks. 2026 counselling live now. 2026-11-03: the 2025 NBEMS result PDF is gone from natboard.edu.in and is not in the Internet Archive; the 2026 one is saved (data/raw/nbems), so 2026 rounds can be converted. 2026 R1 not out yet (PwD list out 31-10-2026) |
| 5 | Kerala | CEE Kerala | P1 | 2025 | AIR | ✅ | 2,879 | 3 phases + stray; 12 govt colleges/cancer centres linked to MCC codes; matches CEE's official last-rank table (11/12 spot checks; in-service quota uses CEE's service rank) |
| 6 | Rajasthan | Rajasthan NEET PG Board (SMS Medical College) | P1 | 2025 | State merit no. + roll no. → AIR via State Merit Lists | ✅ | 3,447 | 3 rounds + stray; rajpgneet2025.in offline (503), PDFs from Internet Archive copies of official URLs; in-service (bonus marks) split into own quota; 17 govt colleges + 20 district hospitals linked; seat category = Allotted Category column (differs from findmybranch, which appears to group by candidate category) |
| 7 | West Bengal | WBMCC (wbmcc.nic.in) | P1 | 2025 R2 + stray | AIR | 🟡 | 839 (R2) + 50 (stray) | Result PDFs use fonts with no text mapping, so they are read by OCR: pipeline/ocr-grid.ts renders each page with NamahaPDF, takes the cell boxes from the PDF's own ruling lines and OCRs each column strip with NamahaPDF's PaddleOCR (cached in data/raw/states/westbengal/ocr). Ranks checked: all 889 in strict order, no duplicates. The R2 result lists every seat held after R2 (R1 Retained / Not Upgraded + R2 Fresh / Upgraded). Files found via Internet Archive snapshots of the PG Medical page (Jan and Mar 2026); R1 and R3 results were never captured. The "Provisional List of Candidates" PDFs for R1–R3 and stray are eligibility lists, not allotments. Private colleges (KPC, IQ City, Gouri Devi, JIS, ICARE, Sanaka, RKM Seva Pratishthan, Jagannath Gupta) not in MCC. 2026 R1 due 4 Nov |
| 8 | Telangana | KNRUHS | P1 | 2025 | AIR | ✅ | 4,111 | CQ + MQ college-wise lists, 3 phases + additional mop-up + stray (in-service mop-up included); 11 govt colleges linked; matches findmybranch closing ranks (7/7 checks) |
| 9 | Andhra Pradesh | Dr NTR UHS | P1 | 2025 | AIR (closing ranks only) | ✅ | 2,614 closing ranks | Official last-rank table (drntr.uhsap.in/index/adms_lastranks), per seat type × category × local area × round; 17 govt colleges linked |
| 10 | Gujarat | ACPPGMEC (medadmgujarat.org) | P1 | 2025 + 2026 R1 | AIR | ✅ | 5,861 (2025) + 2,329 (2026 R1) | 3 rounds + stray; 7 govt colleges linked; closing ranks match ACPPGMEC's official last-merit table (5/5). Archive back to 2021 available (compiled closures) |
| 11 | Madhya Pradesh | DME MP (dme.mponline.gov.in) | P1 | 2025 + 2026 R1 | AIR | ✅ | 3,082 (2025) + 1,110 (2026 R1) | Round 1, Round 2, mop-up (2025) + 2026 Round 1; govt + private colleges; 16 govt colleges + 8 district hospitals linked to MCC codes. 2025 mop-up PDF no longer linked on DME site — taken from Medical Dialogues' copy of the official PDF. 2025 stray round list not found yet. Opening/closing rank PDFs also downloaded (not used) |
| 12 | Haryana | DMER Haryana (hry.online-counselling.co.in) | P2 | 2025 R1 | AIR | ✅ | 450 (R1 only) | Portal reset for 2026 and file links are 10-minute signed URLs; 2025 Round 1 from Collegedunia's copy of the portal PDF. Rounds 2/3/stray not found. IS = in-service, IP = institutional preference. Closing ranks match public 2025 statewide cutoffs (5/5). 2026 MD/MS counselling not started yet (only MDS on the portal) |
| 13 | Bihar | BCECEB (PGMAC) | P2 | 2025 R2–stray | AIR | ✅ | 1,319 | Revised Round 2, revised Round 3, stray (bceceboard.bihar.gov.in/pdf_Result/…PGMAC25_ALT_R*.pdf). Round 1 was withdrawn/re-issued and is no longer on the site. Govt + private (state, NRI, Muslim/Sikh minority) seats; 9 govt colleges linked. Closing ranks match public 2025 cutoffs (8/8). Women-only seats merged into their category |
| 14 | Punjab | BFUHS | P2 | 2025 R1–R2 + 2026 R1 | Merit no. + roll no. → AIR via merit lists | ✅ | 644 (2025) + 546 (2026 R1) | 2025 R1 (revised) and R2 (revised) from Medical Dialogues' copies; R3/stray lists not found. 2025 R1 merit list gone, so 141 of 510 R1 allotments have no AIR and are dropped. PCMS (incentive marks) split into in-service quota. PDF text is messy (doubled bold glyphs, overlapping cells) — colleges matched by name key. 2026 R1 provisional list (02-11-2026) included |
| 15 | Odisha | DMET Odisha (dmetodisha.in) | P2 | 2025 R1 | Roll no. → AIR via Odisha eligible list | 🟡 | 180 | Final admitted list for R1 + upgraded R1 (18-12-2025), from the Internet Archive copy of the official PDF. INS = in-service (own quota), GCH = green card holder, ES = ex-servicemen ward; Hi-Tech (MGT) = management seats. R2 notice and R3 merit list also archived but have no allotment table. 2026 R1 due 5 Nov (dmetodisha.gov.in certificate expired; use dmetodisha.in) |
| 16 | Delhi | MCC (DU / IP University quota) | P2 | 2025 | AIR | ✅ | (in MCC data) | Delhi's state seats are counselled by MCC as "Delhi University Quota" and "IP University Quota" — already in the MCC rounds |
| 17 | Puducherry | CENTAC (centacpuducherry.in) | P2 | 2025 | | ⛔ | | Old centaconline.in is gone (410). New site centacpuducherry.in only lists 2026 (PG medical applications open; MDS rounds done). Take 2026 rounds |
| 18 | Assam | DME Assam (dme.assam.gov.in) | P2 | 2025 R2 | Roll no. → AIR via Assam State Merit List | 🟡 | 373 | Round 2 select list (Admission Notice-NEET-PG 2025 Round-2) is the only 2025 list; R1, R3 and stray were notices only. Seat code = college (2 digits) + subject (2 digits), subject named from the code. SHQ = State Health service (in-service) quota. ST(P)/ST(H) = plains/hills. 8 colleges linked to MCC codes |
| 19 | Chhattisgarh | DME CG (cgdme.admissions.nic.in) | P2 | 2025 + 2026 R1 | AIR | ✅ | 543 (2025) + 278 (2026 R1) | 2025 R1/R2 cancelled 22-01-2026 and re-run as combined R1&R2 (shown as Round 1), then mop-up, stray, extended stray. In-service (bonus marks) own quota. 7 govt colleges linked. Matches official OR-CR (7/7 via state rank) |
| 20 | Jharkhand | JCECEB (neetpg.jceceb.co.in) | P2 | 2025 | | ⛔ | | 2025 allotments were on the counselling portal, now reset for 2026 (merit list out 28-10-2026). Take 2026 Round 1 |
| 21 | Uttarakhand | HNBUMU (meta-secure.com portal) | P2 | 2025 | | ⛔ | | 2025 results were on the external counselling portal, now running 2026. Take 2026 Round 1 |
| 22 | Himachal Pradesh | AMRU (amruhp.ac.in) | P3 | 2025 | Merit no. + application no. → AIR via merit lists | ✅ | 396 | Rounds 1–3, stray, 2nd stray (final allocations). In-service (incentive marks) own quota. 6 govt colleges linked. Closing ranks match public 2025 cutoffs (9/9). Files found via the site's WordPress media API |
| 23 | Jammu & Kashmir | JKBOPEE (jkbopee.gov.in) | P3 | 2025 | AIR in some rounds, else roll → AIR via merit list | ✅ | 844 | Rounds 1–3, physical (mop-up), stray, stray 2, plus ASCOMS Hindu-minority/NRI lists. In-service (DA marks) own quota. 7 govt colleges linked. Matches public 2025 cutoffs (6/6). 14 R3 candidates lack a rank |
| 24 | Goa | DTE Goa (dte.goa.gov.in) | P3 | 2024 + 2025 R2–R3 + 2026 R1 | AIR (R3 via reg. no. from R2; 2024 via the 2024 merit list) | ✅ | 128 (2024) + 82 (2025) + 72 (2026 R1) | Goa Medical College state quota. 2025 Round 1 file no longer on the site. SR (seat retained) and OCNA rows skipped |
| 25 | Chandigarh | GMCH-32 (gmch.gov.in) | P3 | 2025 | | ⛔ | | 2025 result PDFs no longer listed. gmch.gov.in certificate is revoked, so nothing is downloaded from it. Take 2026 rounds via a mirror |
| 26 | Manipur | State PG committee (JNIMS/RIMS) | P3 | 2025 | | ⛔ | | No PG allotment lists published on the health directorate site (UG only). RIMS/JNIMS AIQ seats are in the MCC data |
| 27 | Tripura | DME Tripura (dme.tripura.gov.in) | P3 | 2025 | | ⛔ | | Notification archive has no 2025 PG lists (2023 then 2026). AGMC AIQ seats are in the MCC data |
| 28 | Sikkim | H&FW / HRDD Sikkim (SMIMS) | P3 | 2025 | | ⛔ | | No official 2025 list found; tiny private-college pool |
| 29 | Meghalaya | NEIGRIHMS | P3 | 2025 | | ⛔ | | NE-open state pool is tiny (8 allotted in R1); no list found. NEIGRIHMS AIQ seats are in the MCC data |

## Earlier years (state)

| State | Years | Source / notes |
|---|---|---|
| Kerala | 2024 | cee.kerala.gov.in/pgm2024 allotment lists (7 rounds); 2024 lists have seat type only, no candidate category |
| Maharashtra | 2024 | medical2024.mahacet.org NEET-PGM-2024; R3 list lost (same file name reused for special stray); only R1 merit list online |
| Telangana | 2024 | KNRUHS admission-notification pages ~79–91 (Jan–Mar 2025), CQ P1–P8 and MQ P1–P6 college-wise lists |
| Madhya Pradesh | 2024 | DME MP Previous Year Notification (2024): R1, R2, mop-up |
| Gujarat | 2023, 2024 | ACPPGMEC Compiled_Closure_PG_<year>.pdf: final last rank per branch × college × quota × category |
| Andhra Pradesh | – | last-rank tool now offers 2025-26 only |
| Bihar, Karnataka | – | 2024 lists no longer online |

## Other data (after the P1 states)

| Item | Source | Status | Notes |
|---|---|---|---|
| Stipend & service bond by state | State G.O.s, prospectuses | ⏳ | Hand-built table with a source link per state |
| Round calendar / key dates | MCC + state schedule PDFs | ⏳ | |
| Official notices feed + alerts | MCC, NBEMS, NMC, state sites | ⏳ | Needs a scheduled checker |
| INI-CET (AIIMS, JIPMER, PGIMER) | AIIMS allotment PDFs | ⏳ | |
| NEET MDS (MCC, TN, Puducherry) | MCC + state PDFs | ⏳ | |
| Earlier years for states (2023–24) | Same boards | ⏳ | After 2025 is done for P1 states |
