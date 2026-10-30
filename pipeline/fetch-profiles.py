"""
Download MCC's per-institute profile PDFs (fee, stipend, hostel, resignation rules) for the current PG season.

MCC's "View Institute Profile" report lists every participating institute; each profile is served as a PDF by
  /Applicant/Handler/ViewInstituteProfileDetailsDynamic.ashx?boardId=<season board>&InstituteId=<code>
Requests are sequential with a pause between them, and files already on disk are skipped, so the script can be
re-run to resume.

Usage: python pipeline/fetch-profiles.py [--limit N]
"""
import html, json, os, re, sys, time, urllib.parse, urllib.request, http.cookiejar

REPORT = 'https://mcc.admissions.nic.in/Applicant/Report/ViewInstituteProfileDynamic.aspx?enc=b3y6S6rqn323+Rrps4aJmWq6uDzwcVyR2D994Iqx3miWKIwOHdAUl7I6zs1LI/bNq85fKhJWyvHvAMhgNvbzOg=='
HANDLER = 'https://mcc.admissions.nic.in/Applicant/Handler/ViewInstituteProfileDetailsDynamic.ashx?boardId={board}&InstituteId={code}'
BOARD = '140012621'  # NEET PG 2026; shown in the report page's own links
OUT = 'data/raw/profiles'
PAUSE = 0.8
P = 'ctl00$ContentPlaceHolder1$'

jar = http.cookiejar.CookieJar()
op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
op.addheaders = [('User-Agent', 'Mozilla/5.0 (PG Seat Compass data refresh)')]

def page(data=None):
    body = urllib.parse.urlencode(data).encode() if data else None
    return op.open(REPORT, body, timeout=90).read().decode('utf-8', 'ignore')

def hidden(s):
    return {m.group(1): html.unescape(m.group(2)) for m in re.finditer(r'<input type="hidden" name="([^"]+)" id="[^"]*" value="([^"]*)"', s)}

def institutes():
    s = page()
    form = hidden(s); form.update({'__EVENTTARGET': P + 'ddlInstType', P + 'ddlInstType': 'All'})
    s = page(form)
    sel = re.search(r'<select name="%s".*?</select>' % re.escape(P + 'ddlInstitutes'), s, re.S).group(0)
    return [(v, html.unescape(t)) for v, t in re.findall(r'<option[^>]*value="(\d{6})"[^>]*>([^<]*)', sel)]

def main():
    limit = int(sys.argv[sys.argv.index('--limit') + 1]) if '--limit' in sys.argv else None
    os.makedirs(OUT, exist_ok=True)
    insts = institutes()
    json.dump([{'code': c, 'name': n} for c, n in insts], open(f'{OUT}/_index.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    print(f'{len(insts)} institutes listed', flush=True)
    done = failed = 0
    for code, name in insts[:limit]:
        path = f'{OUT}/{code}.pdf'
        if os.path.exists(path) and os.path.getsize(path) > 0:
            continue
        try:
            data = op.open(HANDLER.format(board=BOARD, code=code), timeout=90).read()
            if data[:5] == b'%PDF-':
                open(path, 'wb').write(data); done += 1
            else:
                failed += 1; print(f'not a PDF: {code} {name[:60]}', flush=True)
        except Exception as e:  # keep going; a re-run picks up what failed
            failed += 1; print(f'error {code}: {e}', flush=True)
        if (done + failed) % 100 == 0:
            print(f'{done} saved, {failed} failed', flush=True)
        time.sleep(PAUSE)
    print(f'finished: {done} saved, {failed} failed', flush=True)

if __name__ == '__main__':
    main()
