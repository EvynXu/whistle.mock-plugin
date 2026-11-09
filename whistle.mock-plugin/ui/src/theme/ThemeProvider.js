import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ConfigProvider, App, theme } from 'antd';
const ThemeContext = createContext(null);
export const THEMES = ['light', 'dark', 'cyber', 'earth'];
export const readTheme = () => {
  const saved = localStorage.getItem('theme');
  if (THEMES.includes(saved)) return saved;
  return localStorage.getItem('cyberTheme') === 'true' ? 'cyber' : 'light';
};
const palettes = {
  light: {
    primary: '#4263eb',
    bg: '#f6f7fb',
    surface: '#ffffff',
    text: '#202637',
    muted: '#667085',
    border: '#e4e7ee',
    subtle: '#eef2ff'
  },
  dark: {
    primary: '#91a7ff',
    bg: '#13161d',
    surface: '#1c2029',
    text: '#edf0f7',
    muted: '#a7b0c0',
    border: '#333a49',
    subtle: '#28324c'
  },
  cyber: {
    primary: '#00d9e6',
    bg: '#0a0d16',
    surface: '#111624',
    text: '#e4edf7',
    muted: '#9caec4',
    border: '#27354b',
    subtle: '#12343e'
  },
  earth: {
    primary: '#a36635',
    bg: '#f3efe8',
    surface: '#fffcf7',
    text: '#3d3630',
    muted: '#756a5e',
    border: '#ded5ca',
    subtle: '#f3e7d7'
  }
};
export const useTheme = () => useContext(ThemeContext);
export default function ThemeProvider({
  children
}) {
  const [currentTheme, setCurrentTheme] = useState(readTheme);
  const setTheme = value => {
    if (!THEMES.includes(value)) return;
    localStorage.setItem('theme', value);
    localStorage.setItem('cyberTheme', String(value === 'cyber'));
    setCurrentTheme(value);
    window.dispatchEvent(new Event('storage'));
  };
  useEffect(() => {
    const sync = () => setCurrentTheme(readTheme());
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  const p = palettes[currentTheme];
  useEffect(() => {
    document.body.dataset.theme = currentTheme;
    document.body.classList.remove('cyber-theme', 'earth-theme');
    const vars = {
      primary: p.primary,
      bg: p.bg,
      surface: p.surface,
      text: p.text,
      muted: p.muted,
      border: p.border,
      subtle: p.subtle
    };
    Object.entries(vars).forEach(([key, value]) => document.documentElement.style.setProperty(`--mm-${key}`, value));
    document.documentElement.style.colorScheme = ['dark', 'cyber'].includes(currentTheme) ? 'dark' : 'light';
  }, [currentTheme, p]);
  const config = useMemo(() => ({
    algorithm: ['dark', 'cyber'].includes(currentTheme) ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      colorPrimary: p.primary,
      colorBgLayout: p.bg,
      colorBgContainer: p.surface,
      colorBgElevated: p.surface,
      colorText: p.text,
      colorTextSecondary: p.muted,
      colorBorder: p.border,
      colorBorderSecondary: p.border,
      borderRadius: 8,
      fontSize: 13,
      controlHeight: 34,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans SC", sans-serif',
      fontFamilyCode: '"SFMono-Regular", Consolas, monospace'
    },
    components: {
      Table: {
        headerBg: p.bg,
        rowSelectedBg: p.subtle
      },
      Card: {
        headerFontSize: 14
      },
      Menu: {
        itemSelectedBg: p.subtle
      }
    }
  }), [currentTheme, p]);
  useEffect(() => {
    ConfigProvider.config({
      holderRender: nodes => <ConfigProvider theme={config}>{nodes}</ConfigProvider>
    });
  }, [config]);
  return <ThemeContext.Provider value={{
    currentTheme,
    setTheme
  }}><ConfigProvider theme={config}><App>{children}</App></ConfigProvider></ThemeContext.Provider>;
}
