import { useCallback } from 'react';

const FILE_NAME = 'concierge-focus-data.json';

export function useGoogleDrive() {
  const saveData = useCallback(async (schedule, oneOffs, checked, ignored, permanentlyIgnored) => {
    try {
      const data = { schedule, oneOffs, checked, ignored, permanentlyIgnored, lastSaved: new Date().toISOString() };
      const content = JSON.stringify(data);

      const existingFile = await findFile();
      if (existingFile) {
        await updateFile(existingFile.id, content);
      } else {
        await createFile(content);
      }
      return { success: true };
    } catch (error) {
      console.error('Drive save error:', error);
      return { success: false, error: error.message };
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      const file = await findFile();
      if (!file) return { success: false, error: 'No data file found' };

      const content = await readFile(file.id);
      const data = JSON.parse(content);
      return { success: true, data };
    } catch (error) {
      console.error('Drive load error:', error);
      return { success: false, error: error.message };
    }
  }, []);

  return { saveData, loadData };
}

async function findFile() {
  try {
    const response = await window.gapi.client.drive.files.list({
      spaces: 'appDataFolder',
      fields: 'files(id, name)',
      pageSize: 10,
    });
    return response.result.files?.find(f => f.name === FILE_NAME) || null;
  } catch (error) {
    console.error('Find file error:', error);
    return null;
  }
}

async function createFile(content) {
  const file = new File([content], FILE_NAME, { type: 'application/json' });
  const metadata = { name: FILE_NAME, parents: ['appDataFolder'] };
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
