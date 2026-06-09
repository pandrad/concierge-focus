import { useState, useEffect, useCallback, useRef } from 'react';
import { GOOGLE_CLIENT_ID, SCOPES, DISCOVERY_DOCS } from './config.js';

export function useGoogleAuth() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const tokenClientRef = useRef(null);
  // Expose tokenClient as state so the refresh timer effect can depend on it
  const [tokenClient, setTokenClient] = useState(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) { setIsLoading(false); return; }

    window.gapi.load('client', async () => {
      await window.gapi.client.init({ discoveryDocs: DISCOVERY_DOCS });

      // Init the token client once gapi is ready — single source of truth
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: SCOPES,
        // callback is set per-request below, not here
      });
      tokenClientRef.current = client;
      setTokenClient(client);

      const stored = localStorage.getItem('gapi_token');

      if (stored) {
        const token = JSON.parse(stored);

        if (token.expiry > Date.now()) {
          // Token still valid — restore immediately
          window.gapi.client.setToken(token);
          setIsSignedIn(true);
          setIsLoading(false);
        } else {
          // Token expired — attempt silent refresh first, then auto-reauth
          localStorage.removeItem('gapi_token');
          const handleRefreshResponse = (response) => {
            if (response.error) {
              // Silent refresh rejected — fall through to login screen
              setIsLoading(false);
              return;
            }
            const expiry = Date.now() + response.expires_in * 1000;
            const refreshed = { ...response, expiry };
            localStorage.setItem('gapi_token', JSON.stringify(refreshed));
            window.gapi.client.setToken(refreshed);
            setIsSignedIn(true);
            setIsLoading(false);
          };
          client.callback = handleRefreshResponse;
          client.requestAccessToken({ prompt: 'none' });
        }
      } else {
        setIsLoading(false);
      }
    });
  }, []);

  // Silently refresh the access token 5 minutes before expiry
  useEffect(() => {
    if (!isSignedIn || !tokenClient) return;
    const stored = localStorage.getItem('gapi_token');
    if (!stored) return;
    const token = JSON.parse(stored);
    const remaining = token.expiry - Date.now();

    const doRefresh = () => {
      tokenClient.callback = (response) => {
        if (response.error) return;
        const expiry = Date.now() + response.expires_in * 1000;
        const refreshed = { ...response, expiry };
        localStorage.setItem('gapi_token', JSON.stringify(refreshed));
        window.gapi.client.setToken(refreshed);
      };
      tokenClient.requestAccessToken({ prompt: 'none' });
    };

    if (remaining <= 0) { doRefresh(); return; }

    const refreshIn = Math.max(remaining - 5 * 60 * 1000, 0);
    const timer = setTimeout(doRefresh, refreshIn);
    return () => clearTimeout(timer);
  }, [isSignedIn, tokenClient]);

  const signIn = useCallback(() => {
    const client = tokenClientRef.current;
    if (!client) return;
    client.callback = (response) => {
      if (response.error) return;
      const expiry = Date.now() + response.expires_in * 1000;
      const token = { ...response, expiry };
      localStorage.setItem('gapi_token', JSON.stringify(token));
      window.gapi.client.setToken(token);
      setIsSignedIn(true);
    };
    client.requestAccessToken({ prompt: '' });
  }, []);

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
