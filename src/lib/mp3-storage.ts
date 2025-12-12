/**
 * MP3 Storage Manager
 *
 * IndexedDB-based storage for offline MP3 playback during Game Day.
 *
 * Features:
 * - Store MP3 files in IndexedDB for offline access
 * - Download from Supabase storage bucket
 * - Progress tracking for bulk downloads
 * - Storage quota management
 * - Last-minute loader for day-of submissions
 */

// IndexedDB database configuration
const DB_NAME = 'compsync-mp3-storage';
const DB_VERSION = 1;
const STORE_NAME = 'mp3-files';
const METADATA_STORE = 'mp3-metadata';

// File metadata interface
export interface MP3Metadata {
  id: string;
  entryId: string;
  filename: string;
  size: number;
  mimeType: string;
  downloadedAt: string;
  durationMs?: number;
  competitionId: string;
  studioId?: string;
}

// Download progress callback
export type DownloadProgressCallback = (
  completed: number,
  total: number,
  currentFile: string | null,
  error?: string
) => void;

// Scan result for MP3 validation (Task #15)
export interface MP3ScanResult {
  entryId: string;
  filename: string;
  isValid: boolean;
  error?: string;
  durationMs?: number;
}

// Scan progress callback (Task #15)
export type ScanProgressCallback = (
  scanned: number,
  total: number,
  currentFile: string | null,
  result?: MP3ScanResult
) => void;

// Scan summary (Task #15)
export interface MP3ScanSummary {
  totalScanned: number;
  validFiles: number;
  corruptedFiles: MP3ScanResult[];
  scanDurationMs: number;
}

// Storage stats
export interface StorageStats {
  totalFiles: number;
  totalBytes: number;
  availableBytes: number;
  usedBytes: number;
}

/**
 * MP3 Storage Manager Class
 * Handles IndexedDB operations for offline MP3 storage
 */
// Supabase client interface (minimal for storage operations)
interface SupabaseStorageClient {
  storage: {
    from: (bucketName: string) => {
      download: (path: string) => Promise<{ data: Blob | null; error: Error | null }>;
    };
  };
}

export class MP3StorageManager {
  private db: IDBDatabase | null = null;
  private isInitialized = false;
  private supabaseClient: SupabaseStorageClient | null = null;

  /**
   * Initialize the IndexedDB database
   */
  async init(): Promise<void> {
    if (this.isInitialized && this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB: ' + request.error?.message));
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create MP3 files store (stores actual blob data)
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }

        // Create metadata store (stores file info for quick lookups)
        if (!db.objectStoreNames.contains(METADATA_STORE)) {
          const metadataStore = db.createObjectStore(METADATA_STORE, { keyPath: 'id' });
          metadataStore.createIndex('entryId', 'entryId', { unique: true });
          metadataStore.createIndex('competitionId', 'competitionId', { unique: false });
        }
      };
    });
  }

  /**
   * Set the Supabase client for downloading files
   */
  setSupabaseClient(client: SupabaseStorageClient): void {
    this.supabaseClient = client;
  }

  /**
   * Check if a file exists in storage
   */
  async hasFile(entryId: string): Promise<boolean> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([METADATA_STORE], 'readonly');
      const store = transaction.objectStore(METADATA_STORE);
      const index = store.index('entryId');
      const request = index.get(entryId);

      request.onsuccess = () => {
        resolve(!!request.result);
      };

      request.onerror = () => {
        reject(new Error('Failed to check file existence'));
      };
    });
  }

  /**
   * Store an MP3 file
   */
  async storeFile(
    id: string,
    entryId: string,
    blob: Blob,
    metadata: Partial<MP3Metadata>
  ): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const fullMetadata: MP3Metadata = {
      id,
      entryId,
      filename: metadata.filename || `${entryId}.mp3`,
      size: blob.size,
      mimeType: blob.type || 'audio/mpeg',
      downloadedAt: new Date().toISOString(),
      durationMs: metadata.durationMs,
      competitionId: metadata.competitionId || '',
      studioId: metadata.studioId,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME, METADATA_STORE], 'readwrite');

      transaction.onerror = () => {
        reject(new Error('Transaction failed: ' + transaction.error?.message));
      };

      transaction.oncomplete = () => {
        resolve();
      };

      // Store the blob
      const fileStore = transaction.objectStore(STORE_NAME);
      fileStore.put({ id, entryId, blob });

      // Store metadata
      const metadataStore = transaction.objectStore(METADATA_STORE);
      metadataStore.put(fullMetadata);
    });
  }

  /**
   * Retrieve an MP3 file blob
   */
  async getFile(entryId: string): Promise<Blob | null> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    // First, get the file ID from metadata
    const metadata = await this.getMetadata(entryId);
    if (!metadata) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(metadata.id);

      request.onsuccess = () => {
        resolve(request.result?.blob || null);
      };

      request.onerror = () => {
        reject(new Error('Failed to retrieve file'));
      };
    });
  }

  /**
   * Get file metadata
   */
  async getMetadata(entryId: string): Promise<MP3Metadata | null> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([METADATA_STORE], 'readonly');
      const store = transaction.objectStore(METADATA_STORE);
      const index = store.index('entryId');
      const request = index.get(entryId);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(new Error('Failed to retrieve metadata'));
      };
    });
  }

  /**
   * Get all metadata for a competition
   */
  async getCompetitionFiles(competitionId: string): Promise<MP3Metadata[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([METADATA_STORE], 'readonly');
      const store = transaction.objectStore(METADATA_STORE);
      const index = store.index('competitionId');
      const request = index.getAll(competitionId);

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(new Error('Failed to retrieve competition files'));
      };
    });
  }

  /**
   * Delete a file
   */
  async deleteFile(entryId: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const metadata = await this.getMetadata(entryId);
    if (!metadata) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME, METADATA_STORE], 'readwrite');

      transaction.onerror = () => {
        reject(new Error('Delete transaction failed'));
      };

      transaction.oncomplete = () => {
        resolve();
      };

      const fileStore = transaction.objectStore(STORE_NAME);
      fileStore.delete(metadata.id);

      const metadataStore = transaction.objectStore(METADATA_STORE);
      metadataStore.delete(metadata.id);
    });
  }

  /**
   * Delete all files for a competition
   */
  async deleteCompetitionFiles(competitionId: string): Promise<void> {
    const files = await this.getCompetitionFiles(competitionId);
    for (const file of files) {
      await this.deleteFile(file.entryId);
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<StorageStats> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    // Get all metadata to calculate total size
    const allMetadata = await new Promise<MP3Metadata[]>((resolve, reject) => {
      const transaction = this.db!.transaction([METADATA_STORE], 'readonly');
      const store = transaction.objectStore(METADATA_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new Error('Failed to get storage stats'));
    });

    const totalFiles = allMetadata.length;
    const totalBytes = allMetadata.reduce((sum, m) => sum + m.size, 0);

    // Get storage estimate if available
    let availableBytes = 0;
    let usedBytes = totalBytes;

    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        availableBytes = estimate.quota ? estimate.quota - (estimate.usage || 0) : 0;
        usedBytes = estimate.usage || totalBytes;
      } catch {
        // Storage API not available
      }
    }

    return {
      totalFiles,
      totalBytes,
      availableBytes,
      usedBytes,
    };
  }

  /**
   * Download a single file from Supabase
   */
  async downloadFile(
    bucketName: string,
    filePath: string,
    entryId: string,
    competitionId: string,
    studioId?: string
  ): Promise<boolean> {
    if (!this.supabaseClient) {
      throw new Error('Supabase client not set. Call setSupabaseClient first.');
    }

    try {
      // Download from Supabase storage
      const { data, error } = await this.supabaseClient.storage
        .from(bucketName)
        .download(filePath);

      if (error) {
        console.error(`Download failed for ${filePath}:`, error.message);
        return false;
      }

      if (!data) {
        console.error(`No data received for ${filePath}`);
        return false;
      }

      // Store in IndexedDB
      const id = `${competitionId}-${entryId}`;
      await this.storeFile(id, entryId, data, {
        filename: filePath.split('/').pop() || `${entryId}.mp3`,
        competitionId,
        studioId,
      });

      return true;
    } catch (error) {
      console.error(`Download error for ${filePath}:`, error);
      return false;
    }
  }

  /**
   * Bulk download files with progress tracking
   */
  async bulkDownload(
    bucketName: string,
    files: Array<{
      filePath: string;
      entryId: string;
      competitionId: string;
      studioId?: string;
    }>,
    onProgress?: DownloadProgressCallback,
    concurrency: number = 3
  ): Promise<{ successful: number; failed: string[] }> {
    if (!this.supabaseClient) {
      throw new Error('Supabase client not set. Call setSupabaseClient first.');
    }

    const total = files.length;
    let completed = 0;
    const failed: string[] = [];

    // Process files in batches for concurrency control
    const processBatch = async (batch: typeof files) => {
      await Promise.all(
        batch.map(async (file) => {
          try {
            // Check if already downloaded
            const exists = await this.hasFile(file.entryId);
            if (exists) {
              completed++;
              onProgress?.(completed, total, file.filePath);
              return;
            }

            const success = await this.downloadFile(
              bucketName,
              file.filePath,
              file.entryId,
              file.competitionId,
              file.studioId
            );

            completed++;
            if (!success) {
              failed.push(file.entryId);
              onProgress?.(completed, total, file.filePath, `Failed: ${file.filePath}`);
            } else {
              onProgress?.(completed, total, file.filePath);
            }
          } catch (error) {
            completed++;
            failed.push(file.entryId);
            onProgress?.(
              completed,
              total,
              file.filePath,
              `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
          }
        })
      );
    };

    // Split into batches
    for (let i = 0; i < files.length; i += concurrency) {
      const batch = files.slice(i, i + concurrency);
      await processBatch(batch);
    }

    return {
      successful: total - failed.length,
      failed,
    };
  }

  /**
   * Create a blob URL for playback
   */
  async createBlobUrl(entryId: string): Promise<string | null> {
    const blob = await this.getFile(entryId);
    if (!blob) return null;
    return URL.createObjectURL(blob);
  }

  /**
   * Revoke a blob URL
   */
  revokeBlobUrl(url: string): void {
    URL.revokeObjectURL(url);
  }

  /**
   * Clear all stored files
   */
  async clearAll(): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME, METADATA_STORE], 'readwrite');

      transaction.onerror = () => {
        reject(new Error('Clear transaction failed'));
      };

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.objectStore(STORE_NAME).clear();
      transaction.objectStore(METADATA_STORE).clear();
    });
  }

  /**
   * Validate a single MP3 file by attempting to decode it (Task #15)
   * Uses Web Audio API to verify file is a valid audio file
   */
  async validateMP3(blob: Blob): Promise<{ isValid: boolean; error?: string; durationMs?: number }> {
    // Check minimum file size (empty or too small)
    if (blob.size < 100) {
      return { isValid: false, error: 'File is too small (likely empty or corrupted)' };
    }

    // Check MIME type
    if (blob.type && !blob.type.includes('audio') && blob.type !== 'application/octet-stream') {
      return { isValid: false, error: `Invalid MIME type: ${blob.type}` };
    }

    try {
      // Convert blob to ArrayBuffer
      const arrayBuffer = await blob.arrayBuffer();

      // Create AudioContext for decoding
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) {
        return { isValid: false, error: 'Web Audio API not supported' };
      }

      const audioContext = new AudioContextClass();

      try {
        // Attempt to decode the audio data
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const durationMs = Math.round(audioBuffer.duration * 1000);

        // Verify reasonable duration (more than 1 second, less than 20 minutes)
        if (durationMs < 1000) {
          return { isValid: false, error: 'Audio duration too short (< 1 second)' };
        }
        if (durationMs > 20 * 60 * 1000) {
          return { isValid: false, error: 'Audio duration too long (> 20 minutes)' };
        }

        return { isValid: true, durationMs };
      } finally {
        // Clean up AudioContext
        await audioContext.close();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown decode error';
      return { isValid: false, error: `Failed to decode audio: ${message}` };
    }
  }

  /**
   * Scan a single file by entry ID (Task #15)
   */
  async scanFile(entryId: string): Promise<MP3ScanResult> {
    const metadata = await this.getMetadata(entryId);
    if (!metadata) {
      return {
        entryId,
        filename: 'Unknown',
        isValid: false,
        error: 'File not found in storage',
      };
    }

    const blob = await this.getFile(entryId);
    if (!blob) {
      return {
        entryId,
        filename: metadata.filename,
        isValid: false,
        error: 'Blob data not found',
      };
    }

    const validation = await this.validateMP3(blob);
    return {
      entryId,
      filename: metadata.filename,
      isValid: validation.isValid,
      error: validation.error,
      durationMs: validation.durationMs,
    };
  }

  /**
   * Get all metadata (helper for scanning) (Task #15)
   */
  async getAllMetadata(): Promise<MP3Metadata[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([METADATA_STORE], 'readonly');
      const store = transaction.objectStore(METADATA_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new Error('Failed to get all metadata'));
    });
  }

  /**
   * Scan all MP3 files for a competition (Task #15)
   * Returns a summary with valid/corrupted file lists
   */
  async scanCompetitionFiles(
    competitionId: string,
    onProgress?: ScanProgressCallback
  ): Promise<MP3ScanSummary> {
    const startTime = Date.now();
    const files = await this.getCompetitionFiles(competitionId);
    const total = files.length;
    let scanned = 0;
    const corruptedFiles: MP3ScanResult[] = [];

    for (const metadata of files) {
      const result = await this.scanFile(metadata.entryId);
      scanned++;

      if (!result.isValid) {
        corruptedFiles.push(result);
      }

      onProgress?.(scanned, total, metadata.filename, result);
    }

    return {
      totalScanned: total,
      validFiles: total - corruptedFiles.length,
      corruptedFiles,
      scanDurationMs: Date.now() - startTime,
    };
  }

  /**
   * Scan all stored MP3 files (Task #15)
   * Use this to validate all files regardless of competition
   */
  async scanAllFiles(onProgress?: ScanProgressCallback): Promise<MP3ScanSummary> {
    const startTime = Date.now();
    const allMetadata = await this.getAllMetadata();
    const total = allMetadata.length;
    let scanned = 0;
    const corruptedFiles: MP3ScanResult[] = [];

    for (const metadata of allMetadata) {
      const result = await this.scanFile(metadata.entryId);
      scanned++;

      if (!result.isValid) {
        corruptedFiles.push(result);
      }

      onProgress?.(scanned, total, metadata.filename, result);
    }

    return {
      totalScanned: total,
      validFiles: total - corruptedFiles.length,
      corruptedFiles,
      scanDurationMs: Date.now() - startTime,
    };
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isInitialized = false;
    }
  }
}

// Export singleton instance
export const mp3Storage = new MP3StorageManager();
