# SPDX-License-Identifier: AGPL-3.0-or-later
"""Birth Profile Lab, a local calculation prototype, not a deployed website."""
from __future__ import annotations
from importlib.metadata import version, PackageNotFoundError
from threading import RLock
from typing import Any
import swisseph as swe
from .core import BirthContext, Ephemeris, InputError, EphemerisError
from .modules import REGISTRY

_LOCK = RLock()  # Swiss Ephemeris has process-global configuration.

def calculate(data: dict[str, Any], *, ephemeris: str = 'moshier', ephe_path: str | None = None, modules: list[str] | None = None) -> dict[str, Any]:
    selected = modules if modules is not None else list(REGISTRY)
    unknown = set(selected)-REGISTRY.keys()
    if unknown:
        raise InputError('未登録のモジュール: '+', '.join(sorted(unknown)))
    with _LOCK:
        ctx = BirthContext.from_dict(data)
        ephe = Ephemeris(ephemeris, ephe_path)
        output = {name:REGISTRY[name](ctx,ephe) for name in selected}
        try:
            tzversion = version('tzdata')
            tzsource = 'package_available_system_may_take_precedence'
        except PackageNotFoundError:
            tzversion, tzsource = None, 'system_zoneinfo_version_not_pinned'
    return {'schema_version':'0.1.0','stage':'local_prototype','calculation':{'engine':'Swiss Ephemeris','engine_version':swe.version,'python_wrapper_version':version('pyswisseph'),'ephemeris_mode':ephemeris,'tzdata_package_version':tzversion,'timezone_data_note':tzsource,'official_chart_certified':False},'normalized_input':{'date':ctx.local_date.isoformat(),'time_accuracy':ctx.time_accuracy,'timezone':ctx.timezone_name,'utc':ctx.utc.isoformat() if ctx.utc else None,'latitude':ctx.latitude,'longitude':ctx.longitude},'warnings':list(ctx.notes)+(['試作はSwiss Ephemeris内蔵Moshier暦です。SWIEPH暦ファイルを用いた本番照合は未実施です。'] if ephemeris=='moshier' else []),'modules':output}

__all__ = ['calculate','InputError','EphemerisError']
