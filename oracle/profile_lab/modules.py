# SPDX-License-Identifier: AGPL-3.0-or-later
"""Independent calculation modules; explanatory content is loaded separately."""
from __future__ import annotations
from itertools import combinations
import math
from typing import Any, Callable
import swisseph as swe
from .core import BirthContext, Ephemeris, PLANETS, zodiac

Module = Callable[[BirthContext, Ephemeris], dict[str, Any]]
REGISTRY: dict[str, Module] = {}

def register(name: str):
    def decorator(fn: Module) -> Module:
        REGISTRY[name] = fn
        return fn
    return decorator

def unavailable(*missing: str) -> dict[str, Any]:
    return {'status': 'unavailable', 'required': list(missing), 'data': None}

def result(ctx: BirthContext, settings: dict[str, Any], data: Any) -> dict[str, Any]:
    return {'status': 'provisional' if ctx.time_accuracy == 'approximate' else 'calculated', 'module_version': '0.1.0', 'settings': settings, 'data': data, 'interpretation_status': 'not_loaded'}

# Gate 41 begins at tropical longitude 302 degrees. Order is the 64-gate wheel,
# not King Wen sequence 1–64. See SOURCES.md for official coordinate reference.
GATE_ORDER = (41,19,13,49,30,55,37,63,22,36,25,17,21,51,42,3,27,24,2,23,8,20,16,35,45,12,15,52,39,53,62,56,31,33,7,4,29,59,40,64,47,6,46,18,48,57,32,50,28,44,1,43,14,34,9,5,26,11,10,58,38,54,61,60)

def gene_key(longitude: float) -> dict[str, Any]:
    if not math.isfinite(longitude):
        raise ValueError('longitude must be finite')
    offset = (longitude - 302.0) % 360
    gate_index = int(offset // 5.625)
    in_gate = offset - gate_index * 5.625
    line = int(in_gate // 0.9375) + 1
    into_line = in_gate % 0.9375
    return {'key': GATE_ORDER[gate_index], 'line': line, 'value': f'{GATE_ORDER[gate_index]}.{line}', 'longitude': round(longitude % 360, 9), 'distance_to_line_boundary_deg': round(min(into_line, 0.9375 - into_line), 9)}

@register('gene_keys')
def gene_keys(ctx: BirthContext, ephe: Ephemeris) -> dict[str, Any]:
    if ctx.jd_ut1 is None:
        return unavailable('birth_time', 'timezone')
    natal = ctx.jd_ut1
    design = ephe.design_jd(natal)
    specs = (
        ('lifes_work','ライフワーク',natal,swe.SUN,0),
        ('evolution','進化',natal,swe.SUN,180),
        ('radiance','輝き',design,swe.SUN,0),
        ('purpose','目的',design,swe.SUN,180),
        ('attraction','引き寄せ',design,swe.MOON,0),
        ('iq','IQ',natal,swe.VENUS,0),
        ('eq','EQ',natal,swe.MARS,0),
        ('sq','SQ',design,swe.VENUS,0),
        ('vocation','天職／コア',design,swe.MARS,0),
        ('culture','文化',design,swe.JUPITER,0),
        ('pearl','パール',natal,swe.JUPITER,0),
    )
    spheres = {}
    for name, label, jd, planet, opposite in specs:
        lon = ephe.position(jd, planet)['longitude'] + opposite
        spheres[name] = {'label': label, **gene_key(lon), 'epoch': 'natal' if jd == natal else 'design', 'source_planet': swe.get_planet_name(planet), 'opposition_offset_deg': opposite}
    return result(ctx, {'zodiac': 'tropical', 'positions': 'geocentric_apparent', 'design_rule': 'solar_longitude_minus_88_degrees', 'scope': '11_spheres_only', 'official_generator': False}, {'design_jd_ut1': design, 'days_before_birth': natal-design, 'spheres': spheres})

@register('western')
def western(ctx: BirthContext, ephe: Ephemeris) -> dict[str, Any]:
    if ctx.jd_ut1 is None:
        return unavailable('birth_time', 'timezone')
    planets = {}
    for name, planet in PLANETS.items():
        p = ephe.position(ctx.jd_ut1, planet)
        planets[name] = {**zodiac(p['longitude']), 'retrograde': p['retrograde'], 'longitude_speed': p['longitude_speed']}
    houses: dict[str, Any] = {'status': 'unavailable', 'required': ['latitude','longitude']}
    if ctx.latitude is not None:
        if abs(ctx.latitude) >= 66:
            houses = {'status': 'unsupported', 'reason': '試作版では緯度66度以上のプラシーダスを保留します。方式は自動変更しません。'}
        else:
            try:
                cusps, angles = swe.houses_ex(ctx.jd_ut1, ctx.latitude, ctx.longitude, b'P', 0)
                houses = {'status': 'calculated', 'cusps': list(cusps), 'ascendant': zodiac(angles[0]), 'mc': zodiac(angles[1])}
                for p in planets.values():
                    for i, start in enumerate(cusps):
                        span = (cusps[(i+1) % 12] - start) % 360
                        if (p['longitude'] - start) % 360 < span:
                            p['house'] = i + 1
                            break
            except swe.Error:
                houses = {'status': 'unsupported', 'reason': 'この条件ではハウスを算出できません。'}
    aspects = []
    definitions = [('conjunction',0),('sextile',60),('square',90),('trine',120),('opposition',180)]
    for a,b in combinations(planets,2):
        gap = abs((planets[a]['longitude']-planets[b]['longitude']+180)%360-180)
        for kind, target in definitions:
            orb = abs(gap-target)
            if orb <= 6:
                aspects.append({'a':a,'b':b,'aspect':kind,'separation_deg':gap,'orb_deg':orb})
    return result(ctx, {'zodiac':'tropical','houses':'placidus','house_assignment':'ecliptic_longitude_between_cusps','aspect_orb_deg':6,'aspect_rule':'prototype_uniform_orb'}, {'planets':planets,'houses':houses,'aspects':aspects})

NAKSHATRAS = ('アシュヴィニー','バラニー','クリッティカー','ローヒニー','ムリガシラー','アールドラー','プナルヴァス','プシャ','アーシュレーシャー','マガー','プールヴァ・パールグニー','ウッタラ・パールグニー','ハスタ','チトラー','スヴァーティー','ヴィシャーカー','アヌラーダー','ジェーシュター','ムーラ','プールヴァ・アーシャーダー','ウッタラ・アーシャーダー','シュラヴァナ','ダニシュター','シャタビシャー','プールヴァ・バードラパダー','ウッタラ・バードラパダー','レーヴァティー')

def nakshatra(longitude: float) -> dict[str, Any]:
    value = longitude % 360
    scaled = value / (360/27)
    index = int(scaled)
    pada = min(4, int((scaled-index)*4)+1)
    return {'index':index+1,'name':NAKSHATRAS[index],'pada':pada}

@register('vedic')
def vedic(ctx: BirthContext, ephe: Ephemeris) -> dict[str, Any]:
    if ctx.jd_ut1 is None:
        return unavailable('birth_time', 'timezone')
    swe.set_sid_mode(swe.SIDM_LAHIRI)
    planets = {}
    for name in ('sun','moon','mercury','venus','mars','jupiter','saturn'):
        p = ephe.position(ctx.jd_ut1, PLANETS[name], True)
        planets[name] = {**zodiac(p['longitude']), 'retrograde':p['retrograde']}
    rahu = ephe.position(ctx.jd_ut1, swe.MEAN_NODE, True)
    planets['rahu'] = {**zodiac(rahu['longitude']), 'retrograde':rahu['retrograde']}
    planets['ketu'] = {**zodiac(rahu['longitude']+180), 'retrograde':rahu['retrograde']}
    lagna: dict[str, Any] = {'status':'unavailable','required':['latitude','longitude']}
    if ctx.latitude is not None:
        try:
            _, angles = swe.houses_ex(ctx.jd_ut1, ctx.latitude, ctx.longitude, b'W', swe.FLG_SIDEREAL)
            lagna = {'status':'calculated', **zodiac(angles[0])}
            for p in planets.values():
                p['house'] = (p['sign_index']-lagna['sign_index'])%12+1
        except swe.Error:
            lagna = {'status':'unsupported','reason':'ラグナを計算できません。'}
    _, aya = swe.get_ayanamsa_ex_ut(ctx.jd_ut1, ephe.flag)
    return result(ctx, {'zodiac':'sidereal','ayanamsa':'Lahiri','houses':'whole_sign','node':'mean','scope':'D1_and_moon_nakshatra'}, {'planets':planets,'lagna':lagna,'moon_nakshatra':nakshatra(planets['moon']['longitude']),'ayanamsa_deg':aya})

MASTERS = (11,22,33)

def reduce_number(value: int) -> tuple[int,list[int]]:
    trace = [value]
    while value > 9 and value not in MASTERS:
        value = sum(int(x) for x in str(value))
        trace.append(value)
    return value, trace

@register('numerology')
def numerology(ctx: BirthContext, ephe: Ephemeris) -> dict[str, Any]:
    d = ctx.local_date  # IMPORTANT: use local civil birth date, not UTC date.
    digits = [int(x) for x in d.strftime('%Y%m%d')]
    life_path, trace = reduce_number(sum(digits))
    birthday, birthday_trace = reduce_number(d.day)
    return {'status':'calculated','module_version':'0.2.0','settings':{'method':'all_digits_preserve_11_22_33','birthday_method':'day_digits_preserve_11_22','calendar':'gregorian_local_date','name_numerology':False},'data':{'life_path':life_path,'digits':digits,'sum_trace':trace,'birthday':birthday,'birthday_trace':birthday_trace},'interpretation_status':'not_loaded'}
