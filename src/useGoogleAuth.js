import { useState, useEffect, useCallback } from 'react';
import { GOOGLE_CLIENT_ID, SCOPES, DISCOVERY_DOCS } from './config.js';

export function useGoogleAuth() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [tokenClient, setTokenClient] = useState(null);

  useEffect(() => {
    window.gapi.load('client', async () => {
      await window.gapi.client.init({ discoveryDocs: DISCOVERY_DOCS });

      const stored = localStorage.getItem('gapi_token');
      if (stored) {
        const token = JSON.parse(stored);
        if (token.expiry > Date.now()) {
          window.gapi.client.setToken(token);
          setIsSignedIn(true);
          setIsLoading(false);
        } else {
          localStorage.removeItem('gapi_token');
          // Token expired — try silent refresh once google.accounts is ready
          const tryRefresh = () => {
            if (!window.google || !GOOGLE_CLIENT_ID) { setIsLoading(false); return; }
            const client = window.google.accounts.oauth2.initTokenClient({
              client_id: GOOGLE_CLIENT_ID,
              scope: SCOPES,
              prompt: '',
              callback: (response) => {
                if (response.error) { setIsLoading(false); return; }
                const expiry = Date.now() + response.expires_in * 1000;
                const refreshed = { ...response, expiry };
                localStorage.setItem('gapi_token', JSON.stringify(refreshed));
                window.gapi.client.setToken(refreshed);
                setIsSignedIn(true);
                setIsLoading(false);
              },
            });
            client.requestAccessToken({ prompt: 'none' });
          };
          // Give google.accounts a moment to initialise if not yet ready
          if (window.google) { tryRefresh(); } else { setTimeout(tryRefresh, 500); }
        }
      } else {
        setIsLoading(false);
      }
    });

    if (window.google && GOOGLE_CLIENT_ID) {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: SCOPES,
        callback: (response) => {
          if (response.error) return;
          const expiry = Date.now() + response.expires_in * 1000;
          const token = { ...response, expiry };
          localStorage.setItem('gapi_token', JSON.stringify(token));
          window.gapi.client.setToken(token);
          setIsSignedIn(true);
        },
      });
      setTokenClient(client);
    }
  }, []);

  // Silently refresh the access token before it expires (~1 hour lifetime)
  useEffect(() => {
    if (!isSignedIn || !tokenClient) return;
    const stored = localStorage.getItem('gapi_token');
    if (!stored) return;
    const token = JSON.parse(stored);
    const remaining = token.expiry - Date.now();
    if (remaining <= 0) {
      tokenClient.requestAccessToken({ prompt: 'none' });
      return;
    }
    // Refresh 5 minutes before expiry
    const refreshIn = Math.max(remaining - 5 * 60 * 1000, 0);
    const timer = setTimeout(() => {
      tokenClient.requestAccessToken({ prompt: 'none' });
    }, refreshIn);
    return () => clearTimeout(timer);
  }, [isSignedIn, tokenClient]);

  const signIn = useCallback(() => {
    if (tokenClient) {
      tokenClient.requestAccessToken({ prompt: '' });
    }
  }, [tokenClient]);

  const signOut = useCallback(() => {
    const token = window.gapi.client.getToken();
    if (token) {
      window.google.accounts.oauth2.revoke(token.access_token);
      window.gapi.client.setToken('');
    }
    localStorage.removeItem('gapi_token');
    setIsSignedIn(false);
  }, []);

  return { isSignedIn, isLoading, signIn, signOut };
}
