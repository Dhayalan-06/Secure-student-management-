import React from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, createHashRouter, RouterProvider } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';
import './index.css';

// The Android WebView serves the bundled index.html from its local origin.
const createRouter = Capacitor.isNativePlatform() ? createHashRouter : createBrowserRouter;
const router = createRouter([{ path: '*', element: <App /> }]);

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <RouterProvider router={router} />
    </GoogleOAuthProvider>
  </React.StrictMode>,
);
