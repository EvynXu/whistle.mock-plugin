import React, { useLayoutEffect } from 'react';
import { App, theme } from 'antd';
import AppLayout from '../components/AppLayout';
import Network from '../../pages/Network';
import '../styles/network.css';

function NetworkContent() {
  const { token } = theme.useToken();
  // Shared drawers render into document.body, so bridge the legacy theme tokens
  // at the root while this page is mounted, restoring them when leaving.
  useLayoutEffect(() => {
    const root = document.documentElement;
    const values = { primary: token.colorPrimary, bg: token.colorBgLayout, surface: token.colorBgContainer,
      text: token.colorText, muted: token.colorTextSecondary, border: token.colorBorder,
      subtle: token.colorPrimaryBg };
    const previous = Object.fromEntries(Object.keys(values).map(key => [key, root.style.getPropertyValue(`--mm-${key}`)]));
    Object.entries(values).forEach(([key, value]) => root.style.setProperty(`--mm-${key}`, value));
    return () => Object.entries(previous).forEach(([key, value]) => value ? root.style.setProperty(`--mm-${key}`, value) : root.style.removeProperty(`--mm-${key}`));
  }, [token]);
  return <Network />;
}
export default function LegacyNetwork() {
  return <AppLayout><App className="legacy-network-context"><NetworkContent /></App></AppLayout>;
}
