import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { photoService } from '../services/photo.service';
import { 
  progressService, 
  BodyMeasurement, 
  WellnessRating, 
  ProgressPhoto,
  GoalProgress 
} from '../services/progress.service';

const screenWidth = Dimensions.get('window').width;

export default function ProgressScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'measurements' | 'photos' | 'wellness'>('measurements');
  const [showAddModal, setShowAddModal] = useState(false);
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [wellnessRatings, setWellnessRatings] = useState<WellnessRating[]>([]);
  const [progressPhotos, setProgressPhotos] = useState<ProgressPhoto[]>([]);
  const [goals, setGoals] = useState<GoalProgress[]>([]);

  // Form states for adding new entries
  const [newWeight, setNewWeight] = useState('');
  const [newBodyFat, setNewBodyFat] = useState('');
  const [newChest, setNewChest] = useState('');
  const [newWaist, setNewWaist] = useState('');
  const [newHips, setNewHips] = useState('');
  const [newArms, setNewArms] = useState('');
  const [newThighs, setNewThighs] = useState('');

  // Wellness form states
  const [moodRating, setMoodRating] = useState(5);
  const [energyRating, setEnergyRating] = useState(5);
  const [sleepRating, setSleepRating] = useState(5);
  const [stressRating, setStressRating] = useState(5);

  useEffect(() => {
    loadProgressData();
  }, []);

  const loadProgressData = async () => {
    try {
      const [
        measurementsData,
        wellnessData,
        photosData,
        goalsData
      ] = await Promise.all([
        progressService.getMeasurements(undefined, 10),
        progressService.getWellnessHistory(30),
        progressService.getProgressPhotos(undefined, 5),
        progressService.getGoals(true)
      ]);

      setMeasurements(measurementsData);
      setWellnessRatings(wellnessData);
      setProgressPhotos(photosData);
      setGoals(goalsData);
    } catch (error) {
      console.error('Error loading progress data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProgressData();
    setRefreshing(false);
  };

  const handlePhotoUpload = async () => {
    try {
      Alert.alert(
        'Add Progress Photo',
        'Choose an option',
        [
          { text: 'Take Photo', onPress: () => uploadPhoto('camera') },
          { text: 'Choose from Library', onPress: () => uploadPhoto('library') },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } catch (error) {
      console.error('Error handling photo upload:', error);
    }
  };

  const uploadPhoto = async (source: 'camera' | 'library') => {
    try {
      let photoUri: string | null = null;
      
      if (source === 'camera') {
        photoUri = await photoService.takePhoto('progress');
      } else {
        photoUri = await photoService.pickImage('progress');
      }
      
      if (photoUri) {
        setLoading(true);
        
        // Upload to Supabase Storage
        const photoPath = await photoService.uploadPhoto(photoUri, 'progress');
        
        if (photoPath) {
          // Save photo record to database
          const photoType = await promptPhotoType();
          if (photoType) {
            await progressService.addProgressPhoto({
              photo_url: photoPath,
              photo_type: photoType,
              taken_at: new Date().toISOString(),
              notes: ''
            });
            
            Alert.alert('Success', 'Progress photo uploaded successfully!');
            await loadProgressData(); // Reload photos
          }
        }
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      Alert.alert('Error', 'Failed to upload photo');
    } finally {
      setLoading(false);
    }
  };

  const promptPhotoType = async (): Promise<string | null> => {
    return new Promise((resolve) => {
      Alert.alert(
        'Photo Type',
        'What type of progress photo is this?',
        [
          { text: 'Front', onPress: () => resolve('front') },
          { text: 'Side', onPress: () => resolve('side') },
          { text: 'Back', onPress: () => resolve('back') },
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) }
        ]
      );
    });
  };

  const addMeasurement = async () => {
    if (!newWeight) {
      Alert.alert('Error', 'Please enter at least your weight');
      return;
    }

    const today = new Date().toISOString();
    const measurementsToAdd: Array<Omit<BodyMeasurement, 'id' | 'user_id' | 'created_at'>> = [
      {
        measurement_type: 'weight',
        value: parseFloat(newWeight),
        unit: 'lbs',
        measured_at: today
      }
    ];

    if (newBodyFat) {
      measurementsToAdd.push({
        measurement_type: 'body_fat',
        value: parseFloat(newBodyFat),
        unit: '%',
        measured_at: today
      });
    }

    if (newChest) {
      measurementsToAdd.push({
        measurement_type: 'chest',
        value: parseFloat(newChest),
        unit: 'in',
        measured_at: today
      });
    }

    if (newWaist) {
      measurementsToAdd.push({
        measurement_type: 'waist',
        value: parseFloat(newWaist),
        unit: 'in',
        measured_at: today
      });
    }

    if (newHips) {
      measurementsToAdd.push({
        measurement_type: 'hips',
        value: parseFloat(newHips),
        unit: 'in',
        measured_at: today
      });
    }

    if (newArms) {
      measurementsToAdd.push({
        measurement_type: 'bicep',
        value: parseFloat(newArms),
        unit: 'in',
        measured_at: today
      });
    }

    if (newThighs) {
      measurementsToAdd.push({
        measurement_type: 'thigh',
        value: parseFloat(newThighs),
        unit: 'in',
        measured_at: today
      });
    }

    try {
      const savedMeasurements: BodyMeasurement[] = [];
      for (const measurement of measurementsToAdd) {
        const saved = await progressService.logMeasurement(measurement);
        if (saved) {
          savedMeasurements.push(saved);
        }
      }

      if (savedMeasurements.length > 0) {
        setMeasurements([...savedMeasurements, ...measurements]);
        clearMeasurementForm();
        setShowAddModal(false);
        Alert.alert('Success', 'Measurements saved successfully!');
      } else {
        Alert.alert('Error', 'Failed to save measurements. Please try again.');
      }
    } catch (error) {
      console.error('Error saving measurements:', error);
      Alert.alert('Error', 'Failed to save measurements. Please try again.');
    }
  };

  const addWellnessRating = async () => {
    const today = new Date().toISOString().split('T')[0];
    
    try {
      const wellnessData: Omit<WellnessRating, 'id' | 'user_id' | 'created_at'> = {
        date: today,
        mood_rating: moodRating,
        energy_rating: energyRating,
        sleep_quality: sleepRating,
        stress_level: stressRating,
        motivation_level: 5, // Default value
        soreness_level: 3, // Default value
        notes: ''
      };

      const savedRating = await progressService.logWellnessRating(wellnessData);
      
      if (savedRating) {
        // Update or add to wellness ratings
        const updatedRatings = wellnessRatings.filter(r => r.date !== today);
        setWellnessRatings([savedRating, ...updatedRatings]);
        setShowAddModal(false);
        Alert.alert('Success', 'Wellness check-in saved!');
      } else {
        Alert.alert('Error', 'Failed to save wellness rating. Please try again.');
      }
    } catch (error) {
      console.error('Error saving wellness rating:', error);
      Alert.alert('Error', 'Failed to save wellness rating. Please try again.');
    }
  };

  const clearMeasurementForm = () => {
    setNewWeight('');
    setNewBodyFat('');
    setNewChest('');
    setNewWaist('');
    setNewHips('');
    setNewArms('');
    setNewThighs('');
  };

  const RatingStars = ({ rating, onRatingChange, label }: { rating: number; onRatingChange: (rating: number) => void; label: string }) => (
    <View style={styles.ratingRow}>
      <Text style={styles.ratingLabel}>{label}</Text>
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
          <TouchableOpacity key={star} onPress={() => onRatingChange(star)}>
            <Ionicons
              name={star <= rating ? "star" : "star-outline"}
              size={20}
              color={star <= rating ? "#FFA500" : "#CED4DA"}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const TabButton = ({ tab, title, icon }: { tab: string; title: string; icon: string }) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
      onPress={() => setActiveTab(tab as any)}
    >
      <Ionicons 
        name={icon as any} 
        size={20} 
        color={activeTab === tab ? '#0066CC' : '#6C757D'} 
      />
      <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  const renderWeightChart = () => {
    const weightData = (measurements || []).filter(m => m.measurement_type === 'weight').slice(0, 6).reverse();
    
    if (weightData.length < 2) return null;

    const chartData = {
      labels: weightData.map(m => {
        const date = new Date(m.measured_at);
        return `${date.getMonth() + 1}/${date.getDate()}`;
      }),
      datasets: [{
        data: weightData.map(m => m.value),
        color: (opacity = 1) => `rgba(0, 102, 204, ${opacity})`,
        strokeWidth: 2,
      }],
    };

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Weight Trend (Last 6 Entries)</Text>
        <LineChart
          data={chartData}
          width={screenWidth - 40}
          height={220}
          chartConfig={{
            backgroundColor: '#fff',
            backgroundGradientFrom: '#fff',
            backgroundGradientTo: '#fff',
            decimalPlaces: 1,
            color: (opacity = 1) => `rgba(0, 102, 204, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(108, 117, 125, ${opacity})`,
            style: { borderRadius: 16 },
            propsForDots: {
              r: "6",
              strokeWidth: "2",
              stroke: "#0066CC"
            }
          }}
          style={styles.chart}
        />
      </View>
    );
  };

  const renderWellnessChart = () => {
    const recentWellness = wellnessRatings.slice(0, 7).reverse();
    
    if (recentWellness.length < 2) return null;

    const chartData = {
      labels: recentWellness.map(w => {
        const date = new Date(w.date);
        return `${date.getMonth() + 1}/${date.getDate()}`;
      }),
      datasets: [
        {
          data: recentWellness.map(w => w.mood_rating),
          color: (opacity = 1) => `rgba(0, 166, 126, ${opacity})`,
        },
        {
          data: recentWellness.map(w => w.energy_rating),
          color: (opacity = 1) => `rgba(255, 165, 0, ${opacity})`,
        },
        {
          data: recentWellness.map(w => w.sleep_quality),
          color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
        },
      ],
    };

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Wellness Trends (Last 7 Days)</Text>
        <LineChart
          data={chartData}
          width={screenWidth - 40}
          height={220}
          chartConfig={{
            backgroundColor: '#fff',
            backgroundGradientFrom: '#fff',
            backgroundGradientTo: '#fff',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(0, 102, 204, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(108, 117, 125, ${opacity})`,
            style: { borderRadius: 16 },
          }}
          style={styles.chart}
        />
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#00A67E' }]} />
            <Text style={styles.legendText}>Mood</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FFA500' }]} />
            <Text style={styles.legendText}>Energy</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#8B5CF6' }]} />
            <Text style={styles.legendText}>Sleep</Text>
          </View>
        </View>
      </View>
    );
  };

  const getLatestMeasurementValue = (type: string) => {
    const measurement = measurements.find(m => m.measurement_type === type);
    return measurement ? measurement.value : null;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Loading progress data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Progress Tracking</Text>
        <TouchableOpacity 
          style={styles.addButton} 
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={24} color="#0066CC" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TabButton tab="measurements" title="Body" icon="body" />
        <TabButton tab="photos" title="Photos" icon="camera" />
        <TabButton tab="wellness" title="Wellness" icon="heart" />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Goal Progress Summary */}
        {goals.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Goal Progress</Text>
            <View style={styles.goalsList}>
              {goals.slice(0, 2).map((goal, index) => {
                const progressPercent = Math.min((goal.current_value / goal.target_value) * 100, 100);
                return (
                  <View key={goal.id} style={styles.goalItem}>
                    <View style={styles.goalProgress}>
                      <View style={[
                        styles.goalProgressBar, 
                        { 
                          width: `${progressPercent}%`,
                          backgroundColor: index === 0 ? '#1890FF' : '#00A67E'
                        }
                      ]} />
                    </View>
                    <Text style={styles.goalText}>{goal.goal_name}</Text>
                    <Text style={styles.goalSubtext}>
                      {goal.current_value} / {goal.target_value} {goal.unit}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {activeTab === 'measurements' && (
          <>
            {renderWeightChart()}
            
            {/* Latest Measurements */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Recent Measurements</Text>
              {measurements.slice(0, 3).map((measurement, index) => (
                <View key={measurement.id} style={styles.measurementRow}>
                  <View style={styles.measurementDate}>
                    <Text style={styles.measurementDateText}>
                      {new Date(measurement.measured_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.measurementData}>
                    <View style={styles.measurementItem}>
                      <Text style={styles.measurementLabel}>
                        {measurement.measurement_type.replace('_', ' ')}
                      </Text>
                      <Text style={styles.measurementValue}>
                        {measurement.value} {measurement.unit}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
              {measurements.length === 0 && (
                <Text style={styles.emptyText}>No measurements recorded yet</Text>
              )}
            </View>

            {/* Body Measurements Summary */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Latest Full Measurements</Text>
              <View style={styles.measurementGrid}>
                <View style={styles.measurementGridItem}>
                  <Text style={styles.gridLabel}>Chest</Text>
                  <Text style={styles.gridValue}>
                    {getLatestMeasurementValue('chest') || '--'}"
                  </Text>
                </View>
                <View style={styles.measurementGridItem}>
                  <Text style={styles.gridLabel}>Waist</Text>
                  <Text style={styles.gridValue}>
                    {getLatestMeasurementValue('waist') || '--'}"
                  </Text>
                </View>
                <View style={styles.measurementGridItem}>
                  <Text style={styles.gridLabel}>Hips</Text>
                  <Text style={styles.gridValue}>
                    {getLatestMeasurementValue('hips') || '--'}"
                  </Text>
                </View>
                <View style={styles.measurementGridItem}>
                  <Text style={styles.gridLabel}>Arms</Text>
                  <Text style={styles.gridValue}>
                    {getLatestMeasurementValue('bicep') || '--'}"
                  </Text>
                </View>
                <View style={styles.measurementGridItem}>
                  <Text style={styles.gridLabel}>Thighs</Text>
                  <Text style={styles.gridValue}>
                    {getLatestMeasurementValue('thigh') || '--'}"
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}

        {activeTab === 'photos' && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Progress Photos</Text>
              <TouchableOpacity 
                style={styles.uploadButton}
                onPress={handlePhotoUpload}
              >
                <Ionicons name="camera" size={20} color="#0066CC" />
                <Text style={styles.uploadButtonText}>Add Photo</Text>
              </TouchableOpacity>
            </View>
            {progressPhotos.length > 0 ? (
              <View style={styles.photosGrid}>
                {progressPhotos.map((photo, index) => (
                  <View key={photo.id} style={styles.photoItem}>
                    <Text style={styles.photoDate}>
                      {new Date(photo.taken_at).toLocaleDateString()}
                    </Text>
                    <Text style={styles.photoType}>
                      {photo.photo_type.charAt(0).toUpperCase() + photo.photo_type.slice(1)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="camera" size={48} color="#ADB5BD" />
                <Text style={styles.photoPlaceholderText}>No photos yet</Text>
                <Text style={styles.photoPlaceholderSubtext}>
                  Take progress photos to visually track your transformation
                </Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'wellness' && (
          <>
            {renderWellnessChart()}
            
            {/* Today's Wellness */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Recent Wellness Check-ins</Text>
              {wellnessRatings.length > 0 ? (
                <View style={styles.wellnessGrid}>
                  <View style={styles.wellnessItem}>
                    <Ionicons name="happy" size={24} color="#00A67E" />
                    <Text style={styles.wellnessLabel}>Mood</Text>
                    <Text style={styles.wellnessValue}>
                      {wellnessRatings[0]?.mood_rating || '--'}/10
                    </Text>
                  </View>
                  <View style={styles.wellnessItem}>
                    <Ionicons name="flash" size={24} color="#FFA500" />
                    <Text style={styles.wellnessLabel}>Energy</Text>
                    <Text style={styles.wellnessValue}>
                      {wellnessRatings[0]?.energy_rating || '--'}/10
                    </Text>
                  </View>
                  <View style={styles.wellnessItem}>
                    <Ionicons name="bed" size={24} color="#8B5CF6" />
                    <Text style={styles.wellnessLabel}>Sleep</Text>
                    <Text style={styles.wellnessValue}>
                      {wellnessRatings[0]?.sleep_quality || '--'}/10
                    </Text>
                  </View>
                  <View style={styles.wellnessItem}>
                    <Ionicons name="alert-circle" size={24} color="#E03131" />
                    <Text style={styles.wellnessLabel}>Stress</Text>
                    <Text style={styles.wellnessValue}>
                      {wellnessRatings[0]?.stress_level || '--'}/10
                    </Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.emptyText}>No wellness check-ins yet</Text>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Add Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {activeTab === 'measurements' ? 'Add Measurements' : 
                 activeTab === 'wellness' ? 'Wellness Check-in' : 'Add Photo'}
              </Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color="#6C757D" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {activeTab === 'measurements' && (
                <>
                  <Text style={styles.inputLabel}>Weight (lbs) *</Text>
                  <TextInput
                    style={styles.input}
                    value={newWeight}
                    onChangeText={setNewWeight}
                    keyboardType="numeric"
                    placeholder="Enter weight"
                    placeholderTextColor="#ADB5BD"
                  />

                  <Text style={styles.inputLabel}>Body Fat %</Text>
                  <TextInput
                    style={styles.input}
                    value={newBodyFat}
                    onChangeText={setNewBodyFat}
                    keyboardType="numeric"
                    placeholder="Enter body fat percentage"
                    placeholderTextColor="#ADB5BD"
                  />

                  <Text style={styles.inputLabel}>Chest (inches)</Text>
                  <TextInput
                    style={styles.input}
                    value={newChest}
                    onChangeText={setNewChest}
                    keyboardType="numeric"
                    placeholder="Enter chest measurement"
                    placeholderTextColor="#ADB5BD"
                  />

                  <Text style={styles.inputLabel}>Waist (inches)</Text>
                  <TextInput
                    style={styles.input}
                    value={newWaist}
                    onChangeText={setNewWaist}
                    keyboardType="numeric"
                    placeholder="Enter waist measurement"
                    placeholderTextColor="#ADB5BD"
                  />

                  <Text style={styles.inputLabel}>Hips (inches)</Text>
                  <TextInput
                    style={styles.input}
                    value={newHips}
                    onChangeText={setNewHips}
                    keyboardType="numeric"
                    placeholder="Enter hips measurement"
                    placeholderTextColor="#ADB5BD"
                  />

                  <Text style={styles.inputLabel}>Arms (inches)</Text>
                  <TextInput
                    style={styles.input}
                    value={newArms}
                    onChangeText={setNewArms}
                    keyboardType="numeric"
                    placeholder="Enter arm measurement"
                    placeholderTextColor="#ADB5BD"
                  />

                  <Text style={styles.inputLabel}>Thighs (inches)</Text>
                  <TextInput
                    style={styles.input}
                    value={newThighs}
                    onChangeText={setNewThighs}
                    keyboardType="numeric"
                    placeholder="Enter thigh measurement"
                    placeholderTextColor="#ADB5BD"
                  />
                </>
              )}

              {activeTab === 'wellness' && (
                <>
                  <RatingStars 
                    rating={moodRating} 
                    onRatingChange={setMoodRating}
                    label="How is your mood today?"
                  />
                  <RatingStars 
                    rating={energyRating} 
                    onRatingChange={setEnergyRating}
                    label="How is your energy level?"
                  />
                  <RatingStars 
                    rating={sleepRating} 
                    onRatingChange={setSleepRating}
                    label="How well did you sleep?"
                  />
                  <RatingStars 
                    rating={stressRating} 
                    onRatingChange={setStressRating}
                    label="How stressed do you feel?"
                  />
                </>
              )}

              {activeTab === 'photos' && (
                <View style={styles.photoUploadArea}>
                  <Ionicons name="camera" size={48} color="#ADB5BD" />
                  <Text style={styles.photoUploadText}>Photo upload coming soon</Text>
                  <Text style={styles.photoUploadSubtext}>
                    We're working on integrating photo uploads with Supabase Storage
                  </Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={activeTab === 'measurements' ? addMeasurement : 
                         activeTab === 'wellness' ? addWellnessRating : 
                         () => Alert.alert('Coming Soon', 'Photo upload will be available soon!')}
              >
                <Text style={styles.saveButtonText}>
                  {activeTab === 'photos' ? 'Take Photo' : 'Save'}
                </Text>
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6C757D',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    backgroundColor: '#F4F6F8',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#212529',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    marginRight: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabButtonActive: {
    backgroundColor: '#E8F4FD',
    borderWidth: 1,
    borderColor: '#0066CC',
  },
  tabText: {
    fontSize: 14,
    color: '#6C757D',
    marginLeft: 6,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#0066CC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 15,
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
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F4FD',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  uploadButtonText: {
    fontSize: 14,
    color: '#0066CC',
    marginLeft: 6,
    fontWeight: '500',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 15,
  },
  goalsList: {
    marginTop: 5,
  },
  goalItem: {
    marginBottom: 15,
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
    borderRadius: 4,
  },
  goalText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#212529',
  },
  goalSubtext: {
    fontSize: 12,
    color: '#6C757D',
    marginTop: 2,
  },
  chartContainer: {
    marginHorizontal: 20,
    marginTop: 15,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 12,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#6C757D',
  },
  measurementRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
    paddingBottom: 15,
    marginBottom: 15,
  },
  measurementDate: {
    marginBottom: 8,
  },
  measurementDateText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0066CC',
  },
  measurementData: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  measurementItem: {
    alignItems: 'center',
  },
  measurementLabel: {
    fontSize: 12,
    color: '#6C757D',
    textTransform: 'capitalize',
  },
  measurementValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginTop: 4,
  },
  measurementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  measurementGridItem: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 15,
  },
  gridLabel: {
    fontSize: 12,
    color: '#6C757D',
    marginBottom: 4,
  },
  gridValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
  },
  photoPlaceholder: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  photoPlaceholderText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ADB5BD',
    marginTop: 10,
  },
  photoPlaceholderSubtext: {
    fontSize: 14,
    color: '#6C757D',
    textAlign: 'center',
    marginTop: 5,
    paddingHorizontal: 20,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  photoItem: {
    width: '48%',
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  photoDate: {
    fontSize: 12,
    color: '#6C757D',
  },
  photoType: {
    fontSize: 14,
    fontWeight: '500',
    color: '#212529',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  wellnessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  wellnessItem: {
    width: '48%',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  wellnessLabel: {
    fontSize: 12,
    color: '#6C757D',
    marginTop: 8,
  },
  wellnessValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginTop: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#6C757D',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
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
    maxHeight: '80%',
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
  ratingRow: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  ratingLabel: {
    fontSize: 14,
    color: '#212529',
    marginBottom: 10,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  photoUploadArea: {
    alignItems: 'center',
    paddingVertical: 60,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginTop: 20,
  },
  photoUploadText: {
    fontSize: 16,
    color: '#6C757D',
    marginTop: 10,
  },
  photoUploadSubtext: {
    fontSize: 12,
    color: '#ADB5BD',
    textAlign: 'center',
    marginTop: 5,
    paddingHorizontal: 20,
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