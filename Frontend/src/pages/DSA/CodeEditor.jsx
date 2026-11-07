import Editor, { loader } from '@monaco-editor/react'
import { useEffect, useRef } from 'react'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import 'monaco-editor/esm/vs/editor/editor.all.js'
import 'monaco-editor/esm/vs/basic-languages/python/python.contribution.js'
import 'monaco-editor/esm/vs/basic-languages/cpp/cpp.contribution.js'
import 'monaco-editor/esm/vs/basic-languages/java/java.contribution.js'
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution.js'
import 'monaco-editor/esm/vs/language/typescript/monaco.contribution.js'
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker.js?worker'
import TypeScriptWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker.js?worker'

self.MonacoEnvironment = {
  getWorker(_, label) {
    return label === 'typescript' || label === 'javascript' ? new TypeScriptWorker() : new EditorWorker()
  },
}
loader.config({ monaco })
monaco.editor.defineTheme('prepai', {
  base: 'vs-dark', inherit: true, rules: [],
  colors: { 'editor.background': '#101010', 'editorLineNumber.foreground': '#737373', 'editor.lineHighlightBackground': '#171717', 'editor.selectionBackground': '#404040', 'editor.inactiveSelectionBackground': '#262626' },
})
for (const language of ['python', 'cpp', 'java']) {
  monaco.languages.registerCompletionItemProvider(language, {
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position)
      const range = { startLineNumber: position.lineNumber, endLineNumber: position.lineNumber, startColumn: word.startColumn, endColumn: word.endColumn }
      const snippets = language === 'python' ? [
        ['for', 'for ${1:item} in ${2:items}:\n    $0'],
        ['if', 'if ${1:condition}:\n    $0'],
        ['enumerate', 'for ${1:index}, ${2:value} in enumerate(${3:items}):\n    $0'],
      ] : [
        ['for', 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n    $0\n}'],
        ['if', 'if (${1:condition}) {\n    $0\n}'],
        ['while', 'while (${1:condition}) {\n    $0\n}'],
      ]
      return { suggestions: snippets.map(([label, insertText]) => ({ label, insertText, range, kind: monaco.languages.CompletionItemKind.Snippet, insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet })) }
    },
  })
}

export default function CodeEditor({ code, language, path, onChange, onRun, onSubmit }) {
  const actions = useRef({ onRun, onSubmit })
  useEffect(() => { actions.current = { onRun, onSubmit } }, [onRun, onSubmit])
  return <Editor height="100%" path={path} language={language} value={code} theme="prepai" onChange={value => onChange(value ?? '')} loading={<span className="dsa-muted">Loading code editor…</span>} options={{
    fontSize: 15, lineHeight: 30, fontFamily: "'SFMono-Regular',Consolas,'Liberation Mono',monospace",
    minimap: { enabled: false }, automaticLayout: true, scrollBeyondLastLine: false,
    padding: { top: 20, bottom: 20 }, tabSize: 2, insertSpaces: true,
    wordWrap: 'off', lineNumbersMinChars: 3, renderLineHighlight: 'line',
    bracketPairColorization: { enabled: true }, autoClosingBrackets: 'always',
    quickSuggestions: true, suggestOnTriggerCharacters: true, wordBasedSuggestions: 'currentDocument',
    accessibilitySupport: 'auto', ariaLabel: `${language} code editor`,
  }} onMount={(editor, api) => {
    editor.addAction({ id: 'prepai.run', label: 'Run sample tests', keybindings: [api.KeyMod.CtrlCmd | api.KeyCode.Enter], run: () => actions.current.onRun() })
    editor.addAction({ id: 'prepai.submit', label: 'Submit solution', keybindings: [api.KeyMod.CtrlCmd | api.KeyMod.Shift | api.KeyCode.Enter], run: () => actions.current.onSubmit() })
  }} />
}
