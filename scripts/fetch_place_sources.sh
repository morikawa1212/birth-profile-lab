#!/bin/sh
# 出生地データの元ファイルを取得する。使い方: fetch_place_sources.sh <作業フォルダ>
set -eu
cd "$1"
B=https://download.geonames.org/export/dump
curl -sSfL -O $B/JP.zip && unzip -oq JP.zip -d jp
curl -sSfL -o alt_JP.zip $B/alternatenames/JP.zip && unzip -oq alt_JP.zip -d alt
curl -sSfL -O $B/cities5000.zip && unzip -oq cities5000.zip
curl -sSfL -O $B/countryInfo.txt
curl -sSfL -O $B/alternateNamesV2.zip
unzip -p alternateNamesV2.zip alternateNamesV2.txt | awk -F'\t' '$3=="ja"' > alt_ja_en.txt
# 全国地方公共団体コード(https://www.soumu.go.jp/denshijiti/code.html)
curl -sSf -A "Mozilla/5.0" -o code.xlsx https://www.soumu.go.jp/main_content/000925835.xlsx
