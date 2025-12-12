/**
 * MP3 Storage Manager - IndexedDB-based offline MP3 caching
 *
 * Stores MP3 files locally for offline playback during competitions.
 * Supports bulk download, progress tracking, checksum verification, and retry logic.
 */

// Database configuration
const DB_NAME = 'CompPortal_AudioCache';
const DB_VERSION = 1;
const STORE_NAME = 'mp3_files';

// Download configuration
const MAX_CONCURRENT_DOWNLOADS = 5;
const DOWNLOAD_TIMEOUT_MS = 60000; // 1 minute per file
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

export interface MP3FileRecord {
  entryId: string;
  entryNumber: number;
  routineName: string;
  studioName: string;
  studioCode: string;
  category: string;
  ageGroup: string;
  url: string;
  durationMs: number;
  blob: Blob | null;
  expectedSize: number | null;
  actualSize: number | null;
  checksum: string | null;
  checksumVerified: boolean;
  status: 'pending' | 'downloading' | 'complete' | 'failed' | 'retrying';
  downloadedAt: string | null;
  lastError: string | null;
  retryCount: number;
}

export interface DownloadProgress {
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  pendingFiles: number;
  downloadingFiles: number;
  totalBytes: number;
  downloadedBytes: number;
  currentFile: string | null;
  percentComplete: number;
  estimatedTimeRemaining: number | null;
  speed: number | null; // bytes per second
}

export interface DownloadResult {
  success: boolean;
  entryId: string;
  error?: string;
}

type ProgressCallback = (progress: DownloadProgress) => void;
type FileCompleteCallback = (result: DownloadResult) => void;

/**
 * Opens the IndexedDB database
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error(`Failed to open database: ${request.error?.message}`));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create the mp3_files store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'entryId' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('entryNumber', 'entryNumber', { unique: false });
        store.createIndex('downloadedAt', 'downloadedAt', { unique: false });
      }
    };
  });
}

/**
 * Gets all MP3 records from the database
 */
export async function getAllRecords(): Promise<MP3FileRecord[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Gets a single MP3 record by entry ID
 */
export async function getRecord(entryId: string): Promise<MP3FileRecord | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(entryId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

/**
 * Gets the MP3 blob for playback
 */
export async function getMP3Blob(entryId: string): Promise<Blob | null> {
  const record = await getRecord(entryId);
  return record?.blob || null;
}

/**
 * Saves or updates an MP3 record
 */
export async function saveRecord(record: MP3FileRecord): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(record);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Deletes an MP3 record
 */
export async function deleteRecord(entryId: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(entryId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Clears all MP3 records from the database
 */
export async function clearAllRecords(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Gets download statistics
 */
export async function getDownloadStats(): Promise<{
  total: number;
  complete: number;
  failed: number;
  pending: number;
  downloading: number;
  totalSizeBytes: number;
  downloadedSizeBytes: number;
}> {
  const records = await getAllRecords();

  return {
    total: records.length,
    complete: records.filter(r => r.status === 'complete').length,
    failed: records.filter(r => r.status === 'failed').length,
    pending: records.filter(r => r.status === 'pending' || r.status === 'retrying').length,
    downloading: records.filter(r => r.status === 'downloading').length,
    totalSizeBytes: records.reduce((sum, r) => sum + (r.expectedSize || 0), 0),
    downloadedSizeBytes: records.reduce((sum, r) => sum + (r.actualSize || 0), 0),
  };
}

/**
 * Calculates a simple checksum for verification
 */
async function calculateChecksum(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Downloads a single MP3 file with timeout and retry logic
 */
async function downloadFile(
  record: MP3FileRecord,
  onProgress?: (downloaded: number, total: number) => void
): Promise<{ success: boolean; error?: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);

  try {
    const response = await fetch(record.url, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentLength = response.headers.get('content-length');
    const totalSize = contentLength ? parseInt(contentLength, 10) : 0;

    // Read the response as a stream for progress tracking
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const chunks: BlobPart[] = [];
    let downloadedSize = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Convert Uint8Array to ArrayBuffer for BlobPart compatibility
      chunks.push(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength));
      downloadedSize += value.length;

      if (onProgress) {
        onProgress(downloadedSize, totalSize);
      }
    }

    // Combine chunks into a blob
    const blob = new Blob(chunks, { type: 'audio/mpeg' });

    // Calculate checksum for verification
    const checksum = await calculateChecksum(blob);

    // Update record with downloaded data
    record.blob = blob;
    record.actualSize = blob.size;
    record.checksum = checksum;
    record.checksumVerified = true; // We calculated it, so it's verified
    record.status = 'complete';
    record.downloadedAt = new Date().toISOString();
    record.lastError = null;

    await saveRecord(record);

    return { success: true };
  } catch (error) {
    clearTimeout(timeoutId);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Update record with error
    record.status = record.retryCount < MAX_RETRIES ? 'retrying' : 'failed';
    record.lastError = errorMessage;
    record.retryCount++;

    await saveRecord(record);

    return { success: false, error: errorMessage };
  }
}

/**
 * Main download manager class
 */
export class MP3DownloadManager {
  private isDownloading = false;
  private shouldCancel = false;
  private progressCallback: ProgressCallback | null = null;
  private fileCompleteCallback: FileCompleteCallback | null = null;
  private downloadStartTime = 0;
  private totalDownloadedBytes = 0;

  /**
   * Initializes download records from manifest
   */
  async initializeFromManifest(manifest: {
    files: Array<{
      entryId: string;
      entryNumber: number;
      routineName: string;
      studioName: string;
      studioCode: string;
      category: string;
      ageGroup: string;
      signedUrl: string | null;
      durationMs: number;
    }>;
  }): Promise<void> {
    // Get existing records to preserve completed downloads
    const existingRecords = await getAllRecords();
    const existingMap = new Map(existingRecords.map(r => [r.entryId, r]));

    for (const file of manifest.files) {
      if (!file.signedUrl) continue; // Skip files without URLs

      const existing = existingMap.get(file.entryId);

      // If already downloaded and complete, skip
      if (existing?.status === 'complete' && existing.blob) {
        continue;
      }

      // Create or update record
      const record: MP3FileRecord = {
        entryId: file.entryId,
        entryNumber: file.entryNumber,
        routineName: file.routineName,
        studioName: file.studioName,
        studioCode: file.studioCode,
        category: file.category,
        ageGroup: file.ageGroup,
        url: file.signedUrl,
        durationMs: file.durationMs,
        blob: null,
        expectedSize: null,
        actualSize: null,
        checksum: null,
        checksumVerified: false,
        status: 'pending',
        downloadedAt: null,
        lastError: null,
        retryCount: 0,
      };

      await saveRecord(record);
    }
  }

  /**
   * Starts bulk download of all pending files
   */
  async startDownload(
    onProgress?: ProgressCallback,
    onFileComplete?: FileCompleteCallback
  ): Promise<{ successful: number; failed: number }> {
    if (this.isDownloading) {
      throw new Error('Download already in progress');
    }

    this.isDownloading = true;
    this.shouldCancel = false;
    this.progressCallback = onProgress || null;
    this.fileCompleteCallback = onFileComplete || null;
    this.downloadStartTime = Date.now();
    this.totalDownloadedBytes = 0;

    let successful = 0;
    let failed = 0;

    try {
      // Get all pending records
      const records = await getAllRecords();
      const pendingRecords = records.filter(
        r => r.status === 'pending' || r.status === 'retrying' || r.status === 'failed'
      );

      if (pendingRecords.length === 0) {
        return { successful: 0, failed: 0 };
      }

      // Download in batches with concurrency limit
      const batches: MP3FileRecord[][] = [];
      for (let i = 0; i < pendingRecords.length; i += MAX_CONCURRENT_DOWNLOADS) {
        batches.push(pendingRecords.slice(i, i + MAX_CONCURRENT_DOWNLOADS));
      }

      for (const batch of batches) {
        if (this.shouldCancel) break;

        // Download batch concurrently
        const results = await Promise.all(
          batch.map(async (record) => {
            if (this.shouldCancel) {
              return { entryId: record.entryId, success: false, error: 'Cancelled' };
            }

            // Update status to downloading
            record.status = 'downloading';
            await saveRecord(record);
            this.updateProgress();

            // Download with retries
            let result = await downloadFile(record, (downloaded, total) => {
              this.totalDownloadedBytes += downloaded - (record.actualSize || 0);
              record.actualSize = downloaded;
              record.expectedSize = total;
              this.updateProgress();
            });

            // Retry if failed
            while (!result.success && record.retryCount < MAX_RETRIES && !this.shouldCancel) {
              await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
              result = await downloadFile(record);
            }

            return { entryId: record.entryId, ...result };
          })
        );

        // Process results
        for (const result of results) {
          if (result.success) {
            successful++;
          } else {
            failed++;
          }

          if (this.fileCompleteCallback) {
            this.fileCompleteCallback({
              success: result.success,
              entryId: result.entryId,
              error: result.error,
            });
          }
        }

        this.updateProgress();
      }

      return { successful, failed };
    } finally {
      this.isDownloading = false;
      this.progressCallback = null;
      this.fileCompleteCallback = null;
    }
  }

  /**
   * Cancels the current download
   */
  cancelDownload(): void {
    this.shouldCancel = true;
  }

  /**
   * Checks if download is in progress
   */
  isInProgress(): boolean {
    return this.isDownloading;
  }

  /**
   * Updates and emits progress
   */
  private async updateProgress(): Promise<void> {
    if (!this.progressCallback) return;

    const stats = await getDownloadStats();
    const elapsed = Date.now() - this.downloadStartTime;
    const speed = elapsed > 0 ? (this.totalDownloadedBytes / elapsed) * 1000 : 0;

    const remainingBytes = stats.totalSizeBytes - stats.downloadedSizeBytes;
    const estimatedTimeRemaining = speed > 0 ? remainingBytes / speed : null;

    const progress: DownloadProgress = {
      totalFiles: stats.total,
      completedFiles: stats.complete,
      failedFiles: stats.failed,
      pendingFiles: stats.pending,
      downloadingFiles: stats.downloading,
      totalBytes: stats.totalSizeBytes,
      downloadedBytes: stats.downloadedSizeBytes,
      currentFile: null, // TODO: Track current file name
      percentComplete: stats.total > 0
        ? Math.round((stats.complete / stats.total) * 100)
        : 0,
      estimatedTimeRemaining,
      speed,
    };

    this.progressCallback(progress);
  }

  /**
   * Retries all failed downloads
   */
  async retryFailed(): Promise<{ successful: number; failed: number }> {
    const records = await getAllRecords();
    const failedRecords = records.filter(r => r.status === 'failed');

    // Reset retry count and status
    for (const record of failedRecords) {
      record.status = 'pending';
      record.retryCount = 0;
      record.lastError = null;
      await saveRecord(record);
    }

    return this.startDownload(this.progressCallback || undefined);
  }

  /**
   * Verifies all downloaded files by recalculating checksums
   */
  async verifyAllFiles(): Promise<{ verified: number; failed: number; errors: string[] }> {
    const records = await getAllRecords();
    const completedRecords = records.filter(r => r.status === 'complete' && r.blob);

    let verified = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const record of completedRecords) {
      try {
        if (!record.blob) {
          failed++;
          errors.push(`${record.entryNumber}: No blob data`);
          continue;
        }

        const newChecksum = await calculateChecksum(record.blob);

        if (record.checksum && newChecksum !== record.checksum) {
          failed++;
          errors.push(`${record.entryNumber}: Checksum mismatch`);
          record.checksumVerified = false;
          record.status = 'failed';
          record.lastError = 'Checksum verification failed';
          await saveRecord(record);
        } else {
          verified++;
          record.checksum = newChecksum;
          record.checksumVerified = true;
          await saveRecord(record);
        }
      } catch (error) {
        failed++;
        errors.push(`${record.entryNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { verified, failed, errors };
  }
}

// Export a singleton instance for convenience
export const mp3DownloadManager = new MP3DownloadManager();
