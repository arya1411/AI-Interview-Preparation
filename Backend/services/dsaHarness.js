const { DsaError } = require('./dsaValidation');
const PREFIX = '__PREPAI_RESULT__:';
const CPP_TYPES = { int: 'int', 'int[]': 'vector<int>', bool: 'bool', string: 'string' };
const JAVA_TYPES = { int: 'int', 'int[]': 'int[]', bool: 'boolean', string: 'String' };
function literal(value, type, language) {
  if (type === 'int[]') return language === 'cpp' ? `vector<int>{${value.join(',')}}` : `new int[]{${value.join(',')}}`;
  if (type === 'string') {
    // Encode strings into bytes/code points instead of interpolating user text into source.
    if (language === 'cpp') return `string({${Array.from(Buffer.from(value,'utf8')).map(b => `char(${b})`).join(',')}})`;
    return `new String(new int[]{${Array.from(value).map(c=>c.codePointAt(0)).join(',')}},0,${Array.from(value).length})`;
  }
  return String(value);
}
function buildHarness(language, code, test, signature) {
  if (language === 'javascript') return `${code}\n(async()=>{ const value = await solution(...JSON.parse(${JSON.stringify(JSON.stringify(test.args))})); console.log(${JSON.stringify(PREFIX)} + JSON.stringify(value)); })().catch(e=>{ console.error(String(e)); process.exitCode=1; });`;
  if (language === 'python') return `import json\n${code}\n_prepai_args=json.loads(${JSON.stringify(JSON.stringify(test.args))})\n_prepai_result=solution(*_prepai_args)\nprint(${JSON.stringify(PREFIX)}+json.dumps(_prepai_result,ensure_ascii=False,separators=(',',':')))\n`;
  if (!signature) throw new DsaError('This problem needs a typed signature before it can run in C++ or Java. Download the updated sheet template.');
  if (language === 'cpp') {
    const vars = test.args.map((arg,i)=>`${CPP_TYPES[signature.args[i]]} arg${i} = ${literal(arg,signature.args[i],'cpp')};`).join('\n');
    return `#include <bits/stdc++.h>
using namespace std;
string prepaiJson(const string& s) { string out="\\\""; const char* hex="0123456789abcdef"; for(unsigned char c:s) { if(c=='"'||c=='\\\\') { out+='\\\\'; out+=c; } else if(c<32) { out+="\\\\u00"; out+=hex[c>>4]; out+=hex[c&15]; } else out+=c; } return out+"\\\""; }
string prepaiJson(bool v) { return v?"true":"false"; }
string prepaiJson(int v) { return to_string(v); }
string prepaiJson(long long v) { return to_string(v); }
template<class T> string prepaiJson(const vector<T>& v) { string out="["; for(size_t i=0;i<v.size();++i) { if(i)out+=","; out+=prepaiJson(v[i]); } return out+"]"; }
${code}
int main() { ${vars}\nauto result=solution(${test.args.map((_,i)=>`arg${i}`).join(',')}); cout << ${JSON.stringify(PREFIX)} << prepaiJson(result) << endl; }
`;
  }
  if (language === 'java') {
    const vars = test.args.map((arg,i)=>`${JAVA_TYPES[signature.args[i]]} arg${i} = ${literal(arg,signature.args[i],'java')};`).join('\n');
    // Imports belong before the user's Solution class, never inside Main.
    const imports = code.match(/^\s*import\s+[^;]+;/gm) || [];
    const solution = code.replace(/^\s*import\s+[^;]+;/gm, '').replace(/\bpublic\s+class\s+Solution\b/g, 'class Solution');
    return `import java.util.*;\n${imports.join('\n')}\n${solution}
public class Main {
  static String json(Object value) {
    if(value==null) return "null";
    if(value instanceof String) { StringBuilder out=new StringBuilder("\\\""); for(char c:((String)value).toCharArray()) { if(c=='"'||c=='\\\\') out.append('\\\\').append(c); else if(c<32) out.append(String.format("\\\\u%04x",(int)c)); else out.append(c); } return out.append('"').toString(); }
    if(value.getClass().isArray()) { StringJoiner out=new StringJoiner(",","[","]"); for(int i=0;i<java.lang.reflect.Array.getLength(value);i++) out.add(json(java.lang.reflect.Array.get(value,i))); return out.toString(); }
    if(value instanceof Number || value instanceof Boolean) return value.toString();
    throw new IllegalArgumentException("Return a JSON-compatible value");
  }
  public static void main(String[] args) throws Exception { ${vars}\nObject result=new Solution().solution(${test.args.map((_,i)=>`arg${i}`).join(',')}); System.out.println(${JSON.stringify(PREFIX)}+json(result)); }
}
`;
  }
  throw new DsaError('Unsupported language.');
}
module.exports = { buildHarness, PREFIX };
