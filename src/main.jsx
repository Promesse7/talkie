import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { auth } from './lib/firebase.js';
import { setAuthTokenProvider } from './lib/translate.js';

// The translation API only serves signed-in users; send their Firebase ID token.
setAuthTokenProvider(() => auth.currentUser?.getIdToken() ?? null);

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
