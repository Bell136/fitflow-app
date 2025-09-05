import { dashboardService } from '../dashboard.service';
import { supabase } from '../supabase.client';
import { workoutService } from '../workout.service';
import { nutritionService } from '../nutrition.service';
import { progressService } from '../progress.service';

// Mock dependencies
jest.mock('../supabase.client', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn(),
    })),
  },
}));

jest.mock('../workout.service');
jest.mock('../nutrition.service');
jest.mock('../progress.service');

describe('DashboardService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock returns
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: 'test-user-123' } },
    });
  });

  describe('getDashboardData', () => {
    it('should return dashboard data with default values when no data is available', async () => {
      const result = await dashboardService.getDashboardData();

      expect(result).toBeDefined();
      expect(result?.stats).toEqual({
        workouts: {
          totalThisWeek: 0,
          totalThisMonth: 0,
          streak: 0,
          weeklyMinutes: 0,
          averageWorkoutDuration: 0,
        },
        nutrition: {
          dailyCalories: 0,
          calorieGoal: 2000,
          waterIntake: 0,
          waterGoal: 2500,
          mealsLogged: 0,
          proteinIntake: 0,
          proteinGoal: 150,
        },
        progress: {
          weightChange: 0,
          activeGoals: 0,
          completedGoals: 0,
          progressPhotos: 0,
          measurementsThisWeek: 0,
        },
        wellness: {
          averageSleep: 0,
          wellnessStreak: 0,
        },
      });
      expect(result?.quickActions).toHaveLength(4);
      expect(result?.activityRings).toEqual([]);
    });

    it('should fetch and include workout stats when available', async () => {
      const mockWorkouts = [
        { createdAt: new Date().toISOString(), duration: 45, completedAt: new Date().toISOString() },
        { createdAt: new Date().toISOString(), duration: 30, completedAt: new Date().toISOString() },
      ];

      const fromMock = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockWorkouts, error: null }),
      };
      
      (supabase.from as jest.Mock).mockReturnValue(fromMock);

      const result = await dashboardService.getDashboardData();

      expect(result?.stats.workouts.totalThisWeek).toBe(2);
      expect(result?.stats.workouts.weeklyMinutes).toBe(75);
    });
  });

  describe('getQuickStats', () => {
    it('should return null when user is not authenticated', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
      });

      const result = await dashboardService.getQuickStats();
      
      expect(result).toBeNull();
    });

    it('should return quick stats for authenticated user', async () => {
      const mockTodayWorkouts = { data: [{ id: '1' }], error: null };
      const mockWeekWorkouts = { data: [{ id: '1' }, { id: '2' }], error: null };
      const mockNutrition = { totalCalories: 1500 };
      const mockGoals = [{ id: '1', isActive: true }];

      const fromMock = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnValue(mockTodayWorkouts),
      };

      (supabase.from as jest.Mock).mockReturnValue(fromMock);
      (nutritionService.getDailyNutrition as jest.Mock).mockResolvedValue(mockNutrition);
      (progressService.getGoals as jest.Mock).mockResolvedValue(mockGoals);

      const result = await dashboardService.getQuickStats();

      expect(result).toBeDefined();
      expect(result.todayCalories).toBe(1500);
      expect(result.activeGoals).toBe(1);
    });
  });
});

describe('Dashboard Stats Calculations', () => {
  describe('Workout Stats', () => {
    it('should calculate average workout duration correctly', async () => {
      const mockWorkouts = [
        { createdAt: new Date().toISOString(), duration: 60, completedAt: new Date().toISOString() },
        { createdAt: new Date().toISOString(), duration: 40, completedAt: new Date().toISOString() },
        { createdAt: new Date().toISOString(), duration: 50, completedAt: new Date().toISOString() },
      ];

      const fromMock = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockWorkouts, error: null }),
      };
      
      (supabase.from as jest.Mock).mockReturnValue(fromMock);

      const result = await dashboardService.getDashboardData();
      
      // Average should be (60 + 40 + 50) / 3 = 50
      expect(result?.stats.workouts.averageWorkoutDuration).toBe(50);
    });

    it('should handle empty workout data gracefully', async () => {
      const fromMock = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      };
      
      (supabase.from as jest.Mock).mockReturnValue(fromMock);

      const result = await dashboardService.getDashboardData();
      
      expect(result?.stats.workouts.totalThisWeek).toBe(0);
      expect(result?.stats.workouts.averageWorkoutDuration).toBe(0);
      expect(result?.stats.workouts.weeklyMinutes).toBe(0);
    });
  });

  describe('Nutrition Stats', () => {
    it('should fetch nutrition data from nutrition service', async () => {
      const mockNutritionData = {
        totalCalories: 1800,
        totalProtein: 120,
        mealEntries: [{ id: '1' }, { id: '2' }],
      };
      
      const mockMacroGoals = {
        dailyCalories: 2200,
        dailyProtein: 160,
        dailyWaterMl: 3000,
      };

      (nutritionService.getDailyNutrition as jest.Mock).mockResolvedValue(mockNutritionData);
      (nutritionService.getMacroGoals as jest.Mock).mockResolvedValue(mockMacroGoals);
      (nutritionService.getDailyWaterIntake as jest.Mock).mockResolvedValue(2000);

      const result = await dashboardService.getDashboardData();

      expect(result?.stats.nutrition.dailyCalories).toBe(1800);
      expect(result?.stats.nutrition.calorieGoal).toBe(2200);
      expect(result?.stats.nutrition.proteinIntake).toBe(120);
      expect(result?.stats.nutrition.proteinGoal).toBe(160);
      expect(result?.stats.nutrition.waterIntake).toBe(2000);
      expect(result?.stats.nutrition.waterGoal).toBe(3000);
      expect(result?.stats.nutrition.mealsLogged).toBe(2);
    });
  });
});

describe('Quick Actions', () => {
  it('should return 4 quick action items', async () => {
    const result = await dashboardService.getDashboardData();
    
    expect(result?.quickActions).toHaveLength(4);
    expect(result?.quickActions[0].id).toBe('start_workout');
    expect(result?.quickActions[1].id).toBe('log_meal');
    expect(result?.quickActions[2].id).toBe('add_measurement');
    expect(result?.quickActions[3].id).toBe('wellness_check');
  });

  it('should have correct routes for quick actions', async () => {
    const result = await dashboardService.getDashboardData();
    
    expect(result?.quickActions[0].route).toBe('WorkoutPlanning');
    expect(result?.quickActions[1].route).toBe('NutritionLogging');
    expect(result?.quickActions[2].route).toBe('ProgressTracking');
    expect(result?.quickActions[3].route).toBe('WellnessTracking');
  });
});

describe('Error Handling', () => {
  it('should handle database errors gracefully', async () => {
    const fromMock = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      order: jest.fn().mockRejectedValue(new Error('Database error')),
    };
    
    (supabase.from as jest.Mock).mockReturnValue(fromMock);

    const result = await dashboardService.getDashboardData();

    // Should return default values instead of throwing
    expect(result).toBeDefined();
    expect(result?.stats.workouts.totalThisWeek).toBe(0);
  });

  it('should handle service errors and use defaults', async () => {
    (nutritionService.getDailyNutrition as jest.Mock).mockRejectedValue(
      new Error('Nutrition service error')
    );

    const result = await dashboardService.getDashboardData();

    // Should still return data with defaults
    expect(result).toBeDefined();
    expect(result?.stats.nutrition.dailyCalories).toBe(0);
    expect(result?.stats.nutrition.calorieGoal).toBe(2000);
  });
});