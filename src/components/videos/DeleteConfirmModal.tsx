import React from 'react';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { TrashIcon } from '@/components/crop/CropIcons';

interface DeleteConfirmModalProps {
  visible: boolean;
  videoTitle?: string;
  isDeleting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmModal({
  visible,
  videoTitle,
  isDeleting = false,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}>
      <View
        accessible
        accessibilityRole="alert"
        accessibilityViewIsModal
        className="flex-1 bg-black/60 items-center justify-center px-6">
        <View
          style={{ backgroundColor: '#FFFFFF' }}
          className="bg-white border border-stone-200 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
          <View className="w-12 h-12 rounded-full bg-red-50 border border-red-200 items-center justify-center self-center mb-4">
            <TrashIcon color="#DC2626" size={20} />
          </View>

          <Text className="text-lg font-bold text-stone-900 text-center mb-2">
            Delete Video Diary?
          </Text>

          <Text className="text-sm text-stone-500 text-center mb-6 leading-relaxed">
            Are you sure you want to delete {videoTitle ? `"${videoTitle}"` : 'this video'}? This action cannot be undone.
          </Text>

          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={onCancel}
              disabled={isDeleting}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Cancel deletion"
              className="flex-1 py-3 rounded-xl bg-stone-100 items-center justify-center border border-stone-300">
              <Text className="text-stone-700 font-semibold text-sm">Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onConfirm}
              disabled={isDeleting}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Confirm delete video"
              className="flex-1 py-3 rounded-xl bg-red-600 items-center justify-center">
              {isDeleting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className="text-white font-semibold text-sm">Delete</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
