import React from 'react';
import { createRoot } from 'react-dom/client';

// Each UI loads its own styles. Reload on switching prevents legacy CSS leakage.
const loadUI = localStorage.getItem('mm-ui-version') === 'legacy'
  ? import('./legacy/index')
  : import('./ModernApp');
loadUI.then(({ default: App }) => createRoot(document.getElementById('root')).render(<App />));
