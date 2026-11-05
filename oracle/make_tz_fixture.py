# SPDX-License-Identifier: AGPL-3.0-or-later
# Python の zoneinfo による現地時刻の判定を、時刻層の照合基準として書き出す。合成の日時のみ。
import sys, json, gzip, random, zoneinfo
from datetime import datetime, timedelta, timezone
assert zoneinfo.TZPATH == (), 'PYTHONTZPATH を空にして実行してください'
tzjson, out = sys.argv[1], sys.argv[2]
data = json.load(open(tzjson))
random.seed(20261105)

def classify(name, wall):
    z = zoneinfo.ZoneInfo(name)
    seen = {}
    for fold in (0, 1):
        u = wall.replace(tzinfo=z, fold=fold).astimezone(timezone.utc)
        if u.astimezone(z).replace(tzinfo=None) == wall:
            seen[u] = fold
    us = sorted(seen)
    return ['nonexistent' if not us else 'ok' if len(us) == 1 else 'ambiguous', [int(u.timestamp()) for u in us]]

cases = []
for name, z in data['zones'].items():
    walls = [datetime(1900, 1, 1) + timedelta(seconds=random.randrange(0, 127 * 365 * 86400)) for _ in range(12)]
    for t, off, _ in random.sample(z['t'], min(6, len(z['t']))):
        w = datetime(1970, 1, 1) + timedelta(seconds=t + off)
        walls += [w + timedelta(seconds=d) for d in (-3600, -1800, -1, 0, 1, 1800, 3600)]
    for w in walls:
        if w.year < 1900 or w.year > 2036:
            continue
        kind, us = classify(name, w)
        cases.append([name, w.strftime('%Y-%m-%dT%H:%M:%S'), kind, us])
with gzip.open(out, 'wt', compresslevel=9) as f:
    json.dump({'version': data['version'], 'cases': cases}, f, separators=(',', ':'))
import collections
print(len(cases), collections.Counter(c[2] for c in cases))
