# SPDX-License-Identifier: AGPL-3.0-or-later
from __future__ import annotations
import argparse
import json
from pathlib import Path
import sys
from . import calculate, InputError, EphemerisError

def main() -> int:
    parser = argparse.ArgumentParser(description='出生情報のローカル計算試作。外部送信・保存なし。')
    parser.add_argument('input', type=Path, help='入力JSONのパス')
    parser.add_argument('--ephemeris', choices=['moshier','swiss'], default='moshier')
    parser.add_argument('--ephe-path', help='swissモードの暦ファイル格納ディレクトリ')
    parser.add_argument('--modules', nargs='+', help='gene_keys western vedic numerology')
    args = parser.parse_args()
    try:
        data = json.loads(args.input.read_text(encoding='utf-8'))
        result = calculate(data,ephemeris=args.ephemeris,ephe_path=args.ephe_path,modules=args.modules)
    except (OSError,json.JSONDecodeError,InputError,EphemerisError) as e:
        print(f'計算を中止しました: {e}',file=sys.stderr)
        return 2
    print(json.dumps(result,ensure_ascii=False,indent=2,allow_nan=False))
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
