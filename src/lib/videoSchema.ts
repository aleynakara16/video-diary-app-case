import { z } from 'zod';

export const videoMetadataSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Video name is required')
    .max(100, 'Video name cannot exceed 100 characters'),
  description: z
    .string()
    .trim()
    .max(1000, 'Description cannot exceed 1000 characters')
    .default(''),
});

export type VideoMetadataFormData = z.infer<typeof videoMetadataSchema>;

