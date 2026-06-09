import { useCallback } from 'react';

const FILE_NAME = 'concierge-focus-data.json';
const BACKUP_NAME = 'concierge-focus-data.backup.json';
const BACKUP_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function useGoogleDrive() {
  const saveData = useCallback(async (schedule, oneOffs, checked, ignored, permanentlyIgnored) => {
    try {
      const hasData = Object.values(schedule).some(d => d.length > 0) || oneOffs.length > 0;

      // Rotate backup before overwriting — only if current Drive data is non-empty
      if (hasData) {
        const existing = await findFile(FILE_NAME);
        if (existing) {
          const currentContent = await readFile(existing.id);
          const backupFile = await findFile(BACKUP_NAME);
          if (backupFile) {
            await updateFile(backupFile.id, currentContent);
          } else {
            await createFile(BACKUP_NAME, currentContent);
          }
        }
      }

      const data = { schedule, oneOffs, checked, ignored, permanentlyIgnored, lastSaved: new Date().toISOString() };
      const content = JSON.stringify(data);
      const existingFile = await findFile(FILE_NAME);
      if (existingFile) {
        await updateFile(existingFile.id, content);
      } else {
        await createFile(FILE_NAME, content);
      }
      return { success: true };
    } catch (error) {
      console.error('Drive save error:', error);
      return { success: false, error: error.message };
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      const file = await findFile(FILE_NAME);
      if (!file) return { success: false, error: 'No data file found' };

      const content = await readFile(file.id);
      const data = JSON.parse(content);

      // If primary file is empty, try falling back to backup
      const isEmpty = !data.schedule || Object.values(data.schedule).every(d => !d.length) && (!data.oneOffs || !data.oneOffs.length);
      if (isEmpty) {
        const backupFile = await findFile(BACKUP_NAME);
        if (backupFile) {
          const backupContent = await readFile(backupFile.id);
          const backupData = JSON.parse(backupContent);
          const backupAge = backupData.lastSaved ? Date.now() - new Date(backupData.lastSaved).getTime() : Infinity;
          if (backupAge < BACKUP_TTL_MS) {
            console.info('Primary data empty — restoring from backup dated', backupData.lastSaved);
            return { success: true, data: backupData };
          }
        }
      }

      return { success: true, data };
    } catch (error) {
      console.error('Drive load error:', error);
      return { success: false, error: error.message };
    }
  }, []);

  return { saveData, loadData };
}

async function findFile(name) {
  try {
    const response = await window.gapi.client.drive.files.list({
      spaces: 'appDataFolder',
      fields: 'files(id, name)',
      pageSize: 10,
    });
    return response.result.files?.find(f => f.name === name) || null;
  } catch (error) {
    console.error('Find file error:', error);
    return null;
  }
}

async function createFile(name, content) {
  const file = new File([content], name, { type: 'application/json' });
  const metadata = { name, parents: ['appDataFolder'] };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&spaces=appDataFolder', {
    method: 'POST',
    headers: { Authorization: `Bearer ${window.gapi.client.getToken().access_token}` },
    body: form,
  });

  if (!response.ok) throw new Error(`Upload failed: ${response.statusText}`);
  return response.json();
}

async function updateFile(fileId, content) {
  const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${window.gapi.client.getToken().access_token}`,
      'Content-Type': 'application/json',
    },
    body: content,
  });

  if (!response.ok) throw new Error(`Update failed: ${response.statusText}`);
  return response.json();
}

async function readFile(fileId) {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${window.gapi.client.getToken().access_token}` },
  });

  if (!response.ok) throw new Error(`Read failed: ${response.statusText}`);
  return response.text();
}
