import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Editor from '@monaco-editor/react';
import {
  Check, ChevronDown, Clipboard, Download, Moon, Play, RotateCcw, Sun, TerminalSquare,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { compilerLanguages } from "../data/compilerLanguages";


const emptyResult = { state: 'idle', stdout: '', stderr: '', message: '', durationMs: null, memory: null };

const CodeCompiler = ({ languageId, onLanguageChange }) => {
  const [activeLanguage, setActiveLanguage] = useState(languageId in compilerLanguages ? languageId : 'python');
  const [code, setCode] = useState(() => compilerLanguages[activeLanguage].starter);
  const [stdin, setStdin] = useState('');
  const [stdinOpen, setStdinOpen] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [isDark, setIsDark] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(emptyResult);
  const [copied, setCopied] = useState(false);

  const language = compilerLanguages[activeLanguage];

  useEffect(() => {
    const nextLanguage = languageId in compilerLanguages ? languageId : 'python';
    setActiveLanguage(nextLanguage);
    setCode(compilerLanguages[nextLanguage].starter);
    setResult(emptyResult);
  }, [languageId]);

  const runCode = useCallback(async () => {
    if (running) return;

    setRunning(true);
    setResult({ ...emptyResult, state: 'running' });
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 20_000);

    try {
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: controller.signal,
        body: JSON.stringify({ language: language.id, code, stdin }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Unable to run this program.');

      const compile = body.compile || {};
      const run = body.run || {};
      const compileFailed = typeof compile.code === 'number' && compile.code !== 0;
      const runtimeFailed = !compileFailed && typeof run.code === 'number' && run.code !== 0;
      setResult({
        state: compileFailed ? 'compile-error' : runtimeFailed ? 'runtime-error' : 'success',
        stdout: run.stdout || '',
        stderr: compile.stderr || run.stderr || '',
        message: body.message || '',
        durationMs: body.durationMs ?? run.time ?? null,
        memory: body.memory ?? run.memory ?? null,
      });
    } catch (error) {
      setResult({
        ...emptyResult,
        state: error.name === 'AbortError' ? 'timeout' : 'runtime-error',
        message: error.name === 'AbortError' ? 'Execution timed out after 20 seconds.' : error.message,
      });
    } finally {
      window.clearTimeout(timeoutId);
      setRunning(false);
    }
  }, [code, language.id, running, stdin]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        runCode();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [runCode]);

  const selectLanguage = (event) => {
    const nextId = event.target.value;
    setActiveLanguage(nextId);
    setCode(compilerLanguages[nextId].starter);
    setResult(emptyResult);
    onLanguageChange(nextId);
  };

  const resetCode = () => {
    setCode(language.starter);
    setResult(emptyResult);
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setResult({ ...result, message: 'Could not copy code. Please select it from the editor instead.' });
    }
  };

  const downloadCode = () => {
    const file = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(file);
    link.download = language.fileName;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const outputHeading = useMemo(() => ({
    idle: 'Output', running: 'Running…', success: 'Program output', 'compile-error': 'Compile error',
    'runtime-error': 'Runtime error', timeout: 'Execution timed out',
  }[result.state]), [result.state]);

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-[#D7D3CF] px-3 py-2 sm:px-4">
        <div className="relative">
          <select value={activeLanguage} onChange={selectLanguage} aria-label="Programming language" className="appearance-none rounded-[4px] border border-[#D7D3CF] bg-white py-2 pl-3 pr-8 text-xs font-semibold text-[#111111] outline-none focus:border-[#102326]">
            {Object.values(compilerLanguages).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#666666]" aria-hidden="true" />
        </div>
        <div className="flex items-center rounded-[4px] border border-[#D7D3CF] bg-white">
          <button type="button" onClick={() => setFontSize((size) => Math.max(12, size - 1))} className="px-2 py-2 text-xs font-semibold hover:bg-[#ECEAE7]" aria-label="Decrease editor font size">A−</button>
          <span className="border-x border-[#D7D3CF] px-2 py-2 font-mono text-[10px] text-[#666666]">{fontSize}px</span>
          <button type="button" onClick={() => setFontSize((size) => Math.min(22, size + 1))} className="px-2 py-2 text-xs font-semibold hover:bg-[#ECEAE7]" aria-label="Increase editor font size">A+</button>
        </div>
        <button type="button" onClick={() => setIsDark((value) => !value)} className="rounded-[4px] border border-[#D7D3CF] p-2 text-[#455052] hover:bg-[#ECEAE7]" aria-label={`Use ${isDark ? 'light' : 'dark'} editor theme`}>
          {isDark ? <Sun size={15} aria-hidden="true" /> : <Moon size={15} aria-hidden="true" />}
        </button>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button variant="secondary" className="px-3 py-2" onClick={copyCode}>{copied ? <Check size={14} /> : <Clipboard size={14} />} {copied ? 'Copied' : 'Copy'}</Button>
          <Button variant="secondary" className="px-3 py-2" onClick={downloadCode}><Download size={14} /> Download</Button>
          <Button variant="secondary" className="px-3 py-2" onClick={resetCode}><RotateCcw size={14} /> Reset</Button>
          <Button className="px-3 py-2" onClick={runCode} disabled={running}><Play size={14} fill="currentColor" /> {running ? 'Running' : 'Run'}</Button>
        </div>
      </div>

      <div className="min-h-[380px] flex-1 border-b border-[#D7D3CF]">
        <Editor height="100%" language={language.monaco} theme={isDark ? 'vs-dark' : 'vs'} value={code} onChange={(value) => setCode(value ?? '')} options={{ fontSize, minimap: { enabled: false }, padding: { top: 14 }, scrollBeyondLastLine: false, automaticLayout: true }} />
      </div>

      <div className="border-b border-[#D7D3CF]">
        <button type="button" onClick={() => setStdinOpen((open) => !open)} className="flex w-full items-center justify-between px-4 py-2.5 text-left text-xs font-semibold text-[#111111] hover:bg-[#FAF9F7]">
          <span className="flex items-center gap-2"><TerminalSquare size={15} aria-hidden="true" /> Standard input (stdin)</span>
          <ChevronDown size={15} className={stdinOpen ? 'rotate-180 transition-transform' : 'transition-transform'} aria-hidden="true" />
        </button>
        {stdinOpen && <textarea value={stdin} onChange={(event) => setStdin(event.target.value)} placeholder="Enter input for your program…" className="mx-4 mb-3 block min-h-20 w-[calc(100%-2rem)] resize-y rounded-[4px] border border-[#D7D3CF] bg-[#FAF9F7] p-3 font-mono text-xs outline-none focus:border-[#102326]" />}
      </div>

      <div className="bg-[#102326] px-4 py-3 text-[#F7F5F2]">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-mono text-[10px] font-semibold uppercase tracking-wider">{outputHeading}</h2>
          {result.durationMs !== null && <span className="font-mono text-[10px] text-[#B8C4C2]">{result.durationMs}ms{result.memory ? ` · ${result.memory}` : ''}</span>}
        </div>
        <pre className="mt-2 max-h-52 min-h-16 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-[#E9EFEE]">
          {result.state === 'idle' && 'Run your code to see output here.'}
          {result.state === 'running' && 'Executing your program…'}
          {result.stdout}
          {result.stderr && <span className="block text-[#FFB4A2]">{result.stderr}</span>}
          {result.message && <span className="block text-[#FFB4A2]">{result.message}</span>}
          {['success', 'compile-error', 'runtime-error', 'timeout'].includes(result.state) && !result.stdout && !result.stderr && !result.message && 'Program completed with no output.'}
        </pre>
        <p className="mt-2 font-mono text-[10px] text-[#B8C4C2]">Run: {navigator.platform?.includes('Mac') ? '⌘' : 'Ctrl'} + Enter</p>
      </div>
    </section>
  );
};

export default CodeCompiler;
