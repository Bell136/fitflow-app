import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { nutritionService } from '../../services/nutrition.service';

const QUICK_ADD_OPTIONS = [250, 500, 750, 1000]; // ml

export default function LogWaterScreen() {
  const navigation = useNavigation();
  const [dailyIntake, setDailyIntake] = useState(0);
  const [dailyGoal] = useState(2500); // ml
  const [selectedAmount, setSelectedAmount] = useState(250);
  const animatedValue = new Animated.Value(0);

  useEffect(() => {
    loadDailyIntake();
  }, []);

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: dailyIntake / dailyGoal,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [dailyIntake]);

  const loadDailyIntake = async () => {
    const today = new Date().toISOString().split('T')[0];
    const intake = await nutritionService.getDailyWaterIntake(today);
    setDailyIntake(intake);
  };

  const handleLogWater = async (amount: number) => {
    try {
      const result = await nutritionService.logWater(amount);
      
      if (result) {
        setDailyIntake(dailyIntake + amount);
        
        if (dailyIntake + amount >= dailyGoal) {
          Alert.alert(
            '🎉 Goal Achieved!',
            `Great job! You've reached your daily water intake goal of ${dailyGoal}ml!`
          );
        } else {
          Alert.alert(
            'Water Logged',
            `Added ${amount}ml to your daily intake`,
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to log water intake. Please try again.');
    }
  };

  const percentage = Math.min((dailyIntake / dailyGoal) * 100, 100);
  const remainingIntake = Math.max(dailyGoal - dailyIntake, 0);
  const glassesRemaining = Math.ceil(remainingIntake / 250);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#212529" />
        </TouchableOpacity>
        <Text style={styles.title}>Log Water</Text>
      </View>

      <View style={styles.content}>
        {/* Water Progress Circle */}
        <View style={styles.progressContainer}>
          <View style={styles.waterBottle}>
            <Animated.View
              style={[
                styles.waterFill,
                {
                  height: animatedValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
            <View style={styles.waterTextContainer}>
              <Text style={styles.intakeText}>{dailyIntake}</Text>
              <Text style={styles.unitText}>ml</Text>
              <Text style={styles.percentageText}>{percentage.toFixed(0)}%</Text>
            </View>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Daily Goal</Text>
              <Text style={styles.statValue}>{dailyGoal}ml</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Remaining</Text>
              <Text style={styles.statValue}>{remainingIntake}ml</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Glasses Left</Text>
              <Text style={styles.statValue}>{glassesRemaining}</Text>
            </View>
          </View>
        </View>

        {/* Quick Add Buttons */}
        <View style={styles.quickAddSection}>
          <Text style={styles.sectionTitle}>Quick Add</Text>
          <View style={styles.quickAddButtons}>
            {QUICK_ADD_OPTIONS.map((amount) => (
              <TouchableOpacity
                key={amount}
                style={[
                  styles.quickAddButton,
                  selectedAmount === amount && styles.selectedButton,
                ]}
                onPress={() => setSelectedAmount(amount)}
              >
                <Ionicons 
                  name="water" 
                  size={24} 
                  color={selectedAmount === amount ? '#fff' : '#00B4D8'}
                />
                <Text style={[
                  styles.quickAddText,
                  selectedAmount === amount && styles.selectedText,
                ]}>
                  {amount}ml
                </Text>
                <Text style={[
                  styles.glassesText,
                  selectedAmount === amount && styles.selectedText,
                ]}>
                  {amount / 250} {amount === 250 ? 'glass' : 'glasses'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Custom Amount Input */}
        <TouchableOpacity 
          style={styles.customButton}
          onPress={() => Alert.alert('Coming Soon', 'Custom amount input will be available soon!')}
        >
          <Ionicons name="calculator" size={20} color="#0066CC" />
          <Text style={styles.customButtonText}>Enter Custom Amount</Text>
        </TouchableOpacity>

        {/* Add Button */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => handleLogWater(selectedAmount)}
        >
          <Ionicons name="add-circle" size={24} color="#fff" />
          <Text style={styles.addButtonText}>Add {selectedAmount}ml</Text>
        </TouchableOpacity>

        {/* Tips */}
        <View style={styles.tipCard}>
          <Ionicons name="bulb" size={20} color="#FFA500" />
          <Text style={styles.tipText}>
            Tip: Drink a glass of water before each meal to help with digestion and portion control.
          </Text>
        </View>
      </View>
    </View>
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
  content: {
    flex: 1,
    padding: 20,
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  waterBottle: {
    width: 150,
    height: 200,
    backgroundColor: '#E8F4FD',
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#00B4D8',
    overflow: 'hidden',
    justifyContent: 'flex-end',
    marginBottom: 20,
  },
  waterFill: {
    backgroundColor: '#00B4D8',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    opacity: 0.6,
  },
  waterTextContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  intakeText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#212529',
  },
  unitText: {
    fontSize: 16,
    color: '#495057',
    marginTop: -4,
  },
  percentageText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#00B4D8',
    marginTop: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#6C757D',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },
  quickAddSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12,
  },
  quickAddButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickAddButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginHorizontal: 5,
    borderWidth: 2,
    borderColor: '#E9ECEF',
  },
  selectedButton: {
    backgroundColor: '#00B4D8',
    borderColor: '#00B4D8',
  },
  quickAddText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    marginTop: 4,
  },
  glassesText: {
    fontSize: 10,
    color: '#6C757D',
    marginTop: 2,
  },
  selectedText: {
    color: '#fff',
  },
  customButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#0066CC',
  },
  customButtonText: {
    fontSize: 14,
    color: '#0066CC',
    marginLeft: 8,
    fontWeight: '500',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00B4D8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF4E6',
    borderRadius: 12,
    padding: 15,
    alignItems: 'flex-start',
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: '#495057',
    marginLeft: 10,
    lineHeight: 18,
  },
});