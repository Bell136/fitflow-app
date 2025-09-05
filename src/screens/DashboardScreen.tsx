import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '@react-navigation/native';
import { supabase } from '../services/supabase.client';
import { Session } from '@supabase/supabase-js';
import { dashboardService } from '../services/dashboard.service';
import { workoutService } from '../services/workout.service';
import { nutritionService } from '../services/nutrition.service';
import { progressService } from '../services/progress.service';
import ActivityRings from '../components/ActivityRings';
import { DashboardSkeleton } from '../components/LoadingSkeleton';
import { RootStackParamList } from '../navigation/AppNavigator';

interface DashboardStats {
  weeklyWorkouts: number;
  todayCalories: number;
  weightChange: string;
  activeGoals: number;
  currentStreak: number;
  weeklyMinutes: number;
}

export default function DashboardScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [session, setSession] = useState<Session | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    weeklyWorkouts: 0,
    todayCalories: 0,
    weightChange: '--',
    activeGoals: 0,
    currentStreak: 0,
    weeklyMinutes: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadSession();
    loadDashboardData();
  }, []);

  const loadSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setSession(session);
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Add a timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Dashboard load timeout')), 10000)
      );
      
      // Fetch dashboard data from Supabase with timeout
      const dashboardData = await Promise.race([
        dashboardService.getDashboardData(),
        timeoutPromise
      ]) as any;
      
      if (dashboardData) {
        // Update stats with real data
        setStats({
          weeklyWorkouts: dashboardData.stats.workouts.totalThisWeek,
          todayCalories: dashboardData.stats.nutrition.dailyCalories,
          weightChange: dashboardData.stats.progress.weightChange ? 
            `${dashboardData.stats.progress.weightChange > 0 ? '+' : ''}${dashboardData.stats.progress.weightChange} lbs` : 
            '--',
          activeGoals: dashboardData.stats.progress.activeGoals,
          currentStreak: dashboardData.stats.workouts.streak,
          weeklyMinutes: dashboardData.stats.workouts.weeklyMinutes,
        });
      } else {
        // Use default values if no data available
        setStats({
          weeklyWorkouts: 0,
          todayCalories: 0,
          weightChange: '--',
          activeGoals: 0,
          currentStreak: 0,
          weeklyMinutes: 0,
        });
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      console.log('Dashboard loading failed, using defaults');
      // Fallback to default values on error
      setStats({
        weeklyWorkouts: 0,
        todayCalories: 0,
        weightChange: '--',
        activeGoals: 0,
        currentStreak: 0,
        weeklyMinutes: 0,
      });
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const QuickActionButton = ({ icon, title, onPress, color = '#0066CC' }: any) => (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      <View style={[styles.quickActionIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.quickActionText}>{title}</Text>
    </TouchableOpacity>
  );

  // Activity rings data based on current stats
  const activityRingsData = [
    {
      value: Math.min(stats.todayCalories, 2000),
      maxValue: 2000,
      color: '#FF6B6B',
      label: 'Calories',
      icon: 'flame'
    },
    {
      value: Math.min(stats.weeklyMinutes, 150) / 150 * 100,
      maxValue: 100,
      color: '#4ECDC4',
      label: 'Exercise',
      icon: 'barbell'
    },
    {
      value: 6, // Static for now - would come from water intake
      maxValue: 8,
      color: '#45B7D1',
      label: 'Water',
      icon: 'water'
    }
  ];

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <View>
          <Text style={styles.greeting}>Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'} 💪</Text>
          <Text style={styles.userName}>{session?.user?.email?.split('@')[0] || 'Athlete'}</Text>
        </View>
        <View style={styles.streakBadge}>
          <Ionicons name="flame" size={20} color="#FFA500" />
          <Text style={styles.streakText}>{stats.currentStreak}</Text>
        </View>
      </View>

      {/* Activity Rings */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today's Goals</Text>
        <ActivityRings 
          rings={activityRingsData}
          size={140}
          strokeWidth={8}
        />
      </View>

      {/* Today's Overview */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today's Progress</Text>
        <View style={styles.progressGrid}>
          <View style={styles.progressItem}>
            <Ionicons name="footsteps" size={24} color="#1890FF" />
            <Text style={styles.progressValue}>8,420</Text>
            <Text style={styles.progressLabel}>Steps</Text>
          </View>
          <View style={styles.progressItem}>
            <Ionicons name="flame" size={24} color="#FFA500" />
            <Text style={styles.progressValue}>{stats.todayCalories}</Text>
            <Text style={styles.progressLabel}>Calories</Text>
          </View>
          <View style={styles.progressItem}>
            <Ionicons name="water" size={24} color="#00A67E" />
            <Text style={styles.progressValue}>6/8</Text>
            <Text style={styles.progressLabel}>Water</Text>
          </View>
          <View style={styles.progressItem}>
            <Ionicons name="bed" size={24} color="#8B5CF6" />
            <Text style={styles.progressValue}>7.5h</Text>
            <Text style={styles.progressLabel}>Sleep</Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <QuickActionButton
            icon="add-circle"
            title="Start Workout"
            color="#1890FF"
            onPress={() => navigation.navigate('StartWorkout')}
          />
          <QuickActionButton
            icon="nutrition"
            title="Log Meal"
            color="#00A67E"
            onPress={() => navigation.navigate('Nutrition')}
          />
          <QuickActionButton
            icon="camera"
            title="Progress Photo"
            color="#FFA500"
            onPress={() => Alert.alert('Coming Soon', 'Progress photos will be available soon!')}
          />
          <QuickActionButton
            icon="water"
            title="Log Water"
            color="#00B4D8"
            onPress={() => navigation.navigate('LogWater')}
          />
        </View>
      </View>

      {/* Weekly Stats */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>This Week</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <View style={styles.statHeader}>
              <Ionicons name="barbell" size={20} color="#1890FF" />
              <Text style={styles.statLabel}>Workouts</Text>
            </View>
            <Text style={styles.statValue}>{stats.weeklyWorkouts}</Text>
            <Text style={styles.statSubtext}>sessions</Text>
          </View>
          <View style={styles.statBox}>
            <View style={styles.statHeader}>
              <Ionicons name="time" size={20} color="#00A67E" />
              <Text style={styles.statLabel}>Active Time</Text>
            </View>
            <Text style={styles.statValue}>{stats.weeklyMinutes}</Text>
            <Text style={styles.statSubtext}>minutes</Text>
          </View>
          <View style={styles.statBox}>
            <View style={styles.statHeader}>
              <Ionicons name="trending-down" size={20} color="#FFA500" />
              <Text style={styles.statLabel}>Weight</Text>
            </View>
            <Text style={styles.statValue}>{stats.weightChange}</Text>
            <Text style={styles.statSubtext}>lbs</Text>
          </View>
        </View>
      </View>

      {/* Active Goals */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Active Goals</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.goalsList}>
          <View style={styles.goalItem}>
            <View style={styles.goalProgress}>
              <View style={[styles.goalProgressBar, { width: '75%' }]} />
            </View>
            <Text style={styles.goalText}>Lose 10 lbs</Text>
            <Text style={styles.goalSubtext}>7.5 / 10 lbs</Text>
          </View>
          <View style={styles.goalItem}>
            <View style={styles.goalProgress}>
              <View style={[styles.goalProgressBar, { width: '60%', backgroundColor: '#00A67E' }]} />
            </View>
            <Text style={styles.goalText}>Workout 5x per week</Text>
            <Text style={styles.goalSubtext}>3 / 5 this week</Text>
          </View>
          <View style={styles.goalItem}>
            <View style={styles.goalProgress}>
              <View style={[styles.goalProgressBar, { width: '90%', backgroundColor: '#FFA500' }]} />
            </View>
            <Text style={styles.goalText}>Daily Protein Target</Text>
            <Text style={styles.goalSubtext}>135 / 150g today</Text>
          </View>
        </View>
      </View>

      {/* AI Insights */}
      <View style={[styles.card, styles.insightCard]}>
        <View style={styles.insightHeader}>
          <Ionicons name="bulb" size={24} color="#0066CC" />
          <Text style={styles.cardTitle}>AI Insight</Text>
        </View>
        <Text style={styles.insightText}>
          Great progress this week! You're on track with your workouts. Consider adding 10 minutes of stretching after today's session to improve recovery.
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
  scrollContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
  },
  greeting: {
    fontSize: 14,
    color: '#6C757D',
  },
  userName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#212529',
    marginTop: 4,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  streakText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginLeft: 4,
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
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 15,
  },
  viewAllText: {
    fontSize: 14,
    color: '#0066CC',
  },
  progressGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  progressItem: {
    alignItems: 'center',
  },
  progressValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212529',
    marginTop: 8,
  },
  progressLabel: {
    fontSize: 12,
    color: '#6C757D',
    marginTop: 4,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickAction: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    color: '#495057',
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6C757D',
    marginLeft: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
  },
  statSubtext: {
    fontSize: 12,
    color: '#ADB5BD',
    marginTop: 2,
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
    backgroundColor: '#1890FF',
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
  insightCard: {
    backgroundColor: '#E8F4FD',
    borderLeftWidth: 3,
    borderLeftColor: '#0066CC',
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  insightText: {
    fontSize: 14,
    color: '#495057',
    lineHeight: 20,
  },
});