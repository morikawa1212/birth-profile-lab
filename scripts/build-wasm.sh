#!/bin/sh
# Swiss Ephemeris 2.10.03 公式ソースから vendor/swe の WebAssembly を生成する
# 使い方: build-wasm.sh <swisseph ソース> <emsdk> <出力先>
set -eu
SRC=$1; EMSDK=$2; OUT=$3
. "$EMSDK/emsdk_env.sh" >/dev/null 2>&1
mkdir -p "$OUT"
cd "$SRC"
emcc -O2 sweph.c swephlib.c swedate.c swehouse.c swejpl.c swemmoon.c swemplan.c swecl.c \
  -o "$OUT/swe.mjs" \
  -sMODULARIZE -sEXPORT_ES6 -sEXPORT_NAME=createSwe -sENVIRONMENT=web,worker,node \
  -sALLOW_MEMORY_GROWTH -sFORCE_FILESYSTEM -sINITIAL_MEMORY=33554432 \
  -sEXPORTED_RUNTIME_METHODS=FS,ccall,getValue,setValue,UTF8ToString \
  -sEXPORTED_FUNCTIONS=_malloc,_free,_swe_version,_swe_set_ephe_path,_swe_set_sid_mode,_swe_calc_ut,_swe_houses_ex,_swe_get_ayanamsa_ex_ut,_swe_utc_to_jd,_swe_close
