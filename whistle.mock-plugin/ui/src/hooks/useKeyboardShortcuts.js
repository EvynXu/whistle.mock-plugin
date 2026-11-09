import { useEffect, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { message } from 'antd';

/**
 * 全局键盘快捷键 Hook
 * 
 * 支持的快捷键：
 * - Esc: 关闭当前弹窗/抽屉（触发全局 close-modal 事件）
 * - Ctrl/Cmd + S: 保存（触发全局 save-form 事件）
 * - Ctrl/Cmd + 1: 跳转到功能模块
 * - Ctrl/Cmd + 2: 跳转到接口管理
 * - Ctrl/Cmd + 3: 跳转到系统设置
 * - Ctrl/Cmd + 4: 跳转到请求统计
 * - Ctrl/Cmd + 5: 跳转到接口嗅探
 * - Ctrl/Cmd + Shift + N: 新建接口（在接口管理页触发）
 * - Ctrl/Cmd + K: 聚焦搜索框（触发全局 focus-search 事件）
 * - Shift + ?: 显示快捷键帮助
 */

const SHORTCUTS = [
  { key: 'Esc', desc: '关闭弹窗/抽屉' },
  { key: 'Ctrl + S', desc: '保存表单' },
  { key: 'Ctrl + 1', desc: '功能模块' },
  { key: 'Ctrl + 2', desc: '接口管理' },
  { key: 'Ctrl + 3', desc: '系统设置' },
  { key: 'Ctrl + 4', desc: '请求统计' },
  { key: 'Ctrl + 5', desc: '接口嗅探' },
  { key: 'Ctrl + Shift + N', desc: '新建接口' },
  { key: 'Ctrl + K', desc: '聚焦搜索' },
  { key: 'Shift + ?', desc: '快捷键帮助' },
];

export const getShortcutsList = () => SHORTCUTS;

export const useKeyboardShortcuts = () => {
  const history = useHistory();

  const handleKeyDown = useCallback((e) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

    // 忽略在输入框、文本域中的快捷键（导航类除外）
    const tagName = e.target?.tagName?.toLowerCase();
    const isInput = tagName === 'input' || tagName === 'textarea' || e.target?.isContentEditable;

    // Shift + ? 显示帮助（非输入框时）
    if (e.shiftKey && e.key === '?' && !isInput) {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('keyboard-shortcuts-help'));
      return;
    }

    // Esc 关闭弹窗/抽屉
    if (e.key === 'Escape') {
      window.dispatchEvent(new CustomEvent('shortcut-esc'));
      return;
    }

    if (e.isComposing || e.altKey) return;
    if (isInput && !(ctrlOrCmd && e.key.toLowerCase() === 's' && !e.shiftKey)) return;

    // Ctrl/Cmd + 数字键 导航
    if (ctrlOrCmd && !e.shiftKey && /^[1-5]$/.test(e.key)) {
      e.preventDefault();
      const routes = ['/', '/interface', '/settings', '/stats', '/sniffer'];
      const names = ['功能模块', '接口管理', '系统设置', '请求统计', '接口嗅探'];
      const idx = parseInt(e.key, 10) - 1;
      history.push(routes[idx]);
      message.success(`已切换到${names[idx]}`);
      return;
    }

    // Ctrl/Cmd + S 保存
    if (ctrlOrCmd && e.key.toLowerCase() === 's' && !e.shiftKey) {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('shortcut-save'));
      return;
    }

    // Ctrl/Cmd + Shift + N 新建接口
    if (ctrlOrCmd && e.shiftKey && e.key.toLowerCase() === 'n') {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('shortcut-new-interface'));
      return;
    }

    // Ctrl/Cmd + K 聚焦搜索
    if (ctrlOrCmd && e.key.toLowerCase() === 'k' && !e.shiftKey) {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('shortcut-focus-search'));
      return;
    }
  }, [history]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};

export default useKeyboardShortcuts;
