import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Button, Modal, Space, Switch } from 'antd';
import { basicSetup } from 'codemirror';
import { Annotation, Compartment, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { json, jsonParseLinter } from '@codemirror/lang-json';
import { foldAll, unfoldAll, HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { openSearchPanel } from '@codemirror/search';
import { linter } from '@codemirror/lint';
import { tags } from '@lezer/highlight';
import { useTheme } from '../../theme/ThemeProvider';
import '../../styles/code-editor.css';

const externalValue = Annotation.define();
const language = new Compartment();
const wrapping = new Compartment();
const appearance = new Compartment();
const editing = new Compartment();
const getLanguage = isJSON => isJSON ? [json(), linter(jsonParseLinter(), { delay: 500 })] : [];
const getAppearance = dark => [
  EditorView.theme({
    '&': { height: '100%', color: 'var(--mm-text)', backgroundColor: 'var(--mm-surface)' },
    '.cm-scroller': { overflow: 'auto', fontFamily: "'SFMono-Regular', Consolas, monospace", fontSize: '12px', lineHeight: '1.8' },
    '.cm-content': { padding: '8px 0', caretColor: 'var(--mm-text)' },
    '.cm-gutters': { color: 'var(--mm-muted)', backgroundColor: 'var(--mm-bg)', borderRight: '1px solid var(--mm-border)' },
    '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: 'var(--mm-subtle)' },
    '&.cm-focused': { outline: 'none' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': { backgroundColor: dark ? '#354467' : '#dbe4ff' },
    '.cm-cursor': { borderLeftColor: 'var(--mm-text)' },
    '.cm-foldPlaceholder': { backgroundColor: 'var(--mm-subtle)', color: 'var(--mm-primary)', borderColor: 'var(--mm-border)' },
    '.cm-panels, .cm-tooltip': { backgroundColor: 'var(--mm-surface)', color: 'var(--mm-text)', borderColor: 'var(--mm-border)' },
    '.cm-searchMatch': { backgroundColor: dark ? '#78602b' : '#fff0ab' },
    '.cm-searchMatch-selected': { backgroundColor: dark ? '#8c6322' : '#ffdb78' }
  }, { dark }),
  syntaxHighlighting(HighlightStyle.define([
    { tag: tags.propertyName, color: dark ? '#91c9ff' : '#175ca4' },
    { tag: tags.string, color: dark ? '#a8d69a' : '#327a39' },
    { tag: tags.number, color: dark ? '#f0bc87' : '#995400' },
    { tag: [tags.bool, tags.null], color: dark ? '#d6adff' : '#7c3eb3' },
    { tag: tags.punctuation, color: dark ? '#b6c0d2' : '#667085' },
    { tag: tags.invalid, color: '#e85555', textDecoration: 'underline' }
  ]))
];
const phrases = {
  'Find': '查找', 'Replace': '替换', 'next': '下一个', 'previous': '上一个',
  'all': '全部', 'replace': '替换', 'replace all': '全部替换', 'close': '关闭',
  'match case': '区分大小写', 'regexp': '正则表达式', 'by word': '整词匹配',
  'Fold line': '折叠代码', 'Unfold line': '展开代码', 'unfold': '展开'
};

export default function ResponseCodeEditor({ value, onChange, isJSON = true, disabled = false }) {
  const normalHost = useRef(null), viewRef = useRef(null), onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const { currentTheme } = useTheme();
  const dark = currentTheme === 'dark' || currentTheme === 'cyber';
  const [fullscreen, setFullscreen] = useState(false), [modalHost, setModalHost] = useState(null);
  const [wrap, setWrap] = useState(() => localStorage.getItem('mm-code-wrap') !== 'false');
  const [position, setPosition] = useState({ line: 1, column: 1, lines: 1 });

  useLayoutEffect(() => {
    const view = new EditorView({
      parent: normalHost.current,
      state: EditorState.create({
        doc: value || '',
        extensions: [basicSetup, EditorState.phrases.of(phrases),
          EditorView.contentAttributes.of({ 'aria-label': '响应内容', 'aria-multiline': 'true', spellcheck: 'false' }),
          language.of(getLanguage(isJSON)), wrapping.of(wrap ? EditorView.lineWrapping : []),
          appearance.of(getAppearance(dark)),
          editing.of([EditorState.readOnly.of(disabled), EditorView.editable.of(!disabled)]),
          EditorView.updateListener.of(update => {
            if (update.docChanged || update.selectionSet) {
              const cursor = update.state.selection.main.head, line = update.state.doc.lineAt(cursor);
              setPosition({ line: line.number, column: cursor - line.from + 1, lines: update.state.doc.lines });
            }
            if (update.docChanged && !update.transactions.every(t => t.annotation(externalValue))) {
              onChangeRef.current(update.state.doc.toString());
            }
          })]
      })
    });
    viewRef.current = view;
    setPosition({ line: 1, column: 1, lines: view.state.doc.lines });
    return () => { viewRef.current = null; view.destroy(); view.dom.remove(); };
  }, []);

  useEffect(() => {
    const view = viewRef.current, next = value || '';
    if (view && view.state.doc.toString() !== next) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: next }, annotations: externalValue.of(true) });
    }
  }, [value]);
  useEffect(() => { viewRef.current?.dispatch({ effects: language.reconfigure(getLanguage(isJSON)) }); }, [isJSON]);
  useEffect(() => { viewRef.current?.dispatch({ effects: appearance.reconfigure(getAppearance(dark)) }); }, [dark]);
  useEffect(() => { viewRef.current?.dispatch({ effects: wrapping.reconfigure(wrap ? EditorView.lineWrapping : []) }); }, [wrap]);
  useEffect(() => {
    viewRef.current?.dispatch({ effects: editing.reconfigure([EditorState.readOnly.of(disabled), EditorView.editable.of(!disabled)]) });
  }, [disabled]);

  // Move the same view into the dialog; preserve undo, selection, folds and scroll.
  useLayoutEffect(() => {
    const view = viewRef.current, target = fullscreen ? modalHost : normalHost.current;
    if (!view || !target || view.dom.parentElement === target) return;
    const scroll = view.scrollDOM.scrollTop;
    target.appendChild(view.dom);
    view.requestMeasure();
    view.scrollDOM.scrollTop = scroll;
    view.focus();
  }, [fullscreen, modalHost]);

  const command = fn => { if (viewRef.current) { fn(viewRef.current); viewRef.current.focus(); } };
  const toolbar = <div className="mm-code-toolbar"><Space size={6} wrap>
    <Button size="small" onClick={() => command(openSearchPanel)}>查找 / 替换</Button>
    {isJSON && <><Button size="small" onClick={() => command(foldAll)}>全部折叠</Button><Button size="small" onClick={() => command(unfoldAll)}>全部展开</Button></>}
  </Space><Space size={8}><label className="mm-code-wrap">自动换行 <Switch size="small" aria-label="代码自动换行" checked={wrap} onChange={checked => { setWrap(checked); localStorage.setItem('mm-code-wrap', String(checked)); }} /></label>
    <Button size="small" aria-label={fullscreen ? '退出全屏编辑' : '全屏编辑响应'} onClick={() => setFullscreen(!fullscreen)}>{fullscreen ? '退出全屏' : '全屏'}</Button>
  </Space></div>;
  const status = <div className="mm-code-status" aria-label="编辑器状态"><span>行 {position.line}，列 {position.column} · 共 {position.lines} 行</span><span>{isJSON ? 'JSON / Mock.js' : '纯文本'} · Ctrl / ⌘ F 查找</span></div>;
  return <div className="mm-code-editor">
    <div hidden={fullscreen}>{toolbar}<div className="mm-code-host" ref={normalHost} />{status}</div>
    <Modal title="响应内容 · 全屏编辑" width="95vw" style={{ top: 16 }} open={fullscreen} onCancel={() => setFullscreen(false)} footer={<Button onClick={() => setFullscreen(false)}>返回编辑器</Button>} afterOpenChange={open => { if (open) { viewRef.current?.requestMeasure(); viewRef.current?.focus(); } }}>
      {toolbar}<div className="mm-code-host mm-code-host-fullscreen" ref={setModalHost} />{status}
    </Modal>
  </div>;
}
