import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { auth } from '../firebaseConfig';
import { Star, ChevronDown, ChevronUp, AlertCircle, Check } from 'lucide-react-native';

// Types
interface Trainee {
  id: string;
  name: string;
  email: string;
  phone?: string;
  photo?: string;
  memberSince?: string;
  yearsExperience?: number;
  previousEmployer?: string;
  specializations?: string[];
  status: 'in_training' | 'certified';
  progress: {
    completedSessions: number;
    requiredSessions: number;
    isComplete: boolean;
  };
  averageRating?: number;
  evaluations?: Evaluation[];
}

interface Evaluation {
  id: string;
  date: string;
  ratings: {
    technique: number;
    speed: number;
    customerService: number;
    safety: number;
  };
  feedback: string;
}

interface FormState {
  bookingId: string;
  ratings: {
    technique: number | null;
    speed: number | null;
    customerService: number | null;
    safety: number | null;
  };
  feedback: string;
  notes: string;
}

const RATING_CATEGORIES = [
  {
    key: 'technique',
    label: 'Technique',
    description: 'Quality of wash, attention to detail',
  },
  {
    key: 'speed',
    label: 'Speed',
    description: 'Efficiency, time management',
  },
  {
    key: 'customerService',
    label: 'Customer Service',
    description: 'Professionalism, communication',
  },
  {
    key: 'safety',
    label: 'Safety',
    description: 'Equipment handling, PPE usage',
  },
];

export default function MentorshipScreen() {
  // Global state
  const [trainees, setTrainees] = useState<Trainee[]>([]);
  const [expandedTraineeId, setExpandedTraineeId] = useState<string | null>(null);
  const [showFormForTraineeId, setShowFormForTraineeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state per trainee
  const [formState, setFormState] = useState<Record<string, FormState>>({});

  // Completion modal
  const [completionModal, setCompletionModal] = useState({
    visible: false,
    traineeName: '',
  });

  // Fetch trainees on mount
  useEffect(() => {
    fetchTrainees();
  }, []);

  const getAuthToken = async (): Promise<string> => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    return user.getIdToken(true);
  };

  const fetchTrainees = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await getAuthToken();
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_BASE_URL}/certification/my-trainees`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {
        // Retry once with fresh token
        const newToken = await getAuthToken();
        const retryResponse = await fetch(
          `${process.env.EXPO_PUBLIC_API_BASE_URL}/certification/my-trainees`,
          {
            headers: {
              Authorization: `Bearer ${newToken}`,
            },
          }
        );
        if (!retryResponse.ok) throw new Error('Failed to fetch trainees');
        const data = await retryResponse.json();
        setTrainees(data.data?.trainees || []);
      } else if (!response.ok) {
        throw new Error('Failed to fetch trainees');
      } else {
        const data = await response.json();
        setTrainees(data.data?.trainees || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const toggleTraineeExpanded = (traineeId: string) => {
    if (expandedTraineeId === traineeId) {
      setExpandedTraineeId(null);
      setShowFormForTraineeId(null);
    } else {
      setExpandedTraineeId(traineeId);
      setShowFormForTraineeId(null);
      // Initialize form state if needed
      if (!formState[traineeId]) {
        setFormState((prev) => ({
          ...prev,
          [traineeId]: {
            bookingId: '',
            ratings: {
              technique: null,
              speed: null,
              customerService: null,
              safety: null,
            },
            feedback: '',
            notes: '',
          },
        }));
      }
    }
  };

  const toggleFormVisible = (traineeId: string) => {
    if (showFormForTraineeId === traineeId) {
      setShowFormForTraineeId(null);
    } else {
      setShowFormForTraineeId(traineeId);
    }
  };

  const updateFormState = (
    traineeId: string,
    key: keyof FormState,
    value: any
  ) => {
    setFormState((prev) => ({
      ...prev,
      [traineeId]: {
        ...prev[traineeId],
        [key]: value,
      },
    }));
  };

  const updateRating = (traineeId: string, category: string, value: number) => {
    setFormState((prev) => ({
      ...prev,
      [traineeId]: {
        ...prev[traineeId],
        ratings: {
          ...prev[traineeId].ratings,
          [category]: value,
        },
      },
    }));
  };

  const submitEvaluation = async (traineeId: string) => {
    try {
      setSubmitting(true);
      const form = formState[traineeId];

      const token = await getAuthToken();
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_BASE_URL}/certification/evaluate`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            traineeId,
            bookingId: form.bookingId || null,
            ratings: form.ratings,
            feedback: form.feedback,
            notes: form.notes,
          }),
        }
      );

      if (response.status === 401) {
        const newToken = await getAuthToken();
        const retryResponse = await fetch(
          `${process.env.EXPO_PUBLIC_API_BASE_URL}/certification/evaluate`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${newToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              traineeId,
              bookingId: form.bookingId || null,
              ratings: form.ratings,
              feedback: form.feedback,
              notes: form.notes,
            }),
          }
        );
        if (!retryResponse.ok) throw new Error('Submission failed');
        const data = await retryResponse.json();
        handleEvaluationSuccess(data, traineeId);
      } else if (response.status === 403) {
        setError('You are not assigned to evaluate this trainee');
      } else if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.message || 'Evaluation submission failed');
      } else {
        const data = await response.json();
        handleEvaluationSuccess(data, traineeId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEvaluationSuccess = (data: any, traineeId: string) => {
    const { progress } = data.data;

    if (progress.isComplete) {
      const trainee = trainees.find((t) => t.id === traineeId);
      setCompletionModal({
        visible: true,
        traineeName: trainee?.name || 'Trainee',
      });
    }

    // Refresh trainee data
    fetchTrainees();
    setShowFormForTraineeId(null);
  };

  const getAvatarInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const renderStarRating = (
    traineeId: string,
    category: string,
    currentRating: number | null
  ) => {
    return (
      <View className="flex-row gap-1.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => updateRating(traineeId, category, star)}
            activeOpacity={0.6}
          >
            <Star
              size={28}
              color={
                currentRating && currentRating >= star
                  ? '#FFB800'
                  : '#E5E7EB'
              }
              fill={
                currentRating && currentRating >= star ? '#FFB800' : 'none'
              }
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // ...existing code...

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-900">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-900">
      <StatusBar style="light" />
      <ScrollView className="flex-1 px-4 py-4">
        {/* Header */}
        <View className="mb-6">
          <Text className="text-3xl font-bold text-white">My Trainees</Text>
          <View className="mt-2 inline-flex bg-blue-600 rounded-full px-3 py-1 w-12">
            <Text className="text-white font-semibold text-sm">
              {trainees.length}
            </Text>
          </View>
        </View>

        {/* Error Banner */}
        {error && (
          <View className="mb-4 bg-red-900/30 border border-red-700 rounded-lg p-3 flex-row gap-2">
            <AlertCircle size={20} color="#FCA5A5" />
            <Text className="text-red-300 flex-1 text-sm">{error}</Text>
          </View>
        )}

        {/* Empty State */}
        {trainees.length === 0 && (
          <View className="bg-gray-800 rounded-lg p-8 items-center">
            <Text className="text-gray-400 text-center text-base">
              No trainees assigned yet.
            </Text>
          </View>
        )}

        {/* Trainees List */}
        {trainees.map((trainee) => {
          const isExpanded = expandedTraineeId === trainee.id;
          const form = formState[trainee.id] || {
            bookingId: '',
            ratings: { technique: null, speed: null, customerService: null, safety: null },
            feedback: '',
            notes: '',
          };
          const showForm = showFormForTraineeId === trainee.id;

          const allRatingsSet =
            form.ratings.technique !== null &&
            form.ratings.speed !== null &&
            form.ratings.customerService !== null &&
            form.ratings.safety !== null;
          const feedbackValid = form.feedback.trim().length >= 50;
          const canSubmit = allRatingsSet && feedbackValid;

          return (
            <TouchableOpacity
              key={trainee.id}
              onPress={() => toggleTraineeExpanded(trainee.id)}
              activeOpacity={0.7}
              className="mb-4"
            >
              <View className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                {/* Trainee Card Header */}
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1 gap-3">
                    {trainee.photo ? (
                      <Image
                        source={{ uri: trainee.photo }}
                        className="w-12 h-12 rounded-full"
                      />
                    ) : (
                      <View className="w-12 h-12 rounded-full bg-blue-600 items-center justify-center">
                        <Text className="text-white font-bold text-sm">
                          {getAvatarInitials(trainee.name)}
                        </Text>
                      </View>
                    )}
                    <View className="flex-1">
                      <Text className="text-white font-semibold text-base">
                        {trainee.name}
                      </Text>
                      <Text className="text-gray-400 text-xs">{trainee.email}</Text>
                    </View>
                  </View>
                  {isExpanded ? (
                    <ChevronUp size={20} color="#9CA3AF" />
                  ) : (
                    <ChevronDown size={20} color="#9CA3AF" />
                  )}
                </View>

                {/* Status & Progress Summary */}
                <View className="mt-4 gap-2">
                  <View className="flex-row items-center gap-2">
                    <View
                      className={`px-2 py-1 rounded-full ${
                        trainee.status === 'certified'
                          ? 'bg-green-900/30'
                          : 'bg-yellow-900/30'
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          trainee.status === 'certified'
                            ? 'text-green-400'
                            : 'text-yellow-400'
                        }`}
                      >
                        {trainee.status === 'certified'
                          ? 'Certified'
                          : 'In Training'}
                      </Text>
                    </View>
                    {trainee.averageRating !== undefined && (
                      <View className="flex-row items-center gap-1">
                        <Star
                          size={14}
                          color="#FFB800"
                          fill="#FFB800"
                        />
                        <Text className="text-gray-300 text-xs font-semibold">
                          {trainee.averageRating.toFixed(1)}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Progress Bar */}
                  <View className="gap-1">
                    <Text className="text-gray-400 text-xs">
                      {trainee.progress.completedSessions} of{' '}
                      {trainee.progress.requiredSessions} sessions completed
                    </Text>
                    <View className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <View
                        className="h-full bg-blue-600"
                        style={{
                          width: `${
                            (trainee.progress.completedSessions /
                              trainee.progress.requiredSessions) *
                            100
                          }%`,
                        }}
                      />
                    </View>
                  </View>
                </View>

                {/* Expanded Trainee Details */}
                {isExpanded && (
                  <View className="mt-6 pt-6 border-t border-gray-700 gap-5">
                    {/* Profile Info */}
                    <View className="gap-3">
                      <Text className="text-white font-semibold text-sm">
                        Profile
                      </Text>
                      {trainee.phone && (
                        <View>
                          <Text className="text-gray-400 text-xs">Phone</Text>
                          <Text className="text-white text-sm">
                            {trainee.phone}
                          </Text>
                        </View>
                      )}
                      {trainee.memberSince && (
                        <View>
                          <Text className="text-gray-400 text-xs">
                            Member Since
                          </Text>
                          <Text className="text-white text-sm">
                            {new Date(trainee.memberSince).toLocaleDateString()}
                          </Text>
                        </View>
                      )}
                      {trainee.yearsExperience !== undefined && (
                        <View>
                          <Text className="text-gray-400 text-xs">
                            Years of Experience
                          </Text>
                          <Text className="text-white text-sm">
                            {trainee.yearsExperience} years
                          </Text>
                        </View>
                      )}
                      {trainee.previousEmployer && (
                        <View>
                          <Text className="text-gray-400 text-xs">
                            Previous Employer
                          </Text>
                          <Text className="text-white text-sm">
                            {trainee.previousEmployer}
                          </Text>
                        </View>
                      )}
                      {trainee.specializations &&
                        trainee.specializations.length > 0 && (
                          <View className="gap-1">
                            <Text className="text-gray-400 text-xs">
                              Specializations
                            </Text>
                            <View className="flex-row flex-wrap gap-2">
                              {trainee.specializations.map((spec, idx) => (
                                <View
                                  key={idx}
                                  className="bg-blue-600/20 border border-blue-600 rounded-full px-3 py-1"
                                >
                                  <Text className="text-blue-400 text-xs font-semibold">
                                    {spec}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          </View>
                        )}
                    </View>

                    {/* Past Evaluations */}
                    <View className="gap-2">
                      <Text className="text-white font-semibold text-sm">
                        Past Evaluations
                      </Text>
                      {trainee.evaluations && trainee.evaluations.length > 0 ? (
                        <View className="gap-3">
                          {trainee.evaluations.map((evaluation: Evaluation, idx: number) => (
                            <View
                              key={idx}
                              className="bg-gray-700/40 border border-gray-600 rounded-lg p-3"
                            >
                              <Text className="text-gray-300 text-xs mb-2">
                                {new Date(evaluation.date).toLocaleDateString()}
                              </Text>
                              <View className="flex-row items-center gap-1 mb-2">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <Star
                                    key={s}
                                    size={14}
                                    color={
                                      s <=
                                      Math.round(
                                        (evaluation.ratings.technique +
                                          evaluation.ratings.speed +
                                          evaluation.ratings.customerService +
                                          evaluation.ratings.safety) /
                                          4
                                      )
                                        ? '#FFB800'
                                        : '#E5E7EB'
                                    }
                                    fill={
                                      s <=
                                      Math.round(
                                        (evaluation.ratings.technique +
                                          evaluation.ratings.speed +
                                          evaluation.ratings.customerService +
                                          evaluation.ratings.safety) /
                                          4
                                      )
                                        ? '#FFB800'
                                        : 'none'
                                    }
                                  />
                                ))}
                              </View>
                              <Text className="text-gray-300 text-xs">
                                {evaluation.feedback}
                              </Text>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <Text className="text-gray-400 text-xs">
                          No evaluations submitted yet
                        </Text>
                      )}
                    </View>

                    {/* Submit Evaluation Button */}
                    {trainee.progress.isComplete ? (
                      <View className="bg-green-900/30 border border-green-700 rounded-lg p-3">
                        <Text className="text-green-300 text-sm font-semibold">
                          ✓ All sessions completed
                        </Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        onPress={() => toggleFormVisible(trainee.id)}
                        className="bg-blue-600 rounded-lg py-3 px-4"
                        activeOpacity={0.8}
                      >
                        <Text className="text-white font-semibold text-center">
                          {showForm
                            ? 'Hide Evaluation Form'
                            : 'Submit Evaluation'}
                        </Text>
                      </TouchableOpacity>
                    )}

                    {/* Evaluation Form */}
                    {showForm && !trainee.progress.isComplete && (
                      <View className="bg-gray-700/40 border border-gray-600 rounded-lg p-4 gap-4 mt-2">
                        {/* Booking ID */}
                        <View>
                          <Text className="text-gray-300 text-xs font-semibold mb-2">
                            Booking ID (Optional)
                          </Text>
                          <TextInput
                            placeholder="Enter booking ID (optional)"
                            placeholderTextColor="#6B7280"
                            value={form.bookingId}
                            onChangeText={(text) =>
                              updateFormState(trainee.id, 'bookingId', text)
                            }
                            className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                          />
                        </View>

                        {/* Star Ratings */}
                        {RATING_CATEGORIES.map((category) => (
                          <View key={category.key} className="gap-1">
                            <Text className="text-white font-semibold text-sm">
                              {category.label}
                            </Text>
                            <Text className="text-gray-400 text-xs">
                              {category.description}
                            </Text>
                            {renderStarRating(
                              trainee.id,
                              category.key,
                              form.ratings[category.key as keyof typeof form.ratings]
                            )}
                          </View>
                        ))}

                        {/* Overall Feedback */}
                        <View>
                          <Text className="text-white font-semibold text-sm mb-1">
                            Overall Feedback*
                          </Text>
                          <TextInput
                            placeholder="Describe the trainee's performance during this session..."
                            placeholderTextColor="#6B7280"
                            multiline
                            numberOfLines={4}
                            value={form.feedback}
                            onChangeText={(text) =>
                              updateFormState(trainee.id, 'feedback', text)
                            }
                            className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                            textAlignVertical="top"
                          />
                          <Text className="text-gray-400 text-xs mt-1">
                            {form.feedback.length}/50 characters (minimum)
                          </Text>
                        </View>

                        {/* Private Notes */}
                        <View>
                          <Text className="text-gray-300 text-xs font-semibold mb-1">
                            Private Notes (not shown to trainee)
                          </Text>
                          <TextInput
                            placeholder="Add private notes..."
                            placeholderTextColor="#6B7280"
                            multiline
                            numberOfLines={3}
                            value={form.notes}
                            onChangeText={(text) =>
                              updateFormState(trainee.id, 'notes', text)
                            }
                            className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                            textAlignVertical="top"
                          />
                        </View>

                        {/* Submit Button */}
                        <TouchableOpacity
                          onPress={() => submitEvaluation(trainee.id)}
                          disabled={!canSubmit || submitting}
                          className={`rounded-lg py-3 px-4 flex-row items-center justify-center gap-2 ${
                            canSubmit && !submitting
                              ? 'bg-blue-600'
                              : 'bg-gray-700'
                          }`}
                          activeOpacity={0.8}
                        >
                          {submitting ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <>
                              <Check size={18} color="#fff" />
                              <Text
                                className={`font-semibold text-center ${
                                  canSubmit && !submitting
                                    ? 'text-white'
                                    : 'text-gray-400'
                                }`}
                              >
                                Submit Evaluation
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Completion Modal */}
        <Modal
          visible={completionModal.visible}
          transparent
          animationType="fade"
          onRequestClose={() =>
            setCompletionModal({ ...completionModal, visible: false })
          }
        >
          <View className="flex-1 bg-black/60 justify-center items-center px-4">
            <View className="bg-gray-800 rounded-lg p-6 items-center gap-4 w-full max-w-sm border border-gray-700">
              <Text className="text-4xl">🎉</Text>
              <Text className="text-white font-bold text-lg text-center">
                {completionModal.traineeName} has completed all required
                sessions!
              </Text>
              <Text className="text-gray-400 text-center text-sm">
                The admin team will review their certification.
              </Text>
              <TouchableOpacity
                onPress={() =>
                  setCompletionModal({ ...completionModal, visible: false })
                }
                className="bg-blue-600 rounded-lg py-3 px-8 w-full"
                activeOpacity={0.8}
              >
                <Text className="text-white font-semibold text-center">
                  Done
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}