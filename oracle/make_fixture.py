# SPDX-License-Identifier: AGPL-3.0-or-later
# 合成入力に対する Python 試作(Swiss暦)の結果を TS 実装の照合基準として書き出す。実在の人の情報は使わない。
import sys, json, gzip, random
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from profile_lab import calculate, InputError

ephe, out, n = sys.argv[1], sys.argv[2], int(sys.argv[3])
random.seed(20261105)
ZONES = ['Asia/Tokyo','Asia/Kolkata','Europe/London','Europe/Berlin','America/New_York','America/Los_Angeles','America/Sao_Paulo','Australia/Sydney','Pacific/Auckland','Pacific/Apia','Asia/Kathmandu','Africa/Nairobi']
cases = []
while len(cases) < n:
    y, mo, d = random.randint(1900, 2025), random.randint(1, 12), random.randint(1, 28)
    h, mi, s = random.randint(0, 23), random.randint(0, 59), random.choice([0, 0, 0, random.randint(0, 59)])
    inp = {'date': f'{y:04d}-{mo:02d}-{d:02d}', 'time': f'{h:02d}:{mi:02d}:{s:02d}', 'timezone': random.choice(ZONES),
           'time_accuracy': random.choice(['exact', 'exact', 'exact', 'approximate'])}
    if random.random() < 0.95:
        inp['latitude'], inp['longitude'] = round(random.uniform(-65.9, 72), 4), round(random.uniform(-180, 180), 4)
    try:
        r = calculate(inp, ephemeris='swiss', ephe_path=ephe)
    except InputError:
        continue  # 夏時間の重複・不存在の時刻は時刻層のテストで扱う
    cases.append({'input': inp, 'utc': r['normalized_input']['utc'], 'modules': r['modules']})
with gzip.open(out, 'wt', encoding='utf-8', compresslevel=9) as f:
    json.dump({'source': 'oracle/profile_lab (Swiss Ephemeris 2.10.03)', 'cases': cases}, f, ensure_ascii=False, separators=(',', ':'))
print(len(cases))
