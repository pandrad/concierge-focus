import { useState, useEffect } from 'react';

export function useCalendarData(isSignedIn) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isSignedIn) { setEvents([]); setError(null); return; }
    fetchEvents();
  }, [isSignedIn]);

  async function fetchEvents() {
    setLoading(true);
    setError(null);
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

      const res = await window.gapi.client.calendar.events.list({
        calendarId: 'primary',
        timeMin: startOfDay,
        timeMax: endOfDay,
        singleEvents: true,
        orderBy: 'startTime',
      });

      const items = res.result.items || [];
      const parsed = items.map(ev => ({
        id: ev.id,
        title: ev.summary || '(no title)',
        time: formatEventTime(ev.start, ev.end),
      }));

      setEvents(parsed);
    } catch (err) {
      console.error('Calendar fetch error:', err);
      setError('Could not load calendar');
    } finally {
      setLoading(false);
    }
  }

  return { events, loading, error, refetch: fetchEvents };
}

function formatEventTime(start, end) {
  if (!start) return '';
  const opts = { hour: 'numeric', minute: '2-digit', hour12: true };
  if (start.dateTime) {
    const s = new Date(start.dateTime).toLocaleTimeString('en-US', opts);
    const e = end?.dateTime ? new Date(end.dateTime).toLocaleTimeString('en-US', opts) : '';
    return e ? `${s} – ${e}` : s;
  }
  return 'All day';
}
