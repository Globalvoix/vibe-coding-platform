'use client'

import dynamic from 'next/dynamic'
import { PulseLoader } from 'react-spinners'

const Editor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="absolute w-full h-full flex items-center justify-center">
      <PulseLoader className="opacity-60" size={8} />
    </div>
  ),
})

const extensionToMonacoLanguage: Record<string, string> = {
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  mjs: 'javascript',
  cjs: 'javascript',
  py: 'python',
  pyw: 'python',
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'scss',
  sass: 'scss',
  less: 'less',
  json: 'json',
  jsonc: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  md: 'markdown',
  markdown: 'markdown',
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',
  sql: 'sql',
  go: 'go',
  rs: 'rust',
  java: 'java',
  cpp: 'cpp',
  c: 'c',
  cs: 'csharp',
  php: 'php',
  rb: 'ruby',
  swift: 'swift',
  kt: 'kotlin',
  toml: 'ini',
  ini: 'ini',
  env: 'shell',
  dockerfile: 'dockerfile',
  xml: 'xml',
  svg: 'xml',
}

function detectLanguage(path: string): string {
  const filename = path.split('/').pop() ?? path
  const lower = filename.toLowerCase()

  if (lower === 'dockerfile') return 'dockerfile'
  if (lower === '.gitignore' || lower === '.env' || lower.startsWith('.env.')) return 'shell'

  const ext = lower.split('.').pop() ?? ''
  return extensionToMonacoLanguage[ext] ?? 'plaintext'
}

interface Props {
  path: string
  code: string
  readOnly?: boolean
  onChange?: (value: string) => void
}

export function MonacoEditor({ path, code, readOnly = true, onChange }: Props) {
  const language = detectLanguage(path)

  return (
    <Editor
      height="100%"
      language={language}
      value={code}
      theme="vs-light"
      options={{
        readOnly,
        fontSize: 13,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        lineNumbers: 'on',
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        automaticLayout: true,
        tabSize: 2,
        renderLineHighlight: 'line',
        padding: { top: 8, bottom: 8 },
        overviewRulerLanes: 0,
        hideCursorInOverviewRuler: true,
        scrollbar: {
          verticalScrollbarSize: 6,
          horizontalScrollbarSize: 6,
        },
      }}
      onChange={(value) => onChange?.(value ?? '')}
    />
  )
}
