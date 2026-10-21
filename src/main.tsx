import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import './continuity.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('StoryScreen could not find its application root.');

createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
