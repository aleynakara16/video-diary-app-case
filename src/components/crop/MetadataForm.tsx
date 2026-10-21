import {
  VideoMetadataFormData,
  videoMetadataSchema,
} from '@/lib/videoSchema';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ChevronLeftIcon } from './CropIcons';

interface MetadataFormProps {
  initialValues?: {
    name: string;
    description: string;
  };
  isSubmitting?: boolean;
  submitButtonText?: string;
  onBack?: () => void;
  onSubmit: (data: VideoMetadataFormData) => void;
}

export function MetadataForm({
  initialValues = { name: '', description: '' },
  isSubmitting = false,
  submitButtonText = 'Trim & Save Video',
  onBack,
  onSubmit,
}: MetadataFormProps) {
  const [name, setName] = useState(initialValues.name);
  const [description, setDescription] = useState(initialValues.description);
  const [errors, setErrors] = useState<{ name?: string; description?: string }>(
    {}
  );

  const handleSubmit = () => {
    setErrors({});

    const result = videoMetadataSchema.safeParse({
      name,
      description,
    });

    if (!result.success) {
      const fieldErrors: { name?: string; description?: string } = {};
      for (const issue of result.error.issues) {
        if (issue.path[0] === 'name') {
          fieldErrors.name = issue.message;
        } else if (issue.path[0] === 'description') {
          fieldErrors.description = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    onSubmit(result.data);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1">
      <ScrollView
        contentContainerClassName="flex-grow justify-between px-6 pt-5 pb-6"
        keyboardShouldPersistTaps="handled">
        <View>
          <View className="flex-row items-center justify-between mb-5">
            <View className="flex-1 mr-3">
              <Text className="text-base font-extrabold text-stone-900">
                Name your 5-second moment
              </Text>
              <Text className="text-stone-400 text-xs font-medium mt-0.5">
                Add a title and optional note to remember this clip
              </Text>
            </View>
            <View className="px-3 py-1.5 rounded-xl bg-[#eef8e8] border border-[#a1d783]">
              <Text className="text-[#142e12] font-mono text-xs font-extrabold">
                00:05
              </Text>
            </View>
          </View>

          {/* Name Field */}
          <View className="mb-5">
            <View className="flex-row justify-between mb-1.5">
              <Text className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Title <Text className="text-red-500">*</Text>
              </Text>
              <Text className="text-xs text-stone-400 font-mono font-semibold">
                {name.length}/100
              </Text>
            </View>

            <TextInput
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (errors.name)
                  setErrors((prev) => ({ ...prev, name: undefined }));
              }}
              placeholder="e.g., Sunset by the coast"
              placeholderTextColor="#A8A29E"
              maxLength={100}
              editable={!isSubmitting}
              accessibilityLabel="Video title input"
              className={`rounded-2xl px-4 py-3.5 text-stone-900 text-base font-medium border ${
                errors.name
                  ? 'bg-red-50 border-red-500'
                  : 'bg-stone-50 border-stone-200'
              }`}
            />

            {errors.name && (
              <Text className="text-red-500 text-xs mt-1.5 font-medium">
                {errors.name}
              </Text>
            )}
          </View>

          {/* Description Field */}
          <View className="mb-4">
            <View className="flex-row justify-between mb-1.5">
              <Text className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Description (Optional)
              </Text>
              <Text className="text-xs text-stone-400 font-mono font-semibold">
                {description.length}/1000
              </Text>
            </View>

            <TextInput
              value={description}
              onChangeText={(text) => {
                setDescription(text);
                if (errors.description)
                  setErrors((prev) => ({ ...prev, description: undefined }));
              }}
              placeholder="What made this moment special?"
              placeholderTextColor="#A8A29E"
              maxLength={1000}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!isSubmitting}
              accessibilityLabel="Video description input"
              className={`min-h-[116px] rounded-2xl px-4 py-3.5 text-stone-900 text-base font-medium border ${
                errors.description
                  ? 'bg-red-50 border-red-500'
                  : 'bg-stone-50 border-stone-200'
              }`}
            />

            {errors.description && (
              <Text className="text-red-500 text-xs mt-1.5 font-medium">
                {errors.description}
              </Text>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        <View className="flex-row items-center gap-3 pt-4">
          {onBack && (
            <TouchableOpacity
              onPress={onBack}
              disabled={isSubmitting}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Back to 5-second selection"
              className="px-5 py-4 rounded-2xl bg-stone-100 border border-stone-200 flex-row items-center justify-center">
              <ChevronLeftIcon color="#1C1917" size={13} />
              <Text className="text-stone-800 font-bold text-sm ml-1.5">
                Back
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={submitButtonText}
            accessibilityState={{ disabled: isSubmitting, busy: isSubmitting }}
            className={`flex-1 py-4 rounded-2xl bg-[#a1d783] flex-row items-center justify-center ${
              isSubmitting ? 'opacity-70' : 'opacity-100'
            }`}>
            {isSubmitting ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator size="small" color="#142e12" />
                <Text className="text-[#142e12] font-extrabold text-base">
                  Trimming & Saving...
                </Text>
              </View>
            ) : (
              <>
                <Text className="text-[#142e12] font-extrabold text-base mr-2">
                  {submitButtonText}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
