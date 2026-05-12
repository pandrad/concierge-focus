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
        } else {
          localStorage.removeItem('gapi_token');
        }
      }
      setIsLoading(false);
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

  // Auto sign-out when access token expires (~1 hour)
  useEffect(() => {
    if (!isSignedIn) return;
    const stored = localStorage.getItem('gapi_token');
    if (!stored) return;
    const token = JSON.parse(stored);
    const remaining = token.expiry - Date.now();
    if (remaining <= 0) {
      localStorage.removeItem('gapi_token');
      window.gapi.client.setToken('');
      setIsSignedIn(false);
      return;
    }
    const timer = setTimeout(() => {
      localStorage.removeItem('gapi_token');
      window.gapi.client.setToken('');
      setIsSignedIn(false);
    }, remaining);
    return () => clearTimeout(timer);
  }, [isSignedIn]);

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
