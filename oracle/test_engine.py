# SPDX-License-Identifier: AGPL-3.0-or-later
from datetime import timedelta
import json
from pathlib import Path
import math
import pytest
import swisseph as swe
from profile_lab import calculate, InputError, EphemerisError
from profile_lab.core import BirthContext, Ephemeris
from profile_lab.modules import gene_key, GATE_ORDER, nakshatra, reduce_number

BASE = {'date':'2000-01-01','time':'12:00','timezone':'Asia/Tokyo','latitude':35.6812,'longitude':139.7671}

def test_registry():
    assert set(calculate(BASE)['modules']) == {'gene_keys','western','vedic','numerology'}

def test_json_serializable():
    json.dumps(calculate(BASE),allow_nan=False)

@pytest.mark.parametrize('gate_index', range(64))
def test_all_gate_line_boundaries(gate_index):
    start = (302 + gate_index*5.625)%360
    for line in range(1,7):
        boundary = (start+(line-1)*.9375)%360
        exact = gene_key(boundary)
        after = gene_key(boundary+1e-7)
        before = gene_key(boundary-1e-7)
        assert (exact['key'],exact['line']) == (GATE_ORDER[gate_index],line)
        assert (after['key'],after['line']) == (GATE_ORDER[gate_index],line)
        assert before['line'] == (6 if line==1 else line-1)
        assert before['key'] == (GATE_ORDER[(gate_index-1)%64] if line==1 else GATE_ORDER[gate_index])

def test_all_keys_unique():
    assert sorted(GATE_ORDER) == list(range(1,65))

def test_gate_wrap():
    assert gene_key(-58)['value'] == gene_key(302)['value'] == gene_key(662)['value'] == '41.1'

def test_numerology_local_date_not_utc():
    out=calculate({**BASE,'time':'00:10'})
    assert out['normalized_input']['utc'].startswith('1999-12-31')
    assert out['modules']['numerology']['data']['life_path']==4

@pytest.mark.parametrize('n', [11,22,33])
def test_master_preserved(n):
    assert reduce_number(n)[0]==n

def test_numerology_trace():
    n=calculate(BASE)['modules']['numerology']['data']
    assert n['components']['year']['trace']==[2000,2]
    assert n['sum_trace']==[4]

def test_unknown_time():
    out=calculate({'date':'2000-01-01','time_accuracy':'unknown'})
    for mod in ['gene_keys','western','vedic']:
        assert out['modules'][mod]['status']=='unavailable'
    assert out['modules']['numerology']['status']=='calculated'
    assert out['normalized_input']['utc'] is None

def test_no_fabricated_noon():
    with pytest.raises(InputError):
        calculate({**BASE,'time_accuracy':'unknown'})

def test_approximate_time():
    out=calculate({**BASE,'time_accuracy':'approximate'})
    assert out['modules']['gene_keys']['status']=='provisional'
    assert out['modules']['numerology']['status']=='calculated'

def test_ambiguous_dst_rejected():
    with pytest.raises(InputError,match='二重'):
        calculate({'date':'2024-11-03','time':'01:30','timezone':'America/New_York'})

def test_fold_disambiguates():
    b={'date':'2024-11-03','time':'01:30','timezone':'America/New_York'}
    a=BirthContext.from_dict({**b,'fold':0})
    c=BirthContext.from_dict({**b,'fold':1})
    assert c.utc-a.utc==timedelta(hours=1)

def test_nonexistent_dst_rejected():
    with pytest.raises(InputError,match='存在しない'):
        calculate({'date':'2024-03-10','time':'02:30','timezone':'America/New_York'})

@pytest.mark.parametrize('patch', [
    {'date':'2000-02-30'}, {'date':'1800-01-01'}, {'latitude':91},
    {'latitude':float('nan')}, {'longitude':float('inf')},
    {'time':'25:00'}, {'time':'12:00+09:00'}, {'timezone':'Unknown/Invalid'},
    {'latitude':True}, {'latitude':None}
])
def test_invalid_input(patch):
    with pytest.raises(InputError):
        calculate({**BASE,**patch})

def test_strict_swiss_no_silent_fallback(tmp_path):
    with pytest.raises(EphemerisError):
        calculate(BASE,ephemeris='swiss',ephe_path=str(tmp_path))

def test_moshier_is_disclosed():
    out=calculate(BASE)
    assert out['calculation']['ephemeris_mode']=='moshier'
    assert any('Moshier' in w for w in out['warnings'])

def test_design_88_degrees_not_88_days():
    context=BirthContext.from_dict(BASE)
    e=Ephemeris('moshier')
    design=e.design_jd(context.jd_ut1)
    separation=(e.position(context.jd_ut1,swe.SUN)['longitude']-e.position(design,swe.SUN)['longitude'])%360
    assert abs(separation-88)<1e-6
    assert 70<context.jd_ut1-design<100
    assert abs(context.jd_ut1-design-88)>.01

def test_eleven_spheres():
    s=calculate(BASE)['modules']['gene_keys']['data']['spheres']
    assert len(s)==11
    for item in s.values():
        assert 1<=item['key']<=64 and 1<=item['line']<=6

def test_geography_optional_for_planets():
    b={k:v for k,v in BASE.items() if k not in ['latitude','longitude']}
    out=calculate(b)
    assert out['modules']['western']['data']['houses']['status']=='unavailable'
    assert out['modules']['gene_keys']['status']=='calculated'

def test_high_latitude_no_house_substitution():
    out=calculate({**BASE,'latitude':70})
    assert out['modules']['western']['data']['houses']['status']=='unsupported'
    assert out['modules']['western']['settings']['houses']=='placidus'

def test_swe_global_state_does_not_leak():
    a=calculate(BASE,modules=['vedic','western'])
    b=calculate(BASE,modules=['western','vedic'])
    assert a['modules']['western']['data']==b['modules']['western']['data']
    assert a['modules']['vedic']['data']==b['modules']['vedic']['data']

def test_whole_sign_houses():
    v=calculate(BASE)['modules']['vedic']['data']
    for p in v['planets'].values():
        assert p['house']==(p['sign_index']-v['lagna']['sign_index'])%12+1
    assert abs((v['planets']['rahu']['longitude']-v['planets']['ketu']['longitude'])%360-180)<1e-7

def test_nakshatra_boundaries():
    assert nakshatra(0)['name']=='アシュヴィニー'
    assert nakshatra(0)['pada']==1
    assert nakshatra(359.999)['index']==27
    assert nakshatra(359.999)['pada']==4

def test_unknown_module():
    with pytest.raises(InputError):
        calculate(BASE,modules=['made_up'])

def test_all_angles_and_aspects_ranges():
    out=calculate(BASE)
    for m in ['western','vedic']:
        for p in out['modules'][m]['data']['planets'].values():
            assert 0<=p['longitude']<360
            assert 0<=p['degree_in_sign']<30
    for a in out['modules']['western']['data']['aspects']:
        assert 0<=a['orb_deg']<=6
