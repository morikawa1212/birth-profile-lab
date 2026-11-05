# SPDX-License-Identifier: AGPL-3.0-or-later
# NASA JPL Horizons から地心視位置の黄経を取得し、照合基準として保存する。送るのは合成の日時のみ。
import json, random, sys, time, urllib.parse, urllib.request, gzip
out = sys.argv[1]
random.seed(20261105)
jds = sorted([round(2415020.5 + random.random() * (2461345 - 2415020.5), 6) for _ in range(38)] + [2451545.0, 2433646.5])  # J2000.0、1951年を含む
BODIES = {'sun': '10', 'moon': '301', 'mercury': '199', 'venus': '299', 'mars': '499', 'jupiter': '599', 'saturn': '699', 'uranus': '799', 'neptune': '899', 'pluto': '999'}
res = {'source': 'NASA JPL Horizons API', 'center': '500@399', 'quantity': 31, 'jd_ut': jds, 'bodies': {}, 'ephemeris': {}}
for name, cmd in BODIES.items():
    q = urllib.parse.urlencode({'format': 'json', 'COMMAND': f"'{cmd}'", 'OBJ_DATA': "'NO'", 'MAKE_EPHEM': "'YES'", 'EPHEM_TYPE': "'OBSERVER'", 'CENTER': "'500@399'", 'TLIST': "'" + ','.join(str(x) for x in jds) + "'", 'TLIST_TYPE': 'JD', 'TIME_TYPE': 'UT', 'QUANTITIES': "'31'", 'CSV_FORMAT': "'YES'", 'EXTRA_PREC': "'YES'", 'ANG_FORMAT': "'DEG'"})
    with urllib.request.urlopen('https://ssd.jpl.nasa.gov/api/horizons.api?' + q, timeout=90) as r:
        text = json.load(r)['result']
    body = text[text.index('$$SOE') + 5:text.index('$$EOE')]
    rows = [l.split(',') for l in body.strip().splitlines()]
    vals = []
    for row in rows:
        nums = [x.strip() for x in row if x.strip()]
        vals.append(float(nums[-2]))
    assert len(vals) == len(jds), (name, len(vals))
    res['bodies'][name] = vals
    if name == 'sun':
        res['header_sample'] = [l for l in text.splitlines() if 'Ephemeris' in l or 'ObsEcLon' in l or 'Date_' in l][:6]
    time.sleep(1)
with gzip.open(out, 'wt') as f:
    json.dump(res, f)
print('epochs', len(jds), res.get('header_sample'))
