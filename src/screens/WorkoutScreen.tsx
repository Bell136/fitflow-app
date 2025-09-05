import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { workoutService, Exercise, WorkoutSession } from '../services/workout.service';

interface WorkoutExercise {
  id?: string;
  exercise: Exercise;
  sets: WorkoutSet[];
}

interface WorkoutSet {
  setNumber: number;
  weight: string;
  reps: string;
  completed: boolean;
}

const CATEGORIES = ['All', 'Chest', 'Back', 'Legs', 'Arms', 'Shoulders', 'Core'];

export default function WorkoutScreen() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentWorkout, setCurrentWorkout] = useState<WorkoutExercise[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [workoutTime, setWorkoutTime] = useState(0);
  const [currentWorkoutSession, setCurrentWorkoutSession] = useState<WorkoutSession | null>(null);
  const [recentWorkouts, setRecentWorkouts] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadExercises();
  }, [selectedCategory, searchQuery]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isWorkoutActive && startTime) {
      interval = setInterval(() => {
        const now = new Date();
        const diff = now.getTime() - startTime.getTime();
        setWorkoutTime(Math.floor(diff / 1000));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isWorkoutActive, startTime]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadExercises(),
        loadRecentWorkouts()
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadExercises = async () => {
    if (searchQuery) {
      setLoadingExercises(true);
      const searchResults = await workoutService.searchExercises(searchQuery);
      setExercises(searchResults);
      setLoadingExercises(false);
    } else {
      setLoadingExercises(true);
      const exerciseData = await workoutService.getExercises(selectedCategory);
      setExercises(exerciseData);
      setLoadingExercises(false);
    }
  };

  const loadRecentWorkouts = async () => {
    const recent = await workoutService.getRecentWorkouts(5);
    setRecentWorkouts(recent);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const addExerciseToWorkout = (exercise: Exercise) => {
    const newWorkoutExercise: WorkoutExercise = {
      exercise,
      sets: [
        { setNumber: 1, weight: '', reps: '', completed: false },
        { setNumber: 2, weight: '', reps: '', completed: false },
        { setNumber: 3, weight: '', reps: '', completed: false },
      ]
    };
    setCurrentWorkout([...currentWorkout, newWorkoutExercise]);
    setShowAddModal(false);
  };

  const removeExerciseFromWorkout = (index: number) => {
    setCurrentWorkout(currentWorkout.filter((_, i) => i !== index));
  };

  const updateSet = (exerciseIndex: number, setIndex: number, field: 'weight' | 'reps', value: string) => {
    const updatedWorkout = [...currentWorkout];
    updatedWorkout[exerciseIndex].sets[setIndex][field] = value;
    setCurrentWorkout(updatedWorkout);
  };

  const toggleSetCompleted = (exerciseIndex: number, setIndex: number) => {
    const updatedWorkout = [...currentWorkout];
    updatedWorkout[exerciseIndex].sets[setIndex].completed = !updatedWorkout[exerciseIndex].sets[setIndex].completed;
    setCurrentWorkout(updatedWorkout);
  };

  const startWorkout = async () => {
    try {
      const now = new Date();
      const workoutSession = await workoutService.createWorkout({
        name: 'Workout Session',
        start_time: now.toISOString(),
        notes: ''
      });
      
      if (workoutSession) {
        setCurrentWorkoutSession(workoutSession);
        setIsWorkoutActive(true);
        setStartTime(now);
        setWorkoutTime(0);
      } else {
        Alert.alert('Error', 'Failed to create workout session. Please try again.');
      }
    } catch (error) {
      console.error('Error starting workout:', error);
      Alert.alert('Error', 'Failed to start workout. Please try again.');
    }
  };

  const finishWorkout = async () => {
    if (!currentWorkoutSession || !startTime) {
      Alert.alert('Error', 'No active workout session found.');
      return;
    }

    try {
      const endTime = new Date();
      const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
      
      // Save workout exercises and sets to database
      for (const workoutExercise of currentWorkout) {
        const workoutExerciseId = await workoutService.addExerciseToWorkout(
          currentWorkoutSession.id!,
          workoutExercise.exercise.id
        );
        
        if (workoutExerciseId) {
          for (const set of workoutExercise.sets) {
            if (set.weight && set.reps) {
              await workoutService.addSet(workoutExerciseId, {
                set_number: set.setNumber,
                weight: parseFloat(set.weight) || 0,
                reps: parseInt(set.reps) || 0,
                completed: set.completed
              });
            }
          }
        }
      }
      
      // Finish the workout session
      const success = await workoutService.finishWorkout(
        currentWorkoutSession.id!,
        endTime.toISOString(),
        duration
      );
      
      if (success) {
        Alert.alert(
          'Workout Complete!',
          `Great job! You worked out for ${formatTime(duration)}.`,
          [{ text: 'OK', onPress: () => {
            setIsWorkoutActive(false);
            setCurrentWorkout([]);
            setCurrentWorkoutSession(null);
            setStartTime(null);
            setWorkoutTime(0);
            loadRecentWorkouts();
          }}]
        );
      } else {
        Alert.alert('Error', 'Failed to save workout. Please try again.');
      }
    } catch (error) {
      console.error('Error finishing workout:', error);
      Alert.alert('Error', 'Failed to save workout. Please try again.');
    }
  };

  const CategoryPill = ({ category }: { category: string }) => (
    <TouchableOpacity
      style={[
        styles.categoryPill,
        selectedCategory === category && styles.categoryPillActive
      ]}
      onPress={() => setSelectedCategory(category)}
    >
      <Text style={[
        styles.categoryPillText,
        selectedCategory === category && styles.categoryPillTextActive
      ]}>
        {category}
      </Text>
    </TouchableOpacity>
  );

  const ExerciseCard = ({ exercise, onAdd }: { exercise: Exercise; onAdd: () => void }) => (
    <TouchableOpacity style={styles.exerciseCard} onPress={onAdd}>
      <View style={styles.exerciseInfo}>
        <Text style={styles.exerciseName}>{exercise.name}</Text>
        <View style={styles.exerciseTags}>
          <Text style={styles.exerciseTag}>{exercise.primary_muscle}</Text>
          <Text style={styles.exerciseTag}>{exercise.equipment}</Text>
        </View>
      </View>
      <Ionicons name="add-circle" size={24} color="#0066CC" />
    </TouchableOpacity>
  );

  const WorkoutExerciseCard = ({ workoutExercise, index }: { workoutExercise: WorkoutExercise; index: number }) => (
    <View style={styles.workoutExerciseCard}>
      <View style={styles.workoutExerciseHeader}>
        <Text style={styles.workoutExerciseName}>{workoutExercise.exercise.name}</Text>
        <TouchableOpacity onPress={() => removeExerciseFromWorkout(index)}>
          <Ionicons name="close-circle" size={24} color="#E03131" />
        </TouchableOpacity>
      </View>
      <View style={styles.setsContainer}>
        {workoutExercise.sets.map((set, setIndex) => (
          <View key={setIndex} style={styles.setRow}>
            <TouchableOpacity 
              style={[styles.setCheckbox, set.completed && styles.setCheckboxCompleted]}
              onPress={() => toggleSetCompleted(index, setIndex)}
            >
              {set.completed && <Ionicons name="checkmark" size={16} color="#fff" />}
            </TouchableOpacity>
            <Text style={styles.setLabel}>Set {set.setNumber}</Text>
            <TextInput
              style={[styles.input, set.completed && styles.inputCompleted]}
              placeholder="Weight"
              keyboardType="numeric"
              placeholderTextColor="#ADB5BD"
              value={set.weight}
              onChangeText={(value) => updateSet(index, setIndex, 'weight', value)}
              editable={isWorkoutActive}
            />
            <Text style={styles.x}>×</Text>
            <TextInput
              style={[styles.input, set.completed && styles.inputCompleted]}
              placeholder="Reps"
              keyboardType="numeric"
              placeholderTextColor="#ADB5BD"
              value={set.reps}
              onChangeText={(value) => updateSet(index, setIndex, 'reps', value)}
              editable={isWorkoutActive}
            />
          </View>
        ))}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Loading workout data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Current Workout Section */}
      {currentWorkout.length > 0 && (
        <View style={styles.currentWorkoutSection}>
          <View style={styles.workoutHeader}>
            <Text style={styles.workoutTitle}>Current Workout</Text>
            {!isWorkoutActive ? (
              <TouchableOpacity style={styles.startButton} onPress={startWorkout}>
                <Ionicons name="play" size={20} color="#fff" />
                <Text style={styles.startButtonText}>Start</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.finishButton} onPress={finishWorkout}>
                <Ionicons name="checkmark" size={20} color="#fff" />
                <Text style={styles.finishButtonText}>Finish</Text>
              </TouchableOpacity>
            )}
          </View>
          {isWorkoutActive && (
            <View style={styles.timerContainer}>
              <Ionicons name="time" size={20} color="#00A67E" />
              <Text style={styles.timerText}>{formatTime(workoutTime)}</Text>
            </View>
          )}
          <ScrollView style={styles.workoutExercisesList}>
            {currentWorkout.map((workoutExercise, index) => (
              <WorkoutExerciseCard key={index} workoutExercise={workoutExercise} index={index} />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Add Exercise Button */}
      <TouchableOpacity 
        style={styles.addExerciseButton}
        onPress={() => setShowAddModal(true)}
      >
        <Ionicons name="add" size={24} color="#fff" />
        <Text style={styles.addExerciseText}>Add Exercise</Text>
      </TouchableOpacity>

      {/* Recent Workouts */}
      <View style={styles.recentSection}>
        <Text style={styles.sectionTitle}>Recent Workouts</Text>
        {recentWorkouts.length > 0 ? (
          recentWorkouts.map((workout, index) => {
            const workoutDate = new Date(workout.created_at || workout.start_time);
            const today = new Date();
            const diffTime = today.getTime() - workoutDate.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            let dateText = '';
            if (diffDays === 0) {
              dateText = 'Today';
            } else if (diffDays === 1) {
              dateText = 'Yesterday';
            } else {
              dateText = `${diffDays} days ago`;
            }
            
            const duration = workout.duration ? Math.floor(workout.duration / 60) : 0;
            
            return (
              <View key={workout.id} style={styles.recentWorkout}>
                <View>
                  <Text style={styles.recentWorkoutTitle}>{workout.name}</Text>
                  <Text style={styles.recentWorkoutDate}>
                    {dateText} {duration > 0 && `• ${duration} min`}
                  </Text>
                </View>
                <TouchableOpacity>
                  <Ionicons name="chevron-forward" size={24} color="#6C757D" />
                </TouchableOpacity>
              </View>
            );
          })
        ) : (
          <Text style={styles.emptyText}>No recent workouts found</Text>
        )}
      </View>

      {/* Exercise Database Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={showAddModal}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Exercise Database</Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Ionicons name="close" size={28} color="#212529" />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#6C757D" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search exercises..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#ADB5BD"
            />
          </View>

          {/* Categories */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesContainer}
          >
            {CATEGORIES.map(category => (
              <CategoryPill key={category} category={category} />
            ))}
          </ScrollView>

          {/* Exercise List */}
          {loadingExercises ? (
            <View style={styles.exerciseLoadingContainer}>
              <ActivityIndicator size="small" color="#0066CC" />
              <Text style={styles.exerciseLoadingText}>Loading exercises...</Text>
            </View>
          ) : (
            <FlatList
              data={exercises}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <ExerciseCard 
                  exercise={item}
                  onAdd={() => addExerciseToWorkout(item)}
                />
              )}
              contentContainerStyle={styles.exerciseList}
              ListEmptyComponent={
                <View style={styles.emptyExerciseList}>
                  <Text style={styles.emptyExerciseText}>No exercises found</Text>
                  <Text style={styles.emptyExerciseSubtext}>Try searching for a different exercise or category</Text>
                </View>
              }
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F8',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F6F8',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6C757D',
  },
  currentWorkoutSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    maxHeight: 400,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  workoutTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00A67E',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  finishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0066CC',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  finishButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  timerText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#00A67E',
    marginLeft: 8,
  },
  workoutExercisesList: {
    maxHeight: 300,
  },
  workoutExerciseCard: {
    backgroundColor: '#F4F6F8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  workoutExerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  workoutExerciseName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#212529',
  },
  setsContainer: {
    gap: 8,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  setCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E9ECEF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  setCheckboxCompleted: {
    backgroundColor: '#00A67E',
    borderColor: '#00A67E',
  },
  setLabel: {
    fontSize: 14,
    color: '#6C757D',
    width: 50,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  inputCompleted: {
    backgroundColor: '#F8F9FA',
    color: '#6C757D',
  },
  x: {
    fontSize: 16,
    color: '#6C757D',
    marginHorizontal: 4,
  },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0066CC',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  addExerciseText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  recentSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 16,
  },
  recentWorkout: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  recentWorkoutTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#212529',
  },
  recentWorkoutDate: {
    fontSize: 14,
    color: '#6C757D',
    marginTop: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#6C757D',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F4F6F8',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212529',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#212529',
  },
  categoriesContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
    maxHeight: 50,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  categoryPillActive: {
    backgroundColor: '#0066CC',
    borderColor: '#0066CC',
  },
  categoryPillText: {
    fontSize: 14,
    color: '#6C757D',
  },
  categoryPillTextActive: {
    color: '#fff',
  },
  exerciseList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  exerciseLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  exerciseLoadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6C757D',
  },
  emptyExerciseList: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyExerciseText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6C757D',
    marginBottom: 8,
  },
  emptyExerciseSubtext: {
    fontSize: 14,
    color: '#ADB5BD',
    textAlign: 'center',
  },
  exerciseCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#212529',
    marginBottom: 6,
  },
  exerciseTags: {
    flexDirection: 'row',
    gap: 8,
  },
  exerciseTag: {
    fontSize: 12,
    color: '#6C757D',
    backgroundColor: '#F4F6F8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
});