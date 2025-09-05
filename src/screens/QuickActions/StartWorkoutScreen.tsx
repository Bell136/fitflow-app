import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { workoutService } from '../../services/workout.service';

interface WorkoutTemplate {
  id: string;
  name: string;
  description: string;
  exercises: number;
  duration: number;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  icon: string;
}

const workoutTemplates: WorkoutTemplate[] = [
  {
    id: '1',
    name: 'Quick Full Body',
    description: 'A balanced workout hitting all major muscle groups',
    exercises: 6,
    duration: 30,
    difficulty: 'Beginner',
    icon: 'body',
  },
  {
    id: '2',
    name: 'Upper Body Strength',
    description: 'Focus on chest, back, shoulders, and arms',
    exercises: 8,
    duration: 45,
    difficulty: 'Intermediate',
    icon: 'barbell',
  },
  {
    id: '3',
    name: 'Lower Body Power',
    description: 'Legs and glutes focused workout',
    exercises: 7,
    duration: 40,
    difficulty: 'Intermediate',
    icon: 'footsteps',
  },
  {
    id: '4',
    name: 'Core Crusher',
    description: 'Intense ab and core workout',
    exercises: 5,
    duration: 20,
    difficulty: 'Advanced',
    icon: 'fitness',
  },
  {
    id: '5',
    name: 'Custom Workout',
    description: 'Create your own workout from scratch',
    exercises: 0,
    duration: 0,
    difficulty: 'Beginner',
    icon: 'add-circle',
  },
];

export default function StartWorkoutScreen() {
  const navigation = useNavigation();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const handleStartWorkout = async (template: WorkoutTemplate) => {
    try {
      if (template.id === '5') {
        // Navigate to custom workout builder
        navigation.navigate('WorkoutBuilder' as never);
        return;
      }

      const workout = await workoutService.createWorkout({
        name: template.name,
        start_time: new Date().toISOString(),
        notes: template.description,
      });

      if (workout) {
        Alert.alert(
          'Workout Started',
          `${template.name} has been started. Track your progress in the Workout tab.`,
          [
            {
              text: 'Go to Workout',
              onPress: () => navigation.navigate('Workout' as never),
            },
            { text: 'OK' },
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to start workout. Please try again.');
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner':
        return '#00A67E';
      case 'Intermediate':
        return '#FFA500';
      case 'Advanced':
        return '#E03131';
      default:
        return '#6C757D';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#212529" />
        </TouchableOpacity>
        <Text style={styles.title}>Start Workout</Text>
      </View>

      <Text style={styles.subtitle}>
        Choose a workout template or create your own
      </Text>

      <View style={styles.templatesContainer}>
        {workoutTemplates.map((template) => (
          <TouchableOpacity
            key={template.id}
            style={[
              styles.templateCard,
              selectedTemplate === template.id && styles.selectedCard,
            ]}
            onPress={() => setSelectedTemplate(template.id)}
            activeOpacity={0.7}
          >
            <View style={styles.templateHeader}>
              <View style={styles.templateIcon}>
                <Ionicons
                  name={template.icon as any}
                  size={28}
                  color="#0066CC"
                />
              </View>
              <View style={styles.templateInfo}>
                <Text style={styles.templateName}>{template.name}</Text>
                <Text style={styles.templateDescription}>
                  {template.description}
                </Text>
              </View>
            </View>

            <View style={styles.templateStats}>
              <View style={styles.statItem}>
                <Ionicons name="list" size={16} color="#6C757D" />
                <Text style={styles.statText}>{template.exercises} exercises</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="time" size={16} color="#6C757D" />
                <Text style={styles.statText}>{template.duration} min</Text>
              </View>
              <View style={styles.statItem}>
                <View
                  style={[
                    styles.difficultyBadge,
                    { backgroundColor: getDifficultyColor(template.difficulty) + '20' },
                  ]}
                >
                  <Text
                    style={[
                      styles.difficultyText,
                      { color: getDifficultyColor(template.difficulty) },
                    ]}
                  >
                    {template.difficulty}
                  </Text>
                </View>
              </View>
            </View>

            {selectedTemplate === template.id && (
              <TouchableOpacity
                style={styles.startButton}
                onPress={() => handleStartWorkout(template)}
              >
                <Text style={styles.startButtonText}>
                  {template.id === '5' ? 'Create Workout' : 'Start Workout'}
                </Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.recentWorkouts}>
        <Text style={styles.sectionTitle}>Recent Workouts</Text>
        <Text style={styles.emptyText}>
          Your recent workouts will appear here
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  backButton: {
    marginRight: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212529',
  },
  subtitle: {
    fontSize: 14,
    color: '#6C757D',
    paddingHorizontal: 20,
    marginTop: 15,
    marginBottom: 10,
  },
  templatesContainer: {
    padding: 20,
  },
  templateCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedCard: {
    borderColor: '#0066CC',
    borderWidth: 2,
  },
  templateHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  templateIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E8F4FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  templateDescription: {
    fontSize: 13,
    color: '#6C757D',
    lineHeight: 18,
  },
  templateStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  statText: {
    fontSize: 12,
    color: '#6C757D',
    marginLeft: 4,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: '600',
  },
  startButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0066CC',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 8,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  recentWorkouts: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 14,
    color: '#ADB5BD',
    textAlign: 'center',
    padding: 20,
  },
});