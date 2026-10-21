import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  BackHandler,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCropStore, CropStep } from '@/store/cropStore';
import { useTrimVideoMutation } from '@/hooks/useTrimVideoMutation';
import { VideoPickerStep } from '@/components/crop/VideoPickerStep';
import { SegmentScrubber } from '@/components/crop/SegmentScrubber';
import { MetadataForm } from '@/components/crop/MetadataForm';
import {
  CloseIcon,
  CheckIcon,
  ChevronLeftIcon,
} from '@/components/crop/CropIcons';
import type { VideoMetadataFormData } from '@/lib/videoSchema';

export default function CropScreen() {
  const router = useRouter();
  const trimMutation = useTrimVideoMutation();

  const {
    currentStep,
    selectedAsset,
    startTime,
    endTime,
    formData,
    setStep,
    setSelectedAsset,
    setSegment,
    setFormData,
    reset,
  } = useCropStore();

  const handleClose = useCallback(() => {
    if (trimMutation.isPending) return;
    reset();
    router.back();
  }, [trimMutation.isPending, reset, router]);

  const handleBackStep = useCallback(() => {
    if (trimMutation.isPending) return;
    if (currentStep === 'metadata') {
      setStep('scrub');
    } else if (currentStep === 'scrub') {
      setStep('pick');
    } else {
      handleClose();
    }
  }, [currentStep, trimMutation.isPending, setStep, handleClose]);

  // Intercept hardware/gesture back on Android so it navigates between steps first
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (trimMutation.isPending) return true;
        if (currentStep === 'metadata') {
          setStep('scrub');
          return true;
        }
        if (currentStep === 'scrub') {
          setStep('pick');
          return true;
        }
        reset();
        return false;
      }
    );

    return () => subscription.remove();
  }, [currentStep, trimMutation.isPending, setStep, reset]);

  const handleFormSubmit = async (data: VideoMetadataFormData) => {
    if (!selectedAsset) {
      Alert.alert('Error', 'Please select a video first.');
      setStep('pick');
      return;
    }

    setFormData(data);

    try {
      const newEntry = await trimMutation.mutateAsync({
        sourceUri: selectedAsset.uri,
        startTime,
        endTime,
        name: data.name,
        description: data.description,
      });

      reset();
      router.replace(`/videos/${newEntry.id}`);
    } catch (err: any) {
      console.error('[CropScreen] Trimming failed:', err);
      Alert.alert(
        'Video Trimming Failed',
        err?.message ||
          'Could not trim the video. Please check format or try a different segment.'
      );
    }
  };

  const steps: {
    key: CropStep;
    number: number;
    label: string;
    title: string;
  }[] = [
    { key: 'pick', number: 1, label: 'Select', title: 'Select your moment' },
    { key: 'scrub', number: 2, label: 'Crop', title: 'Crop your moment' },
    { key: 'metadata', number: 3, label: 'Details', title: 'Save your moment' },
  ];

  const activeStepObj = steps.find((s) => s.key === currentStep) ?? steps[0];
  const canGoBackStep = currentStep !== 'pick';

  const handleStepPress = (stepKey: CropStep) => {
    if (trimMutation.isPending || stepKey === currentStep) return;
    if (stepKey === 'pick') {
      setStep('pick');
    } else if (stepKey === 'scrub' && selectedAsset) {
      setStep('scrub');
    }
  };

  return (
    <SafeAreaView
      className="flex-1 bg-white"
      edges={Platform.OS === 'android' ? ['top', 'bottom'] : ['bottom']}>
      {/* Sheet Grabber Handle */}
      <View className="items-center pt-2.5 pb-1">
        <View className="w-10 h-1 rounded-full bg-stone-300" />
      </View>

      {/* Sheet Header Bar */}
      <View className="px-6 pt-2 pb-3.5 flex-row items-center justify-between border-b border-stone-100">
        {canGoBackStep ? (
          <TouchableOpacity
            onPress={handleBackStep}
            disabled={trimMutation.isPending}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Go to previous step"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            className="w-10 h-10 rounded-full bg-stone-100 border border-stone-200 items-center justify-center">
            <ChevronLeftIcon color="#1C1917" size={14} />
          </TouchableOpacity>
        ) : (
          <View className="w-10 h-10" />
        )}

        <View className="items-center flex-1 mx-3">
          <Text className="text-[11px] font-bold tracking-widest text-stone-400 uppercase mb-0.5">
            STEP {activeStepObj.number} OF {steps.length}
          </Text>
          <Text className="text-xl font-extrabold text-stone-900 tracking-tight text-center">
            {activeStepObj.title}
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleClose}
          disabled={trimMutation.isPending}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Close video crop modal"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          className="w-10 h-10 rounded-full bg-stone-100 border border-stone-200 items-center justify-center">
          <CloseIcon color="#57534E" size={14} />
        </TouchableOpacity>
      </View>

      {/* Connected Interactive Stepper Row */}
      <View className="px-6 py-3.5 flex-row items-center justify-between bg-stone-50/70 border-b border-stone-100">
        {steps.map((s, idx) => {
          const isActive = currentStep === s.key;
          const isCompleted =
            (s.key === 'pick' && currentStep !== 'pick') ||
            (s.key === 'scrub' && currentStep === 'metadata');
          const isReachable =
            s.key === 'pick' || (s.key === 'scrub' && Boolean(selectedAsset));

          return (
            <React.Fragment key={s.key}>
              <TouchableOpacity
                disabled={!isReachable || isActive || trimMutation.isPending}
                onPress={() => handleStepPress(s.key)}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={`Step ${s.number}: ${s.title}`}
                className="flex-row items-center">
                <View
                  className={`w-7 h-7 rounded-full items-center justify-center ${
                    isActive || isCompleted
                      ? 'bg-[#a1d783]'
                      : 'bg-white border border-stone-200'
                  }`}>
                  {isCompleted ? (
                    <CheckIcon color="#142e12" size={12} />
                  ) : (
                    <Text
                      className={`text-xs font-extrabold ${
                        isActive ? 'text-[#142e12]' : 'text-stone-400'
                      }`}>
                      {s.number}
                    </Text>
                  )}
                </View>
                <Text
                  className={`ml-2 text-xs font-bold ${
                    isActive
                      ? 'text-stone-900'
                      : isCompleted
                        ? 'text-stone-700'
                        : 'text-stone-400'
                  }`}>
                  {s.label}
                </Text>
              </TouchableOpacity>

              {idx < steps.length - 1 && (
                <View
                  className={`flex-1 h-0.5 mx-3 rounded-full ${
                    isCompleted ? 'bg-[#a1d783]' : 'bg-stone-200'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>

      {/* Step Content */}
      <View className="flex-1">
        {currentStep === 'pick' && (
          <VideoPickerStep
            selectedAsset={selectedAsset}
            onAssetSelected={(asset) => setSelectedAsset(asset)}
            onContinue={() => setStep('scrub')}
          />
        )}

        {currentStep === 'scrub' && selectedAsset && (
          <SegmentScrubber
            asset={selectedAsset}
            startTime={startTime}
            endTime={endTime}
            onSegmentChange={(start) => setSegment(start)}
            onBack={() => setStep('pick')}
            onContinue={() => setStep('metadata')}
          />
        )}

        {currentStep === 'metadata' && (
          <MetadataForm
            initialValues={formData}
            isSubmitting={trimMutation.isPending}
            submitButtonText="Trim & Save to Diary"
            onBack={() => setStep('scrub')}
            onSubmit={handleFormSubmit}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

