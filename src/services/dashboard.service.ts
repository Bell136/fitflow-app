import { supabase } from './supabase.client';
import { workoutService } from './workout.service';
import { nutritionService } from './nutrition.service';
import { progressService } from './progress.service';

export interface DashboardStats {
  workouts: {
    totalThisWeek: number;
    totalThisMonth: number;
    streak: number;
    lastWorkout?: string;
    weeklyMinutes: number;
    averageWorkoutDuration: number;
  };
  nutrition: {
    dailyCalories: number;
    calorieGoal: number;
    waterIntake: number;
    waterGoal: number;
    mealsLogged: number;
    proteinIntake: number;
    proteinGoal: number;
  };
  progress: {
    currentWeight?: number;
    weightChange: number;
    activeGoals: number;
    completedGoals: number;
    progressPhotos: number;
    measurementsThisWeek: number;
  };
  wellness: {
    todaysMood?: number;
    todaysEnergy?: number;
    averageSleep: number;
    stressLevel?: number;
    wellnessStreak: number;
  };
}

export interface ActivityRing {
  type: 'workout' | 'nutrition' | 'steps' | 'water';
  current: number;
  target: number;
  percentage: number;
  unit: string;
  color: string;
}

export interface QuickAction {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  route: string;
  params?: any;
}

export interface AIInsight {
  id: string;
  type: 'tip' | 'achievement' | 'suggestion' | 'warning';
  title: string;
  message: string;
  actionText?: string;
  actionRoute?: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
}

export interface DashboardData {
  stats: DashboardStats;
  activityRings: ActivityRing[];
  quickActions: QuickAction[];
  insights: AIInsight[];
  streaks: {
    workout: number;
    nutrition: number;
    wellness: number;
  };
  recentActivities: {
    type: 'workout' | 'meal' | 'measurement' | 'photo';
    title: string;
    subtitle: string;
    timestamp: string;
    icon: string;
  }[];
}

class DashboardService {
  // Main Dashboard Data Method
  async getDashboardData(): Promise<DashboardData | null> {
    try {
      // Return simplified data structure to avoid timeout
      const stats: DashboardStats = {
        workouts: {
          totalThisWeek: 0,
          totalThisMonth: 0,
          streak: 0,
          weeklyMinutes: 0,
          averageWorkoutDuration: 0
        },
        nutrition: {
          dailyCalories: 0,
          calorieGoal: 2000,
          waterIntake: 0,
          waterGoal: 2500,
          mealsLogged: 0,
          proteinIntake: 0,
          proteinGoal: 150
        },
        progress: {
          weightChange: 0,
          activeGoals: 0,
          completedGoals: 0,
          progressPhotos: 0,
          measurementsThisWeek: 0
        },
        wellness: {
          averageSleep: 0,
          wellnessStreak: 0
        }
      };

      // Try to fetch basic workout data without timeout
      try {
        const workoutStats = await this.getWorkoutStats();
        stats.workouts = workoutStats;
      } catch (e) {
        console.log('Could not fetch workout stats, using defaults');
      }

      // Try to fetch basic nutrition data
      try {
        const nutritionData = await this.getTodaysNutritionStats();
        stats.nutrition = nutritionData;
      } catch (e) {
        console.log('Could not fetch nutrition stats, using defaults');
      }

      return {
        stats,
        activityRings: [],
        quickActions: this.getQuickActions(),
        insights: [],
        streaks: {
          workout: 0,
          nutrition: 0,
          wellness: 0
        },
        recentActivities: []
      };
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      
      // Return minimal default data
      return {
        stats: {
          workouts: {
            totalThisWeek: 0,
            totalThisMonth: 0,
            streak: 0,
            weeklyMinutes: 0,
            averageWorkoutDuration: 0
          },
          nutrition: {
            dailyCalories: 0,
            calorieGoal: 2000,
            waterIntake: 0,
            waterGoal: 2500,
            mealsLogged: 0,
            proteinIntake: 0,
            proteinGoal: 150
          },
          progress: {
            weightChange: 0,
            activeGoals: 0,
            completedGoals: 0,
            progressPhotos: 0,
            measurementsThisWeek: 0
          },
          wellness: {
            averageSleep: 0,
            wellnessStreak: 0
          }
        },
        activityRings: [],
        quickActions: this.getQuickActions(),
        insights: [],
        streaks: {
          workout: 0,
          nutrition: 0,
          wellness: 0
        },
        recentActivities: []
      };
    }
  }

  // Workout Stats Methods
  private async getWorkoutStats(): Promise<DashboardStats['workouts']> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          totalThisWeek: 0,
          totalThisMonth: 0,
          streak: 0,
          weeklyMinutes: 0,
          averageWorkoutDuration: 0
        };
      }

      const now = new Date();
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      const monthAgo = new Date(now);
      monthAgo.setDate(now.getDate() - 30);

      const { data: workouts, error } = await supabase
        .from('Workout')
        .select('createdAt, duration, completedAt')
        .eq('userId', user.id)
        .not('completedAt', 'is', null) // Only completed workouts
        .gte('createdAt', monthAgo.toISOString())
        .order('createdAt', { ascending: false });

      if (error) throw error;

      const allWorkouts = Array.isArray(workouts) ? workouts : [];
      const weekWorkouts = allWorkouts.filter(w => 
        w.createdAt && new Date(w.createdAt) >= weekAgo
      );

      const totalMinutes = weekWorkouts.reduce((sum, w) => sum + (w.duration || 0), 0);
      const averageWorkoutDuration = weekWorkouts.length > 0 
        ? Math.round(totalMinutes / weekWorkouts.length) 
        : 0;

      const streak = await this.calculateWorkoutStreak();
      const lastWorkout = allWorkouts.length > 0 ? allWorkouts[0].createdAt : undefined;

      return {
        totalThisWeek: weekWorkouts.length,
        totalThisMonth: allWorkouts.length,
        streak,
        lastWorkout,
        weeklyMinutes: totalMinutes,
        averageWorkoutDuration
      };
    } catch (error) {
      console.error('Error fetching workout stats:', error);
      return {
        totalThisWeek: 0,
        totalThisMonth: 0,
        streak: 0,
        weeklyMinutes: 0,
        averageWorkoutDuration: 0
      };
    }
  }

  private async calculateWorkoutStreak(): Promise<number> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { data: workouts, error } = await supabase
        .from('Workout')
        .select('createdAt')
        .eq('userId', user.id)
        .not('completedAt', 'is', null)
        .order('createdAt', { ascending: false })
        .limit(100);

      if (error) throw error;

      const workoutDates = (workouts || []).map(w => 
        new Date(w.createdAt).toDateString()
      );

      const uniqueDates = [...new Set(workoutDates)];
      let streak = 0;
      const today = new Date().toDateString();

      for (let i = 0; i < uniqueDates.length; i++) {
        const checkDate = new Date();
        checkDate.setDate(checkDate.getDate() - i);
        
        if (uniqueDates.includes(checkDate.toDateString())) {
          streak++;
        } else {
          break;
        }
      }

      return streak;
    } catch (error) {
      console.error('Error calculating workout streak:', error);
      return 0;
    }
  }

  // Nutrition Stats Methods
  private async getTodaysNutritionStats(): Promise<DashboardStats['nutrition']> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const dailyNutrition = await nutritionService.getDailyNutrition(today);
      const macroGoals = await nutritionService.getMacroGoals();
      const waterIntake = await nutritionService.getDailyWaterIntake(today);

      return {
        dailyCalories: dailyNutrition?.totalCalories || 0,
        calorieGoal: macroGoals?.dailyCalories || 2000,
        waterIntake: waterIntake,
        waterGoal: macroGoals?.dailyWaterMl || 2500,
        mealsLogged: dailyNutrition?.mealEntries?.length || 0,
        proteinIntake: dailyNutrition?.totalProtein || 0,
        proteinGoal: macroGoals?.dailyProtein || 150
      };
    } catch (error) {
      console.error('Error fetching nutrition stats:', error);
      return {
        dailyCalories: 0,
        calorieGoal: 2000,
        waterIntake: 0,
        waterGoal: 2500,
        mealsLogged: 0,
        proteinIntake: 0,
        proteinGoal: 150
      };
    }
  }

  // Progress Stats Methods
  private async getProgressStats(): Promise<DashboardStats['progress']> {
    try {
      const progressSummary = await progressService.getProgressSummary();
      const progressStats = await progressService.getProgressStats();

      return {
        currentWeight: progressSummary?.weightTrend.current,
        weightChange: progressSummary?.weightTrend.change || 0,
        activeGoals: progressSummary?.goalProgress.active || 0,
        completedGoals: progressSummary?.goalProgress.achieved || 0,
        progressPhotos: progressStats?.photosUploaded || 0,
        measurementsThisWeek: progressStats?.measurementsLogged || 0
      };
    } catch (error) {
      console.error('Error fetching progress stats:', error);
      return {
        weightChange: 0,
        activeGoals: 0,
        completedGoals: 0,
        progressPhotos: 0,
        measurementsThisWeek: 0
      };
    }
  }

  // Wellness Stats Methods
  private async getWellnessStats(): Promise<DashboardStats['wellness']> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const todaysWellness = await progressService.getWellnessRating(today);
      const wellnessHistory = await progressService.getWellnessHistory(7);
      
      const averageSleep = wellnessHistory.length > 0
        ? wellnessHistory.reduce((sum, w) => sum + w.sleepQuality, 0) / wellnessHistory.length
        : 0;

      const wellnessStreak = await this.calculateWellnessStreak();

      return {
        todaysMood: todaysWellness?.moodRating,
        todaysEnergy: todaysWellness?.energyRating,
        averageSleep: Math.round(averageSleep * 10) / 10,
        stressLevel: todaysWellness?.stressLevel,
        wellnessStreak
      };
    } catch (error) {
      console.error('Error fetching wellness stats:', error);
      return {
        averageSleep: 0,
        wellnessStreak: 0
      };
    }
  }

  private async calculateWellnessStreak(): Promise<number> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { data: wellness, error } = await supabase
        .from('WellnessRating')
        .select('date')
        .eq('userId', user.id)
        .order('date', { ascending: false })
        .limit(30);

      if (error) throw error;

      let streak = 0;
      const today = new Date();

      for (let i = 0; i < 30; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        const dateString = checkDate.toISOString().split('T')[0];

        const hasEntry = (wellness || []).some(w => w.date === dateString);
        if (hasEntry) {
          streak++;
        } else {
          break;
        }
      }

      return streak;
    } catch (error) {
      console.error('Error calculating wellness streak:', error);
      return 0;
    }
  }

  // Activity Rings Methods
  private async getActivityRings(): Promise<ActivityRing[]> {
    try {
      // Get today's nutrition data directly to avoid recursion
      const today = new Date().toISOString().split('T')[0];
      const dailyNutrition = await nutritionService.getDailyNutrition(today);
      const macroGoals = await nutritionService.getMacroGoals();
      const waterIntake = await nutritionService.getDailyWaterIntake(today);
      
      // Get workout stats for the week
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const { data: weekWorkouts } = await supabase
        .from('Workout')
        .select('id')
        .eq('userId', user.id)
        .gte('createdAt', weekAgo.toISOString())
        .not('completedAt', 'is', null);

      const weeklyWorkoutCount = weekWorkouts?.length || 0;
      const dailyCalories = dailyNutrition?.totalCalories || 0;
      const calorieGoal = macroGoals?.dailyCalories || 2000;
      const waterGoal = macroGoals?.dailyWaterMl || 2500;

      const rings: ActivityRing[] = [
        {
          type: 'workout',
          current: weeklyWorkoutCount,
          target: 4, // Default weekly workout target
          percentage: Math.min((weeklyWorkoutCount / 4) * 100, 100),
          unit: 'workouts',
          color: '#FF6B6B'
        },
        {
          type: 'nutrition',
          current: dailyCalories,
          target: calorieGoal,
          percentage: Math.min((dailyCalories / calorieGoal) * 100, 100),
          unit: 'kcal',
          color: '#4ECDC4'
        },
        {
          type: 'water',
          current: waterIntake,
          target: waterGoal,
          percentage: Math.min((waterIntake / waterGoal) * 100, 100),
          unit: 'ml',
          color: '#45B7D1'
        }
      ];

      return rings;
    } catch (error) {
      console.error('Error getting activity rings:', error);
      return [];
    }
  }

  // Quick Actions Methods
  private getQuickActions(): QuickAction[] {
    return [
      {
        id: 'start_workout',
        title: 'Start Workout',
        subtitle: 'Begin a new session',
        icon: 'fitness-outline',
        color: '#FF6B6B',
        route: 'WorkoutPlanning'
      },
      {
        id: 'log_meal',
        title: 'Log Meal',
        subtitle: 'Track your nutrition',
        icon: 'restaurant-outline',
        color: '#4ECDC4',
        route: 'NutritionLogging'
      },
      {
        id: 'add_measurement',
        title: 'Log Progress',
        subtitle: 'Record measurements',
        icon: 'body-outline',
        color: '#45B7D1',
        route: 'ProgressTracking'
      },
      {
        id: 'wellness_check',
        title: 'Wellness Check',
        subtitle: 'Rate your day',
        icon: 'happy-outline',
        color: '#96CEB4',
        route: 'WellnessTracking'
      }
    ];
  }

  // AI Insights Methods (Placeholder implementation)
  private async getAIInsights(): Promise<AIInsight[]> {
    try {
      // This is a placeholder implementation
      // In a real app, this would connect to an AI service or have more sophisticated logic
      
      // Get basic stats without recursion
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const { data: weekWorkouts } = await supabase
        .from('Workout')
        .select('id')
        .eq('userId', user.id)
        .gte('createdAt', weekAgo.toISOString())
        .not('completedAt', 'is', null);
      
      const weeklyWorkoutCount = weekWorkouts?.length || 0;
      const workoutStreak = await this.calculateWorkoutStreak();
      
      // Get today's nutrition
      const today = new Date().toISOString().split('T')[0];
      const waterIntake = await nutritionService.getDailyWaterIntake(today);
      const macroGoals = await nutritionService.getMacroGoals();
      const waterGoal = macroGoals?.dailyWaterMl || 2500;
      
      // Get wellness data
      const todaysWellness = await progressService.getWellnessRating(today);

      const insights: AIInsight[] = [];

      // Workout insights
      if (weeklyWorkoutCount < 3) {
        insights.push({
          id: 'workout_suggestion',
          type: 'suggestion',
          title: 'Workout Reminder',
          message: `You've completed ${weeklyWorkoutCount} workouts this week. Try to get in 1-2 more sessions!`,
          actionText: 'Start Workout',
          actionRoute: 'WorkoutPlanning',
          priority: 'medium',
          createdAt: new Date().toISOString()
        });
      }

      // Nutrition insights
      if (waterIntake < waterGoal * 0.5) {
        insights.push({
          id: 'water_reminder',
          type: 'tip',
          title: 'Stay Hydrated',
          message: 'You\'re behind on your water intake today. Try to drink a glass every hour.',
          actionText: 'Log Water',
          actionRoute: 'WaterTracking',
          priority: 'high',
          createdAt: new Date().toISOString()
        });
      }

      // Progress insights
      if (workoutStreak >= 5) {
        insights.push({
          id: 'streak_achievement',
          type: 'achievement',
          title: 'Great Streak!',
          message: `Amazing! You've worked out ${workoutStreak} days in a row. Keep it up!`,
          priority: 'low',
          createdAt: new Date().toISOString()
        });
      }

      // Wellness insights
      if (todaysWellness?.moodRating && todaysWellness.moodRating < 5) {
        insights.push({
          id: 'wellness_tip',
          type: 'tip',
          title: 'Mood Boost',
          message: 'A quick workout or walk can help improve your mood. Even 10 minutes helps!',
          actionText: 'Start Activity',
          actionRoute: 'WorkoutPlanning',
          priority: 'medium',
          createdAt: new Date().toISOString()
        });
      }

      return insights.slice(0, 3); // Limit to 3 insights
    } catch (error) {
      console.error('Error generating AI insights:', error);
      return [];
    }
  }

  // Streak Calculation Methods
  private async getStreaks(): Promise<DashboardData['streaks']> {
    try {
      const workoutStreak = await this.calculateWorkoutStreak();
      const nutritionStreak = await this.calculateNutritionStreak();
      const wellnessStreak = await this.calculateWellnessStreak();

      return {
        workout: workoutStreak,
        nutrition: nutritionStreak,
        wellness: wellnessStreak
      };
    } catch (error) {
      console.error('Error calculating streaks:', error);
      return {
        workout: 0,
        nutrition: 0,
        wellness: 0
      };
    }
  }

  private async calculateNutritionStreak(): Promise<number> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      let streak = 0;
      const today = new Date();

      for (let i = 0; i < 30; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        const dateString = checkDate.toISOString().split('T')[0];

        const dailyNutrition = await nutritionService.getDailyNutrition(dateString);
        
        // Consider it a nutrition day if they logged at least one meal
        if (dailyNutrition && dailyNutrition.mealEntries.length > 0) {
          streak++;
        } else {
          break;
        }
      }

      return streak;
    } catch (error) {
      console.error('Error calculating nutrition streak:', error);
      return 0;
    }
  }

  // Recent Activities Methods
  private async getRecentActivities(): Promise<DashboardData['recentActivities']> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const activities: DashboardData['recentActivities'] = [];

      // Get recent workouts
      const recentWorkouts = await workoutService.getRecentWorkouts(3);
      recentWorkouts.forEach(workout => {
        activities.push({
          type: 'workout',
          title: workout.name,
          subtitle: `${workout.duration || 0} minutes`,
          timestamp: workout.createdAt || '',
          icon: 'fitness-outline'
        });
      });

      // Get recent meals
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const todayNutrition = await nutritionService.getDailyNutrition(today);
      const yesterdayNutrition = await nutritionService.getDailyNutrition(yesterdayStr);

      const recentMeals = [
        ...(todayNutrition?.mealEntries || []),
        ...(yesterdayNutrition?.mealEntries || [])
      ].slice(0, 3);

      recentMeals.forEach(meal => {
        if (meal.food) {
          activities.push({
            type: 'meal',
            title: `${meal.mealType.charAt(0).toUpperCase() + meal.mealType.slice(1)}`,
            subtitle: meal.food.name,
            timestamp: meal.loggedAt,
            icon: 'restaurant-outline'
          });
        }
      });

      // Get recent measurements
      const recentMeasurements = await progressService.getMeasurements(undefined, 2);
      recentMeasurements.forEach(measurement => {
        activities.push({
          type: 'measurement',
          title: `${measurement.measurementType.replace(/([A-Z])/g, ' $1').toUpperCase()}`,
          subtitle: `${measurement.value} ${measurement.unit}`,
          timestamp: measurement.measuredAt,
          icon: 'body-outline'
        });
      });

      // Sort by timestamp and return top 5
      return activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 5);
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      return [];
    }
  }

  // Helper Methods for Statistics
  async getQuickStats(): Promise<any> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const [
        todayWorkouts,
        weekWorkouts,
        todayNutrition,
        activeGoals
      ] = await Promise.all([
        supabase.from('Workout').select('id').eq('userId', user.id).gte('createdAt', `${today}T00:00:00.000Z`).lte('createdAt', `${today}T23:59:59.999Z`),
        supabase.from('Workout').select('id').eq('userId', user.id).gte('createdAt', weekAgo.toISOString()),
        nutritionService.getDailyNutrition(today),
        progressService.getGoals(true)
      ]);

      return {
        todayWorkouts: todayWorkouts.data?.length || 0,
        weekWorkouts: weekWorkouts.data?.length || 0,
        todayCalories: todayNutrition?.totalCalories || 0,
        activeGoals: activeGoals.length
      };
    } catch (error) {
      console.error('Error fetching quick stats:', error);
      return null;
    }
  }
}

export const dashboardService = new DashboardService();