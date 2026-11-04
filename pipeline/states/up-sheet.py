"""UP NEET PG allotment sheet (an .xlsx export of upneet.gov.in's institute-wise "Allotted Candidates" pages, same columns:
Branch Name | Serial No. | Round | Allotted under Category | Rollno | Name | Father's Name | Rank | Allottment Date | Left Institute |
Left Course | Institute Name) -> a TSV beside it with only what up.ts reads: branch, round + category, roll, state position, institute.
Names are not written.

Usage: python -I pipeline/states/up-sheet.py data/raw/states/up/2025_r1/allotted_mdms_sheet.xlsx
"""
import sys, openpyxl
src = sys.argv[1]; dst = src.rsplit('.', 1)[0] + '.tsv'
num = lambda x: str(int(float(x))) if x not in (None, '') else ''
n = 0
with open(dst, 'w', encoding='utf8') as out:
    for ws in openpyxl.load_workbook(src, read_only=True).worksheets:
        for r in ws.iter_rows(values_only=True):
            if not r or not r[2] or not str(r[2]).strip().startswith('Round') or str(r[2]).strip() == 'Round': continue
            out.write('\t'.join([str(r[0]).strip(), (str(r[2]).strip() + ' ' + str(r[3] or '').strip()).strip(), num(r[4]), num(r[7]), str(r[11] or '').strip()]) + '\n'); n += 1
print(f'{dst}: {n} rows')
