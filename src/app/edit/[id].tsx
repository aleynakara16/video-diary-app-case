import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useVideo, useUpdateVideo } from '@/hooks/useVideos';
import { MetadataForm } from '@/components/crop/MetadataForm';
import { CloseIcon } from '@/components/crop/CropIcons';
import type { VideoMetadataFormData } from '@/lib/videoSchema';

export default function EditVideoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: video, isLoading, isError } = useVideo(id ?? '');
  const updateMutation = useUpdateVideo();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (data: VideoMetadataFormData) => {
    if (!video) return;

    try {
      await updateMutation.mutateAsync({
        id: video.id,
        input: {
          name: data.name,
          description: data.description,
        },
      });

      setSuccessMessage('Video details updated successfully!');
      setTimeout(() => {
        router.back();
      }, 500);
    } catch (err: any) {
      console.error('[EditVideoScreen] Update error:', err);
      Alert.alert(
        'Update Failed',
        err?.message || 'Could not update video details. Please try again.'
      );
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView
        className="flex-1 bg-white items-center justify-center"
        edges={Platform.OS === 'android' ? ['top', 'bottom'] : ['bottom']}>
        <ActivityIndicator size="large" color="#a1d783" />
        <Text className="text-stone-500 text-sm mt-3">
          Loading video details...
        </Text>
      </SafeAreaView>
    );
  }

  if (isError || !video) {
    return (
      <SafeAreaView
        className="flex-1 bg-white items-center justify-center p-6"
        edges={Platform.OS === 'android' ? ['top', 'bottom'] : ['bottom']}>
        <Text className="text-xl font-bold text-stone-900 mb-2">
          Video Not Found
        </Text>
        <Text className="text-stone-500 text-sm text-center mb-6">
          The video you are trying to edit could not be found.
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.85}
          className="bg-[#a1d783] px-6 py-3 rounded-xl">
          <Text className="text-[#142e12] font-semibold">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className="flex-1 bg-white"
      edges={Platform.OS === 'android' ? ['top', 'bottom'] : ['bottom']}>
      {/* Sheet Grabber Handle */}
      <View className="items-center pt-2.5 pb-1">
        <View className="w-10 h-1 rounded-full bg-stone-300" />
      </View>

      {/* Edit Sheet Header */}
      <View className="px-6 pt-2 pb-3.5 flex-row items-center justify-between border-b border-stone-100">
        <View className="w-10 h-10" />

        <View className="items-center flex-1 mx-3">
          <Text className="text-[11px] font-bold tracking-widest text-stone-400 uppercase mb-0.5">
            EDIT ENTRY
          </Text>
          <Text className="text-xl font-extrabold text-stone-900 tracking-tight text-center">
            Edit Video Details
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Close edit modal"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          className="w-10 h-10 rounded-full bg-stone-100 border border-stone-200 items-center justify-center">
          <CloseIcon color="#57534E" size={14} />
        </TouchableOpacity>
      </View>

      {successMessage && (
        <View className="mx-6 mt-4 p-3 rounded-xl bg-[#eef8e8] border border-[#a1d783]">
          <Text className="text-[#142e12] text-xs text-center font-medium">
            {successMessage}
          </Text>
        </View>
      )}

      <MetadataForm
        initialValues={{
          name: video.name,
          description: video.description,
        }}
        isSubmitting={updateMutation.isPending}
        submitButtonText="Save Changes"
        onSubmit={handleSubmit}
      />
    </SafeAreaView>
  );
}

