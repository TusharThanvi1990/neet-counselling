"""
Andhra Pradesh NEET PG state counselling (Dr NTR UHS) -> closing ranks in the same shape as MCC rounds.

Dr NTR UHS publishes "MEDICAL PG 2025-26 Admission Last Rank" as an ASP.NET search form
(https://drntr.uhsap.in/index/adms_lastranks). Choosing year 2025-26, degree MEDICAL PG and "All" for every
other filter returns the whole table:
  Speciality | Institute Type | Institute Name | Seat (CQ/MQ/CA-SF) | Sub Category | Alloted Category |
  Candidate Area | RoundNo | NEET_RANK | PERCENTILE/SCORE
Each row is the last (closing) All India Rank for that seat type in that round, not an individual allotment.
No candidate data is published or kept.

Usage: python -I pipeline/states/andhra.py   (writes data/raw/states/andhra/lastranks_2025.html and data/parsed/ap2025_r*.json)
"""
import html, http.cookiejar, json, os, re, sys, urllib.parse, urllib.request

URL = 'https://drntr.uhsap.in/index/adms_lastranks'
P = 'ctl00$ContentPlaceHolder1$DropDownList_'
RAW = 'data/raw/states/andhra'
op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
op.addheaders = [('User-Agent', 'Mozilla/5.0')]


def get(data=None):
    body = urllib.parse.urlencode(data).encode() if data else None
    return op.open(URL, body, timeout=120).read().decode('utf-8', 'replace')


def form(s):
    f = {n: v for n, v in re.findall(r'<input type="hidden" name="([^"]+)"[^>]*value="([^"]*)"', s)}
    for n, body in re.findall(r'<select name="([^"]+)"[^>]*>(.*?)</select>', s, re.S):
        sel = re.search(r'<option selected="selected" value="([^"]*)"', body) or re.search(r'<option[^>]*value="([^"]*)"', body)
        f[n] = sel.group(1) if sel else ''
    return f


def options(s, name):
    body = re.search(r'<select name="' + re.escape(name) + r'"[^>]*>(.*?)</select>', s, re.S).group(1)
    return re.findall(r'<option[^>]*value="([^"]*)"[^>]*>([^<]*)', body)


def postback(s, field, value):
    f = form(s)
    f[P + field] = value
    f['__EVENTTARGET'], f['__EVENTARGUMENT'] = P + field, ''
    return get(f)


os.makedirs(RAW, exist_ok=True)
s = get()
s = postback(s, 'Acyear', '2025-26')
s = postback(s, 'course', 'M2')  # MEDICAL PG
inst_codes = {html.unescape(t).strip(): v for v, t in options(s, P + 'instname') if v != '0'}
f = form(s)
f['__EVENTTARGET'] = ''
f['ctl00$ContentPlaceHolder1$Button1'] = 'View Results'
s = get(f)
open(f'{RAW}/lastranks_2025.html', 'w', encoding='utf-8').write(s)

table = max(re.findall(r'<table[^>]*>(.*?)</table>', s, re.S), key=len)
cells = [[re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', '', c))).strip() for c in re.findall(r'<t[hd][^>]*>(.*?)</t[hd]>', r, re.S)]
         for r in re.findall(r'<tr[^>]*>(.*?)</tr>', table, re.S)]
head = [re.sub(r'[^a-z]', '', h.lower()).replace('institue', 'institute') for h in cells[0]]
col = {k: head.index(k) for k in ['speciality', 'institutetype', 'institutename', 'seattype', 'subcategory', 'allotedcategory', 'candidatearea', 'roundno', 'neetrank']}
rounds = {}
for c in cells[1:]:
    if len(c) < len(head) or not c[col['neetrank']].isdigit():
        continue
    name = c[col['institutename']]
    rounds.setdefault(c[col['roundno']], []).append({
        'rank': int(c[col['neetrank']]), 'institute': name, 'collegeCode': inst_codes.get(name, ''), 'instType': c[col['institutetype']],
        'course': c[col['speciality']], 'seat': c[col['seattype']], 'sub': c[col['subcategory']],
        'allottedCategory': c[col['allotedcategory']], 'candidateCategory': c[col['allotedcategory']], 'area': c[col['candidatearea']],
        'remarks': 'closing rank', 'page': 0,
    })
LABEL = {'1': 'Round 1', '2': 'Round 2', '3': 'Round 3', '4': 'Stray'}
for r, rows in sorted(rounds.items()):
    rows.sort(key=lambda x: x['rank'])
    json.dump({'source': URL, 'url': URL, 'counselling': 'Andhra Pradesh', 'kind': 'closing ranks', 'year': 2025, 'round': LABEL.get(r, f'Round {r}'), 'rows': rows},
              open(f'data/parsed/ap2025_r{r}.json', 'w', encoding='utf-8'))
    print(f'ap2025_r{r}: {len(rows)} closing ranks')
sys.stdout.reconfigure(encoding='utf-8')
for k in ['seat', 'sub', 'allottedCategory', 'area', 'instType']:
    vals = {}
    for rows in rounds.values():
        for x in rows: vals[x[k]] = vals.get(x[k], 0) + 1
    print(k, dict(sorted(vals.items(), key=lambda kv: -kv[1])))
