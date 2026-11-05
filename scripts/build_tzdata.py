# SPDX-License-Identifier: AGPL-3.0-or-later
# 版を固定した tzdata パッケージから、1900年以降の UTC オフセット遷移を JSON に書き出す。
# 実行は `PYTHONTZPATH= python scripts/build_tzdata.py <出力>`(OSのタイムゾーンデータを使わない)
import gzip, json, os, struct, sys
import importlib.metadata as md
import zoneinfo
from datetime import datetime, timedelta, timezone
import tzdata

assert zoneinfo.TZPATH == (), 'PYTHONTZPATH を空にして実行してください'
START = int(datetime(1900, 1, 1, tzinfo=timezone.utc).timestamp())
END = int(datetime(2040, 1, 1, tzinfo=timezone.utc).timestamp())
ROOT = os.path.join(os.path.dirname(tzdata.__file__), 'zoneinfo')
names = sorted(l.strip() for l in open(os.path.join(os.path.dirname(tzdata.__file__), 'zones')) if l.strip())

def last_transition(path):
    b = open(path, 'rb').read()
    head = lambda o: struct.unpack('>4sc15x6I', b[o:o + 44])
    _, _, isutc, isstd, leap, timecnt, typecnt, charcnt = head(0)
    o = 44 + timecnt * 5 + typecnt * 6 + charcnt + leap * 8 + isstd + isutc
    _, _, _, _, _, timecnt, _, _ = head(o)
    o += 44
    return list(struct.unpack('>%dq' % timecnt, b[o:o + 8 * timecnt]))

def info(z, t):
    d = datetime.fromtimestamp(t, z)
    return int(d.utcoffset().total_seconds()), 1 if d.dst() else 0

def transitions(name):
    z = zoneinfo.ZoneInfo(name)
    # 記録された遷移の前後の状態が変わる時点だけを採用し、最後の遷移以降は規則を1日刻みで走査する
    points = [t for t in last_transition(os.path.join(ROOT, *name.split('/'))) if START < t < END]
    tail = points[-1] if points else START
    out, cur = [], info(z, START)
    first = cur
    for t in points:
        now = info(z, t)
        if now != cur:
            out.append([t, now[0], now[1]])
            cur = now
    t = tail
    while t < END:
        n = t + 86400
        if info(z, n) != cur:
            lo, hi = t, n
            while hi - lo > 1:
                mid = (lo + hi) // 2
                if info(z, mid) != cur:
                    hi = mid
                else:
                    lo = mid
            cur = info(z, hi)
            out.append([hi, cur[0], cur[1]])
            t = hi
        else:
            t = n
    return first, out

version = md.version('tzdata')
zones = {}
for n in names:
    first, tr = transitions(n)
    zones[n] = {'o': first[0], 'd': first[1], 't': tr}
out = sys.argv[1]
payload = json.dumps({'version': version, 'zones': zones}, separators=(',', ':')).encode()
open(out, 'wb').write(payload)
print('tzdata', version, 'zones', len(zones), 'KB', len(payload) // 1024, 'gz KB', len(gzip.compress(payload, 9)) // 1024)
