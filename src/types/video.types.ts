export interface VideoEntry {
  id: string;
  name: string;
  description: string;
  videoUri: string;
  thumbnailUri: string | null; // Persisted JPEG thumbnail (generated once at save time)
  duration: number; // Duration in seconds (e.g. 5.0)
  createdAt: number; // Unix timestamp in milliseconds
  updatedAt: number; // Unix timestamp in milliseconds
}

export interface CreateVideoInput {
  name: string;
  description?: string;
  videoUri: string;
  thumbnailUri?: string | null;
  duration: number;
}

export interface UpdateVideoInput {
  name: string;
  description?: string;
}

import type { VideoThumbnail } from 'expo-video';

export interface VideoAsset {
  uri: string;
  posterFrame?: VideoThumbnail; // In-memory first frame generated at pick time (used as timeline placeholder)
  duration: number; // in seconds
  width?: number;
  height?: number;
  fileName?: string | null;
}

