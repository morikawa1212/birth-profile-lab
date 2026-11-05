# SPDX-License-Identifier: AGPL-3.0-or-later
"""Shared input/time/ephemeris layer. Prototype: Gregorian dates 1900–2099.

No geocoder, remote calls, database, analytics or hidden ephemeris fallback.
The caller provides a confirmed IANA timezone and optional geographic coordinates.
"""
from __future__ import annotations
from dataclasses import dataclass
from datetime import date, datetime, time, timezone
import math
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
import swisseph as swe

class InputError(ValueError):
    pass

class EphemerisError(RuntimeError):
    pass

@dataclass(frozen=True)
class BirthContext:
    local_date: date
    local_time: time | None
    time_accuracy: str
    timezone_name: str | None
    utc: datetime | None
    latitude: float | None
    longitude: float | None
    jd_ut1: float | None
    jd_tt: float | None
    notes: tuple[str, ...]

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> 'BirthContext':
        if not isinstance(data, dict):
            raise InputError('入力はJSONオブジェクトで指定してください。')
        try:
            day = date.fromisoformat(data['date'])
        except (KeyError, TypeError, ValueError) as e:
            raise InputError('dateはYYYY-MM-DD形式の実在する日付で指定してください。') from e
        if not 1900 <= day.year <= 2099:
            raise InputError('試作版の対応範囲は1900〜2099年のグレゴリオ暦です。')
        accuracy = data.get('time_accuracy', 'exact' if data.get('time') else 'unknown')
        if accuracy not in ('exact', 'approximate', 'unknown'):
            raise InputError('time_accuracyはexact/approximate/unknownです。')
        if accuracy == 'unknown' and data.get('time'):
            raise InputError('時間不明に推定時刻を混ぜないでください。timeを省略するかapproximateを使ってください。')
        if accuracy != 'unknown' and not data.get('time'):
            raise InputError('exact/approximateには出生時刻が必要です。')
        t = None
        if data.get('time'):
            try:
                t = time.fromisoformat(data['time'])
            except (TypeError, ValueError) as e:
                raise InputError('timeはHH:MM[:SS]形式で指定してください。') from e
            if t.tzinfo is not None:
                raise InputError('timeにUTCオフセットを付けずtimezoneを別途指定してください。')
        lat, lon = data.get('latitude'), data.get('longitude')
        if (lat is None) != (lon is None):
            raise InputError('latitudeとlongitudeは両方指定してください。')
        for name, value, limit in [('latitude', lat, 90), ('longitude', lon, 180)]:
            if value is not None and (isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or abs(value) > limit):
                raise InputError(f'{name}の範囲・数値を確認してください。')
        if lat is not None and abs(lat) == 90:
            raise InputError('地理的な極点はこの試作版では扱いません。')
        tzname = data.get('timezone')
        utc = None
        notes: list[str] = []
        jd_ut1 = jd_tt = None
        if t:
            if not isinstance(tzname, str) or not tzname:
                raise InputError('出生時刻の計算にはIANA timezoneが必要です。')
            try:
                tz = ZoneInfo(tzname)
            except (ZoneInfoNotFoundError, ValueError) as e:
                raise InputError('timezoneが見つかりません。例: Asia/Tokyo') from e
            local = datetime.combine(day, t)
            possibilities: dict[datetime, int] = {}
            by_fold: dict[int, datetime] = {}
            for fold in (0, 1):
                candidate = local.replace(tzinfo=tz, fold=fold).astimezone(timezone.utc)
                if candidate.astimezone(tz).replace(tzinfo=None) == local:
                    possibilities[candidate] = fold
                    by_fold[fold] = candidate
            if not possibilities:
                raise InputError('夏時間への移行などにより存在しない現地時刻です。')
            if len(possibilities) > 1:
                fold = data.get('fold')
                if type(fold) is not int or fold not in (0, 1):
                    raise InputError('現地時刻が二重に存在します。fold=0（変更前）か1（変更後）を確認してください。')
                utc = by_fold[fold]
                notes.append('夏時間終了等の重複時刻を明示されたfoldで解決しました。')
            else:
                utc = next(iter(possibilities))
            jd_tt, jd_ut1 = swe.utc_to_jd(utc.year, utc.month, utc.day, utc.hour, utc.minute, utc.second + utc.microsecond / 1e6, swe.GREG_CAL)
        if accuracy == 'approximate':
            notes.append('概算時刻による仮計算です。時間幅を評価していないため確定結果ではありません。')
        if accuracy == 'unknown':
            notes.append('出生時刻不明。正午を自動代入せず、出生時刻を使う計算は保留します。')
        return cls(day, t, accuracy, tzname, utc, lat, lon, jd_ut1, jd_tt, tuple(notes))

SIGNS = ('牡羊座','牡牛座','双子座','蟹座','獅子座','乙女座','天秤座','蠍座','射手座','山羊座','水瓶座','魚座')
PLANETS = {'sun': swe.SUN,'moon': swe.MOON,'mercury': swe.MERCURY,'venus': swe.VENUS,'mars': swe.MARS,'jupiter': swe.JUPITER,'saturn': swe.SATURN,'uranus': swe.URANUS,'neptune': swe.NEPTUNE,'pluto': swe.PLUTO}

def zodiac(longitude: float) -> dict[str, Any]:
    value = longitude % 360
    return {'longitude': round(value, 9), 'sign_index': int(value // 30), 'sign': SIGNS[int(value // 30)], 'degree_in_sign': round(value % 30, 9)}

class Ephemeris:
    def __init__(self, mode: str = 'moshier', ephe_path: str | None = None):
        if mode not in ('moshier', 'swiss'):
            raise InputError('ephemerisはmoshierまたはswissを指定してください。')
        self.mode = mode
        self.flag = swe.FLG_MOSEPH if mode == 'moshier' else swe.FLG_SWIEPH
        self.path = str(Path(ephe_path).resolve()) if ephe_path else None
        if mode == 'swiss':
            if not self.path or not Path(self.path).is_dir():
                raise EphemerisError('swissモードには実在するephe_pathと必要な暦ファイルが必要です。')
            swe.set_ephe_path(self.path)
        self.cache: dict[tuple[float, int, bool], dict[str, Any]] = {}

    def position(self, jd: float, planet: int, sidereal: bool = False) -> dict[str, Any]:
        key = (jd, planet, sidereal)
        if key in self.cache:
            return self.cache[key]
        if sidereal:
            swe.set_sid_mode(swe.SIDM_LAHIRI)
        flags = self.flag | swe.FLG_SPEED | (swe.FLG_SIDEREAL if sidereal else 0)
        try:
            values, returned = swe.calc_ut(jd, planet, flags)
        except swe.Error as e:
            raise EphemerisError(str(e)) from e
        if planet != swe.MEAN_NODE and not (returned & self.flag):
            raise EphemerisError('指定と異なる暦へフォールバックしたため停止しました。')
        result = {'longitude': values[0] % 360, 'latitude': values[1], 'longitude_speed': values[3], 'retrograde': values[3] < 0, 'returned_flags': returned}
        self.cache[key] = result
        return result

    def design_jd(self, birth_jd: float) -> float:
        sun = self.position(birth_jd, swe.SUN)['longitude']
        def residual(jd: float) -> float:
            then = self.position(jd, swe.SUN)['longitude']
            return ((sun - then + 180) % 360) - 180 - 88
        low, high = birth_jd - 100, birth_jd - 70
        if residual(low) <= 0 or residual(high) >= 0:
            raise EphemerisError('出生前88度の探索区間が不正です。')
        for _ in range(52):
            mid = (low + high) / 2
            if residual(mid) > 0:
                low = mid
            else:
                high = mid
        return (low + high) / 2
