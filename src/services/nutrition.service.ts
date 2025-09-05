import { supabase } from './supabase.client';

export interface Food {
  id: string;
  name: string;
  brand?: string;
  servingSize: number;
  servingUnit: string;
  caloriesPerServing: number;
  proteinPerServing: number;
  carbsPerServing: number;
  fatPerServing: number;
  fiberPerServing?: number;
  sugarPerServing?: number;
  sodiumPerServing?: number;
  barcode?: string;
  verified: boolean;
  createdAt?: string;
}

export interface MealEntry {
  id?: string;
  userId?: string;
  foodId: string;
  food?: Food;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  quantity: number;
  servingSize: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  loggedAt: string;
  createdAt?: string;
}

export interface WaterIntake {
  id?: string;
  userId?: string;
  amountMl: number;
  loggedAt: string;
  createdAt?: string;
}

export interface DailyNutrition {
  date: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalFiber: number;
  waterIntakeMl: number;
  mealEntries: MealEntry[];
}

export interface MacroGoals {
  id?: string;
  userId?: string;
  dailyCalories: number;
  dailyProtein: number;
  dailyCarbs: number;
  dailyFat: number;
  dailyWaterMl: number;
  updatedAt?: string;
}

class NutritionService {
  // Food Database Methods
  async searchFoods(searchTerm: string): Promise<Food[]> {
    try {
      const { data, error } = await supabase
        .from('Food')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,brand.ilike.%${searchTerm}%`)
        .order('verified', { ascending: false })
        .order('name')
        .limit(20);
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching foods:', error);
      return [];
    }
  }

  async getFoodByBarcode(barcode: string): Promise<Food | null> {
    try {
      const { data, error } = await supabase
        .from('Food')
        .select('*')
        .eq('barcode', barcode)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching food by barcode:', error);
      return null;
    }
  }

  async createFood(food: Omit<Food, 'id' | 'created_at'>): Promise<Food | null> {
    try {
      const { data, error } = await supabase
        .from('Food')
        .insert(food)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating food:', error);
      return null;
    }
  }

  // Meal Logging Methods
  async logMeal(mealEntry: Omit<MealEntry, 'id' | 'userId' | 'created_at'>): Promise<MealEntry | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('MealEntry')
        .insert({
          userId: user.id,
          foodId: mealEntry.foodId,
          mealType: mealEntry.mealType,
          quantity: mealEntry.quantity,
          servingSize: mealEntry.servingSize,
          calories: mealEntry.calories,
          protein: mealEntry.protein,
          carbs: mealEntry.carbs,
          fat: mealEntry.fat,
          loggedAt: mealEntry.loggedAt
        })
        .select(`
          *,
          food:Food(*)
        `)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error logging meal:', error);
      return null;
    }
  }

  async updateMealEntry(entryId: string, updates: Partial<MealEntry>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('MealEntry')
        .update(updates)
        .eq('id', entryId);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating meal entry:', error);
      return false;
    }
  }

  async deleteMealEntry(entryId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('MealEntry')
        .delete()
        .eq('id', entryId);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting meal entry:', error);
      return false;
    }
  }

  // Daily Nutrition Methods
  async getDailyNutrition(date: string): Promise<DailyNutrition | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const startOfDay = `${date}T00:00:00.000Z`;
      const endOfDay = `${date}T23:59:59.999Z`;

      // Get meal entries for the day
      const { data: mealEntries, error: mealError } = await supabase
        .from('MealEntry')
        .select(`
          *,
          food:Food(*)
        `)
        .eq('userId', user.id)
        .gte('loggedAt', startOfDay)
        .lte('loggedAt', endOfDay)
        .order('loggedAt');

      if (mealError) throw mealError;

      // Get water intake for the day
      const { data: waterIntakes, error: waterError } = await supabase
        .from('WaterIntake')
        .select('amountMl')
        .eq('userId', user.id)
        .gte('loggedAt', startOfDay)
        .lte('loggedAt', endOfDay);

      if (waterError) throw waterError;

      // Calculate totals
      const meals = mealEntries || [];
      const totalWater = (waterIntakes || []).reduce((sum, w) => sum + w.amountMl, 0);

      const dailyNutrition: DailyNutrition = {
        date,
        totalCalories: meals.reduce((sum, m) => sum + m.calories, 0),
        totalProtein: meals.reduce((sum, m) => sum + m.protein, 0),
        totalCarbs: meals.reduce((sum, m) => sum + m.carbs, 0),
        totalFat: meals.reduce((sum, m) => sum + m.fat, 0),
        totalFiber: meals.reduce((sum, m) => sum + (m.food?.fiberPerServing || 0) * (m.quantity / m.food?.servingSize || 1), 0),
        waterIntakeMl: totalWater,
        mealEntries: meals
      };

      return dailyNutrition;
    } catch (error) {
      console.error('Error fetching daily nutrition:', error);
      return null;
    }
  }

  async getMealsByType(date: string, mealType: MealEntry['mealType']): Promise<MealEntry[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const startOfDay = `${date}T00:00:00.000Z`;
      const endOfDay = `${date}T23:59:59.999Z`;

      const { data, error } = await supabase
        .from('MealEntry')
        .select(`
          *,
          food:Food(*)
        `)
        .eq('userId', user.id)
        .eq('mealType', mealType)
        .gte('loggedAt', startOfDay)
        .lte('loggedAt', endOfDay)
        .order('loggedAt');
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching meals by type:', error);
      return [];
    }
  }

  // Water Intake Methods
  async logWater(amountMl: number, loggedAt?: string): Promise<WaterIntake | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('WaterIntake')
        .insert({
          userId: user.id,
          amountMl: amountMl, // Column is 'amountMl' in database
          unit: 'ml',
          loggedAt: loggedAt || new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error logging water:', error);
      return null;
    }
  }

  async getDailyWaterIntake(date: string): Promise<number> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const startOfDay = `${date}T00:00:00.000Z`;
      const endOfDay = `${date}T23:59:59.999Z`;

      const { data, error } = await supabase
        .from('WaterIntake')
        .select('amountMl')
        .eq('userId', user.id)
        .gte('loggedAt', startOfDay)
        .lte('loggedAt', endOfDay);
      
      if (error) throw error;
      return (data || []).reduce((sum, w) => sum + w.amountMl, 0);
    } catch (error) {
      console.error('Error fetching daily water intake:', error);
      return 0;
    }
  }

  // Macro Goals Methods
  async getMacroGoals(): Promise<MacroGoals | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('MacroGoals')
        .select('*')
        .eq('userId', user.id)
        .single();
      
      if (error) {
        // Return default goals if no custom goals set
        if (error.code === 'PGRST116') {
          return {
            userId: user.id,
            dailyCalories: 2000,
            dailyProtein: 150,
            dailyCarbs: 250,
            dailyFat: 67,
            dailyWaterMl: 2500
          };
        }
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching macro goals:', error);
      return null;
    }
  }

  async updateMacroGoals(goals: Omit<MacroGoals, 'id' | 'userId' | 'updatedAt'>): Promise<MacroGoals | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('MacroGoals')
        .upsert({
          userId: user.id,
          dailyCalories: goals.dailyCalories,
          dailyProtein: goals.dailyProtein,
          dailyCarbs: goals.dailyCarbs,
          dailyFat: goals.dailyFat,
          dailyWaterMl: goals.dailyWaterMl,
          updatedAt: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating macro goals:', error);
      return null;
    }
  }

  // Nutrition Analytics Methods
  async getWeeklyNutritionTrends(startDate: string): Promise<any[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);

      const { data, error } = await supabase
        .from('MealEntry')
        .select('calories, protein, carbs, fat, loggedAt')
        .eq('userId', user.id)
        .gte('logged_at', startDate)
        .lte('logged_at', endDate.toISOString());
      
      if (error) throw error;

      // Group by date and calculate daily totals
      const dailyTotals = (data || []).reduce((acc, entry) => {
        const date = entry.loggedAt.split('T')[0];
        if (!acc[date]) {
          acc[date] = { date, calories: 0, protein: 0, carbs: 0, fat: 0 };
        }
        acc[date].calories += entry.calories;
        acc[date].protein += entry.protein;
        acc[date].carbs += entry.carbs;
        acc[date].fat += entry.fat;
        return acc;
      }, {});

      return Object.values(dailyTotals);
    } catch (error) {
      console.error('Error fetching nutrition trends:', error);
      return [];
    }
  }

  async getNutritionStats(): Promise<any> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data, error } = await supabase
        .from('MealEntry')
        .select('calories, protein, carbs, fat, loggedAt')
        .eq('userId', user.id)
        .gte('loggedAt', weekAgo.toISOString());
      
      if (error) throw error;

      const entries = data || [];
      const totalEntries = entries.length;

      if (totalEntries === 0) {
        return {
          weeklyAverage: { calories: 0, protein: 0, carbs: 0, fat: 0 },
          totalMealsLogged: 0,
          daysWithEntries: 0
        };
      }

      const totals = entries.reduce((acc, entry) => ({
        calories: acc.calories + entry.calories,
        protein: acc.protein + entry.protein,
        carbs: acc.carbs + entry.carbs,
        fat: acc.fat + entry.fat
      }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

      const uniqueDays = new Set(entries.map(e => e.loggedAt.split('T')[0])).size;

      return {
        weeklyAverage: {
          calories: Math.round(totals.calories / uniqueDays),
          protein: Math.round(totals.protein / uniqueDays),
          carbs: Math.round(totals.carbs / uniqueDays),
          fat: Math.round(totals.fat / uniqueDays)
        },
        totalMealsLogged: totalEntries,
        daysWithEntries: uniqueDays
      };
    } catch (error) {
      console.error('Error fetching nutrition stats:', error);
      return null;
    }
  }
}

export const nutritionService = new NutritionService();