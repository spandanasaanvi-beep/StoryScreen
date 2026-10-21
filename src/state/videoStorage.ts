import type { GeneratedStoryDraft, SavedVideoRecord } from '../videoStudio/types';

const DATABASE_NAME = 'storyscreen-video-studio';
const DATABASE_VERSION = 1;
const DRAFTS_STORE = 'drafts';
const VIDEOS_STORE = 'videos';

interface DraftRecord {
  id: string;
  story: GeneratedStoryDraft;
  savedAt: string;
}

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('This browser does not support local video storage. You can still download a rendered MP4.'));
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(DRAFTS_STORE)) database.createObjectStore(DRAFTS_STORE, { keyPath: 'id' });
      if (!database.objectStoreNames.contains(VIDEOS_STORE)) database.createObjectStore(VIDEOS_STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('The local story store could not be opened.'));
    request.onblocked = () => reject(new Error('The local story store is busy in another tab. Close the other StoryScreen tab and retry.'));
  });
}

function transactionResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('The local story request failed.'));
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('The local story transaction failed.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('The local story transaction was cancelled.'));
  });
}

function storageError(action: string, error: unknown): Error {
  if (error instanceof DOMException && error.name === 'QuotaExceededError') {
    return new Error(`This device is low on browser storage, so StoryScreen could not ${action}. Download the MP4 and remove videos you no longer need.`);
  }
  return error instanceof Error ? error : new Error(`StoryScreen could not ${action} in this browser.`);
}

export async function saveDraft(story: GeneratedStoryDraft): Promise<void> {
  let database: IDBDatabase | undefined;
  try {
    database = await openDatabase();
    const transaction = database.transaction(DRAFTS_STORE, 'readwrite');
    transaction.objectStore(DRAFTS_STORE).put({ id: story.id, story, savedAt: new Date().toISOString() } satisfies DraftRecord);
    await transactionComplete(transaction);
  } catch (error) {
    throw storageError('save this script', error);
  } finally {
    database?.close();
  }
}

export async function getDraft(id: string): Promise<GeneratedStoryDraft | undefined> {
  let database: IDBDatabase | undefined;
  try {
    database = await openDatabase();
    const transaction = database.transaction(DRAFTS_STORE, 'readonly');
    const record = await transactionResult(transaction.objectStore(DRAFTS_STORE).get(id) as IDBRequest<DraftRecord | undefined>);
    await transactionComplete(transaction);
    return record?.story;
  } catch (error) {
    throw storageError('load this script', error);
  } finally {
    database?.close();
  }
}

export async function saveVideo(record: SavedVideoRecord): Promise<void> {
  let database: IDBDatabase | undefined;
  try {
    database = await openDatabase();
    const transaction = database.transaction(VIDEOS_STORE, 'readwrite');
    transaction.objectStore(VIDEOS_STORE).put(record);
    await transactionComplete(transaction);
  } catch (error) {
    throw storageError('save this MP4', error);
  } finally {
    database?.close();
  }
}

export async function getVideo(id: string): Promise<SavedVideoRecord | undefined> {
  let database: IDBDatabase | undefined;
  try {
    database = await openDatabase();
    const transaction = database.transaction(VIDEOS_STORE, 'readonly');
    const record = await transactionResult(transaction.objectStore(VIDEOS_STORE).get(id) as IDBRequest<SavedVideoRecord | undefined>);
    await transactionComplete(transaction);
    return record;
  } catch (error) {
    throw storageError('load this MP4', error);
  } finally {
    database?.close();
  }
}

export async function listVideos(): Promise<SavedVideoRecord[]> {
  let database: IDBDatabase | undefined;
  try {
    database = await openDatabase();
    const transaction = database.transaction(VIDEOS_STORE, 'readonly');
    const records = await transactionResult(transaction.objectStore(VIDEOS_STORE).getAll() as IDBRequest<SavedVideoRecord[]>);
    await transactionComplete(transaction);
    return records.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  } catch (error) {
    throw storageError('read your video library', error);
  } finally {
    database?.close();
  }
}

export async function deleteVideo(id: string): Promise<void> {
  let database: IDBDatabase | undefined;
  try {
    database = await openDatabase();
    const transaction = database.transaction(VIDEOS_STORE, 'readwrite');
    transaction.objectStore(VIDEOS_STORE).delete(id);
    await transactionComplete(transaction);
  } catch (error) {
    throw storageError('remove this saved MP4', error);
  } finally {
    database?.close();
  }
}
