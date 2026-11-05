# SPDX-License-Identifier: AGPL-3.0-or-later
# 出生地の検索データを生成する。名称は総務省の一覧を正とし、座標は GeoNames から都道府県込みで引く。
# 使い方: build_places.py <元ファイルのフォルダ> <出力フォルダ> <手動座標JSON>
import collections, gzip, hashlib, json, math, os, re, sys, unicodedata, zipfile
import xml.etree.ElementTree as ET

src, out, overrides_path = sys.argv[1:4]
NS = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
REPORT = {}

def read_sheets():
    z = zipfile.ZipFile(f'{src}/code.xlsx')
    strings = []
    for si in ET.fromstring(z.read('xl/sharedStrings.xml')):
        # ふりがな(rPh)を除いた本文だけを読む
        parts = [t.text or '' for t in si.findall(NS + 't')]
        parts += [t.text or '' for r in si.findall(NS + 'r') for t in r.findall(NS + 't')]
        strings.append(''.join(parts))
    sheets = []
    for n in (1, 2):
        rows = []
        for row in ET.fromstring(z.read(f'xl/worksheets/sheet{n}.xml')).iter(NS + 'row'):
            cells = []
            for c in row:
                v = c.find(NS + 'v')
                cells.append('' if v is None else strings[int(v.text)] if c.get('t') == 's' else v.text)
            rows.append(cells)
        sheets.append(rows[1:])
    return sheets

def hira(text):
    s = unicodedata.normalize('NFKC', text)
    return ''.join(chr(ord(c) - 0x60) if 'ァ' <= c <= 'ヶ' else c for c in s)

ROMA = {'き':'ki','し':'shi','ち':'chi','に':'ni','ひ':'hi','み':'mi','り':'ri','か':'ka','く':'ku','け':'ke','こ':'ko','さ':'sa','す':'su','せ':'se','そ':'so','た':'ta','つ':'tsu','て':'te','と':'to','な':'na','ぬ':'nu','ね':'ne','の':'no','は':'ha','ふ':'fu','へ':'he','ほ':'ho','ま':'ma','む':'mu','め':'me','も':'mo','や':'ya','ゆ':'yu','よ':'yo','ら':'ra','る':'ru','れ':'re','ろ':'ro','わ':'wa','を':'o','ん':'n','が':'ga','ぎ':'gi','ぐ':'gu','げ':'ge','ご':'go','ざ':'za','じ':'ji','ず':'zu','ぜ':'ze','ぞ':'zo','だ':'da','ぢ':'ji','づ':'zu','で':'de','ど':'do','ば':'ba','び':'bi','ぶ':'bu','べ':'be','ぼ':'bo','ぱ':'pa','ぴ':'pi','ぷ':'pu','ぺ':'pe','ぽ':'po','あ':'a','い':'i','う':'u','え':'e','お':'o'}
Y = {'ゃ':'a','ゅ':'u','ょ':'o'}
def romaji(h):
    # 自治体の種別語を除いて比較用のローマ字にする
    h = re.sub('(し|く|まち|ちょう|むら|そん)$', '', h)
    r = ''
    for i, c in enumerate(h):
        if c in Y:
            r = r[:-2] + ('sh' if r.endswith('shi') else 'ch' if r.endswith('chi') else 'j' if r.endswith('ji') else r[-2:-1] + 'y') + Y[c]
        elif c in ('ぇ', 'ぃ', 'ぁ', 'ぉ', 'ぅ'):
            r += {'ぇ':'e','ぃ':'i','ぁ':'a','ぉ':'o','ぅ':'u'}[c]
        elif c == 'っ':
            r += '@'
        else:
            r += ROMA.get(c, '')
    r = re.sub('@(.)', lambda m: m.group(1) * 2, r)
    return re.sub('ou|oo', 'o', r).replace('uu', 'u').replace('n\'', 'n')

def ascii_key(a):
    a = unicodedata.normalize('NFKD', a).encode('ascii', 'ignore').decode().lower()
    a = re.sub(r"[-' ]?(shi|ku|machi|cho|mura|son|gun|city|town|village|ward|prefecture)$", '', a)
    return re.sub(r"[^a-z]", '', a).replace('ou', 'o').replace('oo', 'o').replace('uu', 'u')

def km(a, b, c, d):
    p = math.pi / 180
    return 6371 * 2 * math.asin(math.sqrt(math.sin((c - a) * p / 2) ** 2 + math.cos(a * p) * math.cos(c * p) * math.sin((d - b) * p / 2) ** 2))

HAS_JA = re.compile('[぀-ヿ㐀-鿿]')

# --- GeoNames 日本 ---
ja = collections.defaultdict(list)
for l in open(f'{src}/alt/JP.txt', encoding='utf-8'):
    f = l.rstrip('\n').split('\t')
    if f[2] == 'ja' and HAS_JA.search(f[3]):
        ja[f[1]].append(f[3])
features = []
for l in open(f'{src}/jp/JP.txt', encoding='utf-8'):
    f = l.rstrip('\n').split('\t')
    if f[6] not in 'PA':
        continue
    names = set(ja.get(f[0], []))
    if HAS_JA.search(f[1]):
        names.add(f[1])
    features.append(dict(id=f[0], name=f[1], ascii=f[2], lat=float(f[4]), lon=float(f[5]), code=f[7], a1=f[10], pop=int(f[14] or 0), ja=names, key=ascii_key(f[2]), tz=f[17]))

pref_a1, pref_pos = {}, {}
for x in features:
    if x['code'] == 'ADM1':
        for n in x['ja']:
            for v in (n, n + '都', n + '道', n + '府', n + '県'):
                pref_a1.setdefault(v, x['a1'])
        pref_pos[x['a1']] = (x['lat'], x['lon'])

RANK = {'PPLC': 0, 'PPLA': 0, 'PPLA2': 0, 'PPLA3': 0, 'PPLA4': 1, 'PPL': 1, 'PPLX': 1, 'ADM2': 2, 'ADM3': 2, 'ADMD': 3, 'ADM4': 3, 'PPLL': 4}
by_a1 = collections.defaultdict(list)
for x in features:
    by_a1[x['a1']].append(x)
def pick(cands):
    return sorted(cands, key=lambda x: (RANK.get(x['code'], 5), -x['pop']))[0] if cands else None

muni_rows, ward_rows = read_sheets()
overrides = json.load(open(overrides_path, encoding='utf-8'))
places, unmatched, how = [], [], collections.Counter()
parent_pos = {}
def locate(pref, name, kana, near=None):
    a1 = pref_a1.get(pref)
    pool = by_a1.get(a1, [])
    if near:
        pool = [x for x in pool if km(near[0], near[1], x['lat'], x['lon']) < 45]
    hit = pick([x for x in pool if name in x['ja'] and x['code'] in RANK])
    if hit:
        return hit, 'ja'
    short = re.sub('^.*?市(?=.+区$)', '', name)
    if short != name:
        hit = pick([x for x in pool if short in x['ja'] and x['code'] in RANK])
        if hit:
            return hit, 'ja_short'
    k = romaji(hira(kana)) if kana else ''
    if k:
        if short != name:
            k = romaji(re.sub('^.*?し(?=[^し]+く$)', '', hira(kana)))
        hit = pick([x for x in pool if x['key'] == k and x['code'] in RANK])
        if hit:
            return hit, 'romaji'
    return None, None

seen_current = set()
dup_current, low_rank = [], []
for row in muni_rows:
    if len(row) < 3 or not row[2]:
        continue
    pref, name, kana = row[1], row[2], row[4] if len(row) > 4 else ''
    key = f'{pref}{name}'
    if key in overrides:
        o = overrides[key]
        lat, lon, src_tag = o['lat'], o['lon'], 'manual'
    else:
        hit, src_tag = locate(pref, name, kana)
        if not hit:
            unmatched.append(key)
            continue
        lat, lon = hit['lat'], hit['lon']
    if key in seen_current:
        dup_current.append(key)
        continue
    how[src_tag] += 1
    parent_pos[key] = (lat, lon)
    seen_current.add(key)
    if src_tag == 'ja' and key not in overrides and hit['code'] in ('PPLL', 'ADMD', 'ADM4'):
        low_rank.append(f"{key}({hit['code']})")
    places.append([key, hira(kana), round(lat, 4), round(lon, 4), 0])
for row in ward_rows:
    if len(row) < 3 or not row[2] or not row[2].endswith('区'):
        continue
    pref, name, kana = row[1], row[2], row[4] if len(row) > 4 else ''
    key = f'{pref}{name}'
    city = re.match('^.*?市', name).group(0)
    if key in overrides:
        o = overrides[key]
        lat, lon, src_tag = o['lat'], o['lon'], 'manual'
    else:
        hit, src_tag = locate(pref, name, kana, near=parent_pos.get(pref + city))
        if not hit:
            unmatched.append(key)
            continue
        lat, lon = hit['lat'], hit['lon']
    how['ward_' + src_tag] += 1
    seen_current.add(key)
    places.append([key, hira(kana), round(lat, 4), round(lon, 4), 0])
REPORT['jp_current'] = len(places)
REPORT['jp_match_method'] = dict(how)
REPORT['jp_unmatched'] = unmatched
REPORT['jp_duplicate_names'] = dup_current
REPORT['jp_low_rank_match'] = low_rank

# 妥当性: 都道府県の代表点から遠すぎるものを報告する
FAR_OK = {'北海道', '東京都', '沖縄県', '鹿児島県', '長崎県', '島根県'}
far = []
a1_of = {}
for p in places:
    m = re.match('^(.+?[都道府県])', p[0])
    a1 = pref_a1.get(m.group(1)) if m else None
    pos = pref_pos.get(a1)
    if pos and km(pos[0], pos[1], p[2], p[3]) > 130 and m.group(1) not in FAR_OK:
        far.append(p[0])
REPORT['jp_far_from_pref'] = far
# 同名自治体(府中市など)の座標が別の地点を指しているか
base = collections.defaultdict(list)
for p in places:
    base[re.sub('^.+?[都道府県]', '', p[0])].append(p)
same_coord = [v[0][0] + ' / ' + v[1][0] for v in base.values() if len(v) > 1 and any(km(a[2], a[3], b[2], b[3]) < 5 for i, a in enumerate(v) for b in v[i + 1:])]
REPORT['jp_same_name_groups'] = sum(1 for v in base.values() if len(v) > 1)
REPORT['jp_same_name_same_coord'] = same_coord

# --- 旧地名・地区名 ---
pref_of_a1 = {}
for k, v in pref_a1.items():
    if k.endswith(('都', '道', '府', '県')) and not k.endswith(('都都', '道道', '府府', '県県', '県都', '都県')):
        cur = pref_of_a1.get(v)
        if cur is None or len(k) < len(cur):
            pref_of_a1[v] = k
extra = {}
current_names = {re.sub('^.+?[都道府県]', '', p[0]) for p in places}
for x in features:
    pref = pref_of_a1.get(x['a1'])
    if not pref or x['code'] in ('ADM1', 'ADM1H'):
        continue
    historic = x['code'].endswith('H')
    if not historic and x['code'] not in ('PPL', 'PPLL', 'PPLX', 'PPLA2', 'PPLA3', 'PPLA4', 'ADM2', 'ADM3', 'ADMD', 'ADM4'):
        continue
    for n in x['ja']:
        if len(n) < 2 or n in current_names or not re.search(r'[㐀-鿿]', n):
            continue
        k = pref + n
        if k in seen_current:
            continue
        tier = 1 if historic else 2
        if k not in extra or tier < extra[k][4]:
            extra[k] = [k, '', round(x['lat'], 4), round(x['lon'], 4), tier]
REPORT['jp_historic'] = sum(1 for p in extra.values() if p[4] == 1)
REPORT['jp_locality'] = sum(1 for p in extra.values() if p[4] == 2)

# --- 海外 ---
ja_all = collections.defaultdict(list)
for l in open(f'{src}/alt_ja_en.txt', encoding='utf-8'):
    f = l.rstrip('\n').split('\t')
    if f[2] == 'ja' and HAS_JA.search(f[3]):
        pref_flag = f[4] == '1'
        ja_all[f[1]].insert(0, f[3]) if pref_flag else ja_all[f[1]].append(f[3])
countries = {}
for l in open(f'{src}/countryInfo.txt', encoding='utf-8'):
    if l.startswith('#'):
        continue
    f = l.rstrip('\n').split('\t')
    names = ja_all.get(f[16], [])
    countries[f[0]] = names[0] if names else f[4]
tz = json.load(open(f'{out}/tzdata.json'))
zones = {}
world, dropped = [], 0
for l in open(f'{src}/cities5000.txt', encoding='utf-8'):
    f = l.rstrip('\n').split('\t')
    if f[8] == 'JP':
        continue
    if f[17] not in tz['zones']:
        dropped += 1
        continue
    names = ja_all.get(f[0], [])
    world.append([f[1], f[2] if f[2] != f[1] else 0, names[0] if names else 0, round(float(f[4]), 3), round(float(f[5]), 3), f[8], zones.setdefault(f[17], len(zones)), int(f[14] or 0)])
world.sort(key=lambda r: -r[7])
REPORT['world'] = len(world)
REPORT['world_with_ja'] = sum(1 for r in world if r[2])
REPORT['world_dropped_unknown_tz'] = dropped

def write(name, obj):
    b = json.dumps(obj, ensure_ascii=False, separators=(',', ':')).encode()
    open(f'{out}/{name}', 'wb').write(b)
    return {'bytes': len(b), 'gzip': len(gzip.compress(b, 9)), 'sha256': hashlib.sha256(b).hexdigest()}
files = {
    'places-jp.json': write('places-jp.json', {'timezone': 'Asia/Tokyo', 'places': places}),
    # 旧地名・地区名は容量が大きいので、現行の市区町村で見つからないときだけ読み込む
    'places-jp-extra.json': write('places-jp-extra.json', {'timezone': 'Asia/Tokyo', 'places': list(extra.values())}),
    'places-world.json': write('places-world.json', {'countries': countries, 'zones': list(zones), 'places': world}),
}
b = open(f'{out}/tzdata.json', 'rb').read()
files['tzdata.json'] = {'bytes': len(b), 'gzip': len(gzip.compress(b, 9)), 'sha256': hashlib.sha256(b).hexdigest()}
json.dump({'tzdata': tz['version'], 'files': files}, open(f'{out}/manifest.json', 'w'), indent=1)
print(json.dumps({**REPORT, 'files': {k: [v['bytes'], v['gzip']] for k, v in files.items()}}, ensure_ascii=False, indent=0))
