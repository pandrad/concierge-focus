import { useState, useEffect } from 'react';

export function useGmailData(isSignedIn, filter = 'week') {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    if (!isSignedIn) { setEmails([]); setError(null); setUserEmail(''); return; }
    fetchEmails(filter);
  }, [isSignedIn, filter]);

  async function fetchEmails(currentFilter) {
    setLoading(true);
    setError(null);
    try {
      const profile = await window.gapi.client.gmail.users.getProfile({ userId: 'me' });
      setUserEmail(profile.result.emailAddress || '');

      let q = 'is:unread in:inbox';
      if (currentFilter === 'week') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        const after = `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
        q += ` after:${after}`;
      }

      const listRes = await window.gapi.client.gmail.users.messages.list({
        userId: 'me',
        q,
        maxResults: 20,
      });

      const messages = listRes.result.messages || [];
      const detailed = await Promise.all(
        messages.map(m =>
          window.gapi.client.gmail.users.messages.get({
            userId: 'me',
            id: m.id,
            format: 'metadata',
            metadataHeaders: ['From', 'Subject', 'Date', 'To', 'Delivered-To', 'Message-ID', 'Reply-To'],
          })
        )
      );

      const parsed = detailed.map(r => {
        const h = {};
        (r.result.payload?.headers || []).forEach(hdr => { h[hdr.name] = hdr.value; });
        const fromRaw = h['From'] || '';
        const fromName = fromRaw.replace(/<[^>]+>/, '').trim().replace(/^"(.+)"$/, '$1') || fromRaw;
        const fromEmail = (fromRaw.match(/<([^>]+)>/) || [])[1] || fromRaw;
        return {
          id: r.result.id,
          threadId: r.result.threadId,
          messageId: h['Message-ID'] || '',
          from: fromName,
          email: fromEmail,
          replyTo: h['Reply-To'] || fromEmail,
          subject: h['Subject'] || '(no subject)',
          preview: r.result.snippet || '',
          urgent: false,
          date: formatDate(h['Date']),
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

  return { emails, userEmail, loading, error, refetch: () => fetchEmails(filter) };
}

function formatDate(raw) {
  if (!raw) return '';
  const d = new Date(raw);
  if (isNaN(d)) return raw;
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
