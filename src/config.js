// Replace these with your own Google Cloud project credentials
// See README.md for setup instructions
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export const GMAIL_SCOPES = 'https://www.googleapis.com/auth/gmail.readonly';
export const CALENDAR_SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';
export const DRIVE_SCOPES = 'https://www.googleapis.com/auth/drive.appdata';
export const SCOPES = `${GMAIL_SCOPES} ${CALENDAR_SCOPES} ${DRIVE_SCOPES}`;

export const DISCOVERY_DOCS = [
  'https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest',
  'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
  'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
];
