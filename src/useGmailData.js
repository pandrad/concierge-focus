import { useState, useEffect } from 'react';

export function useGmailData(isSignedIn) {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isSignedIn) { setEmails([]); setError(null); return; }
    fetchEmails();
  }, [isSignedIn]);

  async function fetchEmails() {
    setLoading(true);
    setError(null);
    try {
      const listRes = await window.gapi.client.gmail.users.messages.list({
        userId: 'me',
        q: 'is:unread in:inbox',
        maxResults: 10,
      });

      const messages = listRes.result.messages || [];
      const detailed = await Promise.all(
        messages.map(m =>
          window.gapi.client.gmail.users.messages.get({
            userId: 'me',
            id: m.id,
            format: 'metadata',
            metadataHeaders: ['From', 'Subject', 'Date', 'To', 'Delivered-To'],
          })
        )
      );

      const parsed = detailed.map(r => {
        const h = {};
        (r.result.payload?.headers || []).forEach(hdr => { h[hdr.name] = hdr.value; });
        const fromRaw = h['From'] || '';
        const fromName = fromRaw.replace(/<[^>]+>/, '').trim().replace(/^"(.+)"$/, '$1') || fromRaw;
        const fromEmail = (fromRaw.match(/<([^>]+)>/) || [])[1] || fromRaw;
        const snippet = r.result.snippet || '';
        const inbox = h['Delivered-To'] || h['To'] || '';
        return {
          id: r.result.id,
          from: fromName,
          email: fromEmail,
          subject: h['Subject'] || '(no subject)',
          preview: snippet,
          urgent: false,
          date: formatDate(h['Date']),
          inbox,
        };
      });

      setEmails(parsed);
    } catch (err) {
      console.error('Gmail fetch error:', err);
      setError('Could not load emails');
    } finally {
      setLoading(false);
    }
  }

  return { emails, loading, error, refetch: fetchEmails };
}

function formatDate(raw) {
  if (!raw) return '';
  const d = new Date(raw);
  if (isNaN(d)) return raw;
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
