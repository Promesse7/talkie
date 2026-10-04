import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase.js';

/**
 * Upload a file to Firebase Storage at an explicit path and resolve its download URL.
 * Paths used by the app: `avatars/{uid}/{file}` and `chat-media/{chatId}/{file}`.
 */
export default function upload(file, path) {
  if (!file) return Promise.reject(new Error('No file selected'));
  if (!path) return Promise.reject(new Error('Upload path is required'));

  const task = uploadBytesResumable(ref(storage, path), file);

  return new Promise((resolve, reject) => {
    task.on(
      'state_changed',
      null,
      (error) => reject(new Error(`Upload failed: ${error.code}`)),
      () => getDownloadURL(task.snapshot.ref).then(resolve, reject)
    );
  });
}
