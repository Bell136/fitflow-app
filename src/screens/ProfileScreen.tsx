import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase.client';
import { Session } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  age?: number;
  height?: number; // in inches
  weight?: number; // in lbs
  activity_level?: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active';
  fitness_goal?: 'lose_weight' | 'gain_muscle' | 'maintain' | 'improve_endurance' | 'general_fitness';
  created_at: string;
}

interface Goal {
  id: string;
  type: 'weight_loss' | 'weight_gain' | 'body_fat' | 'muscle_gain' | 'strength' | 'endurance';
  target_value: number;
  current_value: number;
  target_date: string;
  is_active: boolean;
  created_at: string;
}

interface UserSettings {
  notifications_enabled: boolean;
  workout_reminders: boolean;
  meal_reminders: boolean;
  progress_reminders: boolean;
  units_metric: boolean; // false = imperial, true = metric
  privacy_profile: 'public' | 'friends' | 'private';
  data_sharing: boolean;
}

export default function ProfileScreen() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [settings, setSettings] = useState<UserSettings>({
    notifications_enabled: true,
    workout_reminders: true,
    meal_reminders: true,
    progress_reminders: false,
    units_metric: false,
    privacy_profile: 'private',
    data_sharing: false,
  });
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);

  // Edit profile form states
  const [editName, setEditName] = useState('');
  const [editAge, setEditAge] = useState('');
  const [editHeight, setEditHeight] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [editActivityLevel, setEditActivityLevel] = useState<UserProfile['activity_level']>('moderately_active');
  const [editFitnessGoal, setEditFitnessGoal] = useState<UserProfile['fitness_goal']>('general_fitness');

  // New goal form states
  const [newGoalType, setNewGoalType] = useState<Goal['type']>('weight_loss');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalCurrent, setNewGoalCurrent] = useState('');
  const [newGoalDate, setNewGoalDate] = useState('');

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      if (session?.user) {
        // Load user profile - simulated data for now
        const mockProfile: UserProfile = {
          id: session.user.id,
          email: session.user.email || '',
          full_name: session.user.user_metadata?.full_name || 'Fitness Enthusiast',
          age: 28,
          height: 70, // 5'10"
          weight: 180,
          activity_level: 'moderately_active',
          fitness_goal: 'lose_weight',
          created_at: '2024-08-01T00:00:00Z',
        };
        setProfile(mockProfile);

        // Load goals - simulated data
        const mockGoals: Goal[] = [
          {
            id: '1',
            type: 'weight_loss',
            target_value: 10,
            current_value: 7.5,
            target_date: '2024-12-31',
            is_active: true,
            created_at: '2024-08-01T00:00:00Z',
          },
          {
            id: '2',
            type: 'body_fat',
            target_value: 15,
            current_value: 16.8,
            target_date: '2024-11-30',
            is_active: true,
            created_at: '2024-08-15T00:00:00Z',
          },
        ];
        setGoals(mockGoals);

        // Set edit form values
        setEditName(mockProfile.full_name || '');
        setEditAge(mockProfile.age?.toString() || '');
        setEditHeight(mockProfile.height?.toString() || '');
        setEditWeight(mockProfile.weight?.toString() || '');
        setEditActivityLevel(mockProfile.activity_level || 'moderately_active');
        setEditFitnessGoal(mockProfile.fitness_goal || 'general_fitness');
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading user data:', error);
      setLoading(false);
    }
  };

  const signOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.auth.signOut();
            if (error) {
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const saveProfile = async () => {
    try {
      const updatedProfile: UserProfile = {
        ...profile!,
        full_name: editName,
        age: editAge ? parseInt(editAge) : undefined,
        height: editHeight ? parseInt(editHeight) : undefined,
        weight: editWeight ? parseInt(editWeight) : undefined,
        activity_level: editActivityLevel,
        fitness_goal: editFitnessGoal,
      };

      setProfile(updatedProfile);
      setShowEditModal(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };

  const addGoal = () => {
    if (!newGoalTarget || !newGoalCurrent || !newGoalDate) {
      Alert.alert('Error', 'Please fill in all goal fields');
      return;
    }

    const newGoal: Goal = {
      id: Date.now().toString(),
      type: newGoalType,
      target_value: parseFloat(newGoalTarget),
      current_value: parseFloat(newGoalCurrent),
      target_date: newGoalDate,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    setGoals([...goals, newGoal]);
    setNewGoalTarget('');
    setNewGoalCurrent('');
    setNewGoalDate('');
    setShowGoalModal(false);
    Alert.alert('Success', 'Goal added successfully!');
  };

  const toggleGoal = (goalId: string) => {
    setGoals(goals.map(goal => 
      goal.id === goalId ? { ...goal, is_active: !goal.is_active } : goal
    ));
  };

  const deleteGoal = (goalId: string) => {
    Alert.alert(
      'Delete Goal',
      'Are you sure you want to delete this goal?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => setGoals(goals.filter(goal => goal.id !== goalId)),
        },
      ]
    );
  };

  const formatGoalType = (type: Goal['type']): string => {
    switch (type) {
      case 'weight_loss': return 'Weight Loss';
      case 'weight_gain': return 'Weight Gain';
      case 'body_fat': return 'Body Fat %';
      case 'muscle_gain': return 'Muscle Gain';
      case 'strength': return 'Strength';
      case 'endurance': return 'Endurance';
      default: return type;
    }
  };

  const formatActivityLevel = (level: UserProfile['activity_level']): string => {
    switch (level) {
      case 'sedentary': return 'Sedentary';
      case 'lightly_active': return 'Lightly Active';
      case 'moderately_active': return 'Moderately Active';
      case 'very_active': return 'Very Active';
      case 'extremely_active': return 'Extremely Active';
      default: return level || 'Not Set';
    }
  };

  const formatFitnessGoal = (goal: UserProfile['fitness_goal']): string => {
    switch (goal) {
      case 'lose_weight': return 'Lose Weight';
      case 'gain_muscle': return 'Gain Muscle';
      case 'maintain': return 'Maintain Weight';
      case 'improve_endurance': return 'Improve Endurance';
      case 'general_fitness': return 'General Fitness';
      default: return goal || 'Not Set';
    }
  };

  const SettingsRow = ({ 
    title, 
    subtitle, 
    icon, 
    rightElement,
    onPress 
  }: {
    title: string;
    subtitle?: string;
    icon: string;
    rightElement?: React.ReactNode;
    onPress?: () => void;
  }) => (
    <TouchableOpacity style={styles.settingsRow} onPress={onPress}>
      <View style={styles.settingsRowLeft}>
        <Ionicons name={icon as any} size={20} color="#6C757D" />
        <View style={styles.settingsRowText}>
          <Text style={styles.settingsRowTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingsRowSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {rightElement || <Ionicons name="chevron-forward" size={20} color="#ADB5BD" />}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {profile?.full_name?.split(' ').map(n => n[0]).join('') || 'FE'}
              </Text>
            </View>
          </View>
          <Text style={styles.profileName}>{profile?.full_name || 'Fitness Enthusiast'}</Text>
          <Text style={styles.profileEmail}>{profile?.email}</Text>
          <Text style={styles.profileJoinDate}>
            Member since {new Date(profile?.created_at || '').toLocaleDateString('en-US', { 
              month: 'long', 
              year: 'numeric' 
            })}
          </Text>
          <TouchableOpacity style={styles.editProfileButton} onPress={() => setShowEditModal(true)}>
            <Text style={styles.editProfileButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Stats */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Profile Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile?.age || '--'}</Text>
              <Text style={styles.statLabel}>Age</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {profile?.height ? `${Math.floor(profile.height / 12)}'${profile.height % 12}"` : '--'}
              </Text>
              <Text style={styles.statLabel}>Height</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile?.weight || '--'} lbs</Text>
              <Text style={styles.statLabel}>Weight</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatActivityLevel(profile?.activity_level)}</Text>
              <Text style={styles.statLabel}>Activity</Text>
            </View>
          </View>
        </View>

        {/* Goals Management */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>My Goals</Text>
            <TouchableOpacity onPress={() => setShowGoalModal(true)}>
              <Ionicons name="add-circle" size={24} color="#0066CC" />
            </TouchableOpacity>
          </View>
          {goals.length > 0 ? (
            goals.map((goal) => (
              <View key={goal.id} style={styles.goalItem}>
                <View style={styles.goalHeader}>
                  <Text style={styles.goalType}>{formatGoalType(goal.type)}</Text>
                  <View style={styles.goalActions}>
                    <Switch
                      value={goal.is_active}
                      onValueChange={() => toggleGoal(goal.id)}
                      trackColor={{ false: '#E9ECEF', true: '#0066CC40' }}
                      thumbColor={goal.is_active ? '#0066CC' : '#CED4DA'}
                    />
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => deleteGoal(goal.id)}
                    >
                      <Ionicons name="trash" size={16} color="#E03131" />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.goalProgress}>
                  <View 
                    style={[
                      styles.goalProgressBar, 
                      { width: `${(goal.current_value / goal.target_value) * 100}%` }
                    ]} 
                  />
                </View>
                <Text style={styles.goalText}>
                  {goal.current_value} / {goal.target_value} {goal.type.includes('weight') ? 'lbs' : goal.type === 'body_fat' ? '%' : 'units'}
                </Text>
                <Text style={styles.goalDate}>Target: {new Date(goal.target_date).toLocaleDateString()}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.noGoalsText}>No goals set yet. Tap + to add your first goal!</Text>
          )}
        </View>

        {/* Account Settings */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account Settings</Text>
          <SettingsRow
            title="Personal Information"
            subtitle="Update your profile details"
            icon="person"
            onPress={() => setShowEditModal(true)}
          />
          <SettingsRow
            title="Fitness Preferences"
            subtitle={formatFitnessGoal(profile?.fitness_goal)}
            icon="fitness"
            onPress={() => Alert.alert('Coming Soon', 'Fitness preferences will be available soon!')}
          />
          <SettingsRow
            title="Unit Preferences"
            subtitle={settings.units_metric ? 'Metric (kg, cm)' : 'Imperial (lbs, inches)'}
            icon="speedometer"
            rightElement={
              <Switch
                value={settings.units_metric}
                onValueChange={(value) => setSettings({...settings, units_metric: value})}
                trackColor={{ false: '#E9ECEF', true: '#0066CC40' }}
                thumbColor={settings.units_metric ? '#0066CC' : '#CED4DA'}
              />
            }
          />
        </View>

        {/* Notification Settings */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Notifications</Text>
          <SettingsRow
            title="Push Notifications"
            subtitle="Enable all notifications"
            icon="notifications"
            rightElement={
              <Switch
                value={settings.notifications_enabled}
                onValueChange={(value) => setSettings({...settings, notifications_enabled: value})}
                trackColor={{ false: '#E9ECEF', true: '#0066CC40' }}
                thumbColor={settings.notifications_enabled ? '#0066CC' : '#CED4DA'}
              />
            }
          />
          <SettingsRow
            title="Workout Reminders"
            subtitle="Get reminded to work out"
            icon="barbell"
            rightElement={
              <Switch
                value={settings.workout_reminders}
                onValueChange={(value) => setSettings({...settings, workout_reminders: value})}
                trackColor={{ false: '#E9ECEF', true: '#0066CC40' }}
                thumbColor={settings.workout_reminders ? '#0066CC' : '#CED4DA'}
              />
            }
          />
          <SettingsRow
            title="Meal Reminders"
            subtitle="Get reminded to log meals"
            icon="restaurant"
            rightElement={
              <Switch
                value={settings.meal_reminders}
                onValueChange={(value) => setSettings({...settings, meal_reminders: value})}
                trackColor={{ false: '#E9ECEF', true: '#0066CC40' }}
                thumbColor={settings.meal_reminders ? '#0066CC' : '#CED4DA'}
              />
            }
          />
          <SettingsRow
            title="Progress Reminders"
            subtitle="Weekly progress check-ins"
            icon="trending-up"
            rightElement={
              <Switch
                value={settings.progress_reminders}
                onValueChange={(value) => setSettings({...settings, progress_reminders: value})}
                trackColor={{ false: '#E9ECEF', true: '#0066CC40' }}
                thumbColor={settings.progress_reminders ? '#0066CC' : '#CED4DA'}
              />
            }
          />
        </View>

        {/* Privacy & Data */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Privacy & Data</Text>
          <SettingsRow
            title="Profile Privacy"
            subtitle={settings.privacy_profile === 'public' ? 'Public' : 
                     settings.privacy_profile === 'friends' ? 'Friends Only' : 'Private'}
            icon="shield"
            onPress={() => Alert.alert('Coming Soon', 'Privacy settings will be available soon!')}
          />
          <SettingsRow
            title="Data Sharing"
            subtitle="Share anonymous data for research"
            icon="analytics"
            rightElement={
              <Switch
                value={settings.data_sharing}
                onValueChange={(value) => setSettings({...settings, data_sharing: value})}
                trackColor={{ false: '#E9ECEF', true: '#0066CC40' }}
                thumbColor={settings.data_sharing ? '#0066CC' : '#CED4DA'}
              />
            }
          />
          <SettingsRow
            title="Export Data"
            subtitle="Download your fitness data"
            icon="download"
            onPress={() => Alert.alert('Coming Soon', 'Data export will be available soon!')}
          />
        </View>

        {/* Support & About */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Support & About</Text>
          <SettingsRow
            title="Help Center"
            subtitle="Get help and support"
            icon="help-circle"
            onPress={() => Alert.alert('Coming Soon', 'Help center will be available soon!')}
          />
          <SettingsRow
            title="Send Feedback"
            subtitle="Help us improve FitFlow"
            icon="chatbubble"
            onPress={() => Alert.alert('Coming Soon', 'Feedback will be available soon!')}
          />
          <SettingsRow
            title="Privacy Policy"
            subtitle="View our privacy policy"
            icon="document-text"
            onPress={() => Alert.alert('Coming Soon', 'Privacy policy will be available soon!')}
          />
          <SettingsRow
            title="Terms of Service"
            subtitle="View terms and conditions"
            icon="document"
            onPress={() => Alert.alert('Coming Soon', 'Terms of service will be available soon!')}
          />
        </View>

        {/* App Info & Sign Out */}
        <View style={styles.card}>
          <SettingsRow
            title="App Version"
            subtitle="1.0.0 (Sprint 2)"
            icon="information-circle"
          />
          <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
            <Ionicons name="log-out" size={20} color="#E03131" />
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color="#6C757D" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={editName}
                onChangeText={setEditName}
                placeholder="Enter your full name"
              />

              <Text style={styles.inputLabel}>Age</Text>
              <TextInput
                style={styles.input}
                value={editAge}
                onChangeText={setEditAge}
                keyboardType="numeric"
                placeholder="Enter your age"
              />

              <Text style={styles.inputLabel}>Height (inches)</Text>
              <TextInput
                style={styles.input}
                value={editHeight}
                onChangeText={setEditHeight}
                keyboardType="numeric"
                placeholder="Enter height in inches (e.g., 70 for 5'10)"
              />

              <Text style={styles.inputLabel}>Current Weight (lbs)</Text>
              <TextInput
                style={styles.input}
                value={editWeight}
                onChangeText={setEditWeight}
                keyboardType="numeric"
                placeholder="Enter your current weight"
              />

              <Text style={styles.inputLabel}>Activity Level</Text>
              <View style={styles.pickerContainer}>
                {(['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extremely_active'] as const).map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.pickerOption,
                      editActivityLevel === level && styles.pickerOptionSelected
                    ]}
                    onPress={() => setEditActivityLevel(level)}
                  >
                    <Text style={[
                      styles.pickerOptionText,
                      editActivityLevel === level && styles.pickerOptionTextSelected
                    ]}>
                      {formatActivityLevel(level)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Primary Fitness Goal</Text>
              <View style={styles.pickerContainer}>
                {(['lose_weight', 'gain_muscle', 'maintain', 'improve_endurance', 'general_fitness'] as const).map((goal) => (
                  <TouchableOpacity
                    key={goal}
                    style={[
                      styles.pickerOption,
                      editFitnessGoal === goal && styles.pickerOptionSelected
                    ]}
                    onPress={() => setEditFitnessGoal(goal)}
                  >
                    <Text style={[
                      styles.pickerOptionText,
                      editFitnessGoal === goal && styles.pickerOptionTextSelected
                    ]}>
                      {formatFitnessGoal(goal)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={saveProfile}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Goal Modal */}
      <Modal visible={showGoalModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Goal</Text>
              <TouchableOpacity onPress={() => setShowGoalModal(false)}>
                <Ionicons name="close" size={24} color="#6C757D" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Goal Type</Text>
              <View style={styles.pickerContainer}>
                {(['weight_loss', 'weight_gain', 'body_fat', 'muscle_gain', 'strength', 'endurance'] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.pickerOption,
                      newGoalType === type && styles.pickerOptionSelected
                    ]}
                    onPress={() => setNewGoalType(type)}
                  >
                    <Text style={[
                      styles.pickerOptionText,
                      newGoalType === type && styles.pickerOptionTextSelected
                    ]}>
                      {formatGoalType(type)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Target Value</Text>
              <TextInput
                style={styles.input}
                value={newGoalTarget}
                onChangeText={setNewGoalTarget}
                keyboardType="numeric"
                placeholder="Enter target value"
              />

              <Text style={styles.inputLabel}>Current Value</Text>
              <TextInput
                style={styles.input}
                value={newGoalCurrent}
                onChangeText={setNewGoalCurrent}
                keyboardType="numeric"
                placeholder="Enter current value"
              />

              <Text style={styles.inputLabel}>Target Date</Text>
              <TextInput
                style={styles.input}
                value={newGoalDate}
                onChangeText={setNewGoalDate}
                placeholder="YYYY-MM-DD"
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowGoalModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={addGoal}>
                <Text style={styles.saveButtonText}>Add Goal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  profileHeader: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    marginBottom: 15,
  },
  avatarContainer: {
    marginBottom: 15,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0066CC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 16,
    color: '#6C757D',
    marginBottom: 4,
  },
  profileJoinDate: {
    fontSize: 14,
    color: '#ADB5BD',
    marginBottom: 20,
  },
  editProfileButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#0066CC',
  },
  editProfileButtonText: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6C757D',
  },
  goalItem: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  goalType: {
    fontSize: 16,
    fontWeight: '500',
    color: '#212529',
  },
  goalActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    marginLeft: 10,
    padding: 5,
  },
  goalProgress: {
    height: 8,
    backgroundColor: '#E9ECEF',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  goalProgressBar: {
    height: '100%',
    backgroundColor: '#0066CC',
    borderRadius: 4,
  },
  goalText: {
    fontSize: 14,
    color: '#212529',
    marginBottom: 4,
  },
  goalDate: {
    fontSize: 12,
    color: '#6C757D',
  },
  noGoalsText: {
    fontSize: 14,
    color: '#6C757D',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  settingsRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingsRowText: {
    marginLeft: 12,
    flex: 1,
  },
  settingsRowTitle: {
    fontSize: 16,
    color: '#212529',
  },
  settingsRowSubtitle: {
    fontSize: 14,
    color: '#6C757D',
    marginTop: 2,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    marginTop: 10,
    borderRadius: 8,
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FED7D7',
  },
  signOutButtonText: {
    fontSize: 16,
    color: '#E03131',
    fontWeight: '500',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#212529',
    marginTop: 15,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#212529',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 8,
    overflow: 'hidden',
  },
  pickerOption: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  pickerOptionSelected: {
    backgroundColor: '#E8F4FD',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#212529',
  },
  pickerOptionTextSelected: {
    color: '#0066CC',
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    marginRight: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6C757D',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 10,
    borderRadius: 8,
    backgroundColor: '#0066CC',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});