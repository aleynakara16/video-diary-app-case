import { create } from 'zustand';
import type { VideoAsset } from '@/types/video.types';

export type CropStep = 'pick' | 'scrub' | 'metadata';

interface CropState {
  currentStep: CropStep;
  selectedAsset: VideoAsset | null;
  startTime: number; // in seconds
  endTime: number; // in seconds (startTime + 5)
  formData: {
    name: string;
    description: string;
  };

  // Actions
  setStep: (step: CropStep) => void;
  setSelectedAsset: (asset: VideoAsset | null) => void;
  setSegment: (startTime: number) => void;
  setFormData: (data: { name: string; description: string }) => void;
  reset: () => void;
}

const initialState = {
  currentStep: 'pick' as CropStep,
  selectedAsset: null,
  startTime: 0,
  endTime: 5,
  formData: {
    name: '',
    description: '',
  },
};

export const useCropStore = create<CropState>((set) => ({
  ...initialState,

  setStep: (step) => set({ currentStep: step }),

  setSelectedAsset: (asset) =>
    set({
      selectedAsset: asset,
      startTime: 0,
      endTime: 5,
    }),

  setSegment: (startTime) =>
    set({
      startTime: Math.max(0, startTime),
      endTime: Math.max(0, startTime) + 5,
    }),

  setFormData: (data) =>
    set((state) => ({
      formData: {
        ...state.formData,
        ...data,
      },
    })),

  reset: () => set(initialState),
}));
