#!/usr/bin/env bash
# Only the trusted identity solutions below are executed locally. User code is
# always sent to the configured isolated judge by the application.
set -euo pipefail
repo_root="$(cd "$(dirname "$0")/../.." && pwd)"
check_dir="$(mktemp -d /tmp/prepai-dsa-harnesses.XXXXXX)"
trap 'rm -rf "$check_dir"' EXIT
node - "$repo_root" "$check_dir" <<'JS'
const {buildHarness}=require(process.argv[2]+'/Backend/services/dsaHarness');
const {writeFileSync}=require('node:fs');
const dir=process.argv[3];
const types={cpp:{'int[]':'vector<int>',bool:'bool',string:'string'},java:{'int[]':'int[]',bool:'boolean',string:'String'}};
for(const [name,type,value] of [['array','int[]',[1,-2,3]],['bool','bool',true],['string','string','héllo\n"\\\u0000😀']]) {
  for(const language of ['cpp','python','java']) {
    const code=language==='cpp'?`${types.cpp[type]} solution(${types.cpp[type]} a) { return a; }`:language==='python'?'def solution(a):\n    return a':`class Solution { public static ${types.java[type]} solution(${types.java[type]} a) { return a; }}`;
    writeFileSync(`${dir}/${name}.${language==='python'?'py':language==='cpp'?'cpp':'java'}`,buildHarness(language,code,{args:[value],expected:value},{args:[type],returns:type}));
  }
  writeFileSync(`${dir}/${name}.expected`,JSON.stringify(value));
}
JS
for case_name in array bool string; do
  g++ -std=c++17 "$check_dir/$case_name.cpp" -o "$check_dir/$case_name-bin"
  "$check_dir/$case_name-bin" > "$check_dir/$case_name.cpp.output"
  python3 "$check_dir/$case_name.py" > "$check_dir/$case_name.python.output"
  if command -v javac >/dev/null && command -v java >/dev/null; then
    cp "$check_dir/$case_name.java" "$check_dir/Main.java"
    javac "$check_dir/Main.java"
    java -cp "$check_dir" Main > "$check_dir/$case_name.java.output"
  fi
done
python3 - "$check_dir" <<'PY'
import json,sys
from pathlib import Path
root=Path(sys.argv[1])
for case_name in ['array','bool','string']:
    expected=json.loads((root/f'{case_name}.expected').read_text())
    for language in ['cpp','python','java']:
        output=root/f'{case_name}.{language}.output'
        if not output.exists():
            continue
        result=output.read_text().strip().split('__PREPAI_RESULT__:')[-1]
        assert json.loads(result)==expected,(case_name,language,result)
        print(f'PASS {language}: {case_name} output and escaping')
if not (root/'array.java.output').exists():
    print('SKIP Java execution: JDK is unavailable; Java source generation is covered in unit tests.')
PY
