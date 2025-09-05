import { supabase } from './supabase.client';

export interface BodyMeasurement {
  id?: string;
  userId?: string;
  measurementType: 'weight' | 'bodyFat' | 'muscleMass' | 'chest' | 'waist' | 'hips' | 'bicep' | 'thigh' | 'neck' | 'forearm' | 'calf';
  value: number;
  unit: string;
  measuredAt: string;
  notes?: string;
  createdAt?: string;
}

export interface ProgressPhoto {
  id?: string;
  userId?: string;
  photoUrl: string;
  photoType: 'front' | 'side' | 'back' | 'progress' | 'before' | 'after';
  takenAt: string;
  notes?: string;
  isPrivate: boolean;
  createdAt?: string;
}

export interface WellnessRating {
  id?: string;
  userId?: string;
  date: string;
  moodRating: number; // 1-10 scale
  energyRating: number; // 1-10 scale
  sleepQuality: number; // 1-10 scale
  stressLevel: number; // 1-10 scale
  motivationLevel: number; // 1-10 scale
  sorenessLevel: number; // 1-10 scale
  notes?: string;
  createdAt?: string;
}

export interface GoalProgress {
  id?: string;
  userId?: string;
  goalType: 'weightLoss' | 'weightGain' | 'muscleGain' | 'strength' | 'endurance' | 'bodyFat' | 'custom';
  goalName: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  targetDate?: string;
  isAchieved: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProgressSummary {
  weightTrend: {
    current: number;
    previous: number;
    change: number;
    changePercent: number;
  };
  measurementChanges: {
    [key: string]: {
      current: number;
      previous: number;
      change: number;
    };
  };
  recentPhotos: ProgressPhoto[];
  goalProgress: {
    active: number;
    achieved: number;
    totalProgress: number;
  };
  wellnessAverages: {
    mood: number;
    energy: number;
    sleep: number;
  };
}

class ProgressService {
  // Body Measurements Methods
  async logMeasurement(measurement: Omit<BodyMeasurement, 'id' | 'userId' | 'createdAt'>): Promise<BodyMeasurement | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('BodyMeasurement')
        .insert({
          userId: user.id,
          measurementType: measurement.measurementType,
          value: measurement.value,
          unit: measurement.unit,
          measuredAt: measurement.measuredAt,
          notes: measurement.notes
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error logging measurement:', error);
      return null;
    }
  }

  async getMeasurements(type?: BodyMeasurement['measurementType'], limit?: number): Promise<BodyMeasurement[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      let query = supabase
        .from('BodyMeasurement')
        .select('*')
        .eq('userId', user.id);

      if (type) {
        query = query.eq('measurementType', type);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query.order('measuredAt', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching measurements:', error);
      return [];
    }
  }

  async getLatestMeasurement(type: BodyMeasurement['measurementType']): Promise<BodyMeasurement | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('BodyMeasurement')
        .select('*')
        .eq('userId', user.id)
        .eq('measurementType', type)
        .order('measuredAt', { ascending: false })
        .limit(1)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null; // No data found
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Error fetching latest measurement:', error);
      return null;
    }
  }

  async updateMeasurement(measurementId: string, updates: Partial<BodyMeasurement>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('BodyMeasurement')
        .update(updates)
        .eq('id', measurementId);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating measurement:', error);
      return false;
    }
  }

  async deleteMeasurement(measurementId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('BodyMeasurement')
        .delete()
        .eq('id', measurementId);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting measurement:', error);
      return false;
    }
  }

  // Progress Photos Methods
  async uploadProgressPhoto(photo: Omit<ProgressPhoto, 'id' | 'userId' | 'createdAt'>): Promise<ProgressPhoto | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('ProgressPhoto')
        .insert({
          userId: user.id,
          photoUrl: photo.photoUrl,
          photoType: photo.photoType,
          takenAt: photo.takenAt,
          notes: photo.notes,
          isPrivate: photo.isPrivate
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error uploading progress photo:', error);
      return null;
    }
  }

  async getProgressPhotos(type?: ProgressPhoto['photoType'], limit?: number): Promise<ProgressPhoto[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      let query = supabase
        .from('ProgressPhoto')
        .select('*')
        .eq('userId', user.id);

      if (type) {
        query = query.eq('photoType', type);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query.order('takenAt', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching progress photos:', error);
      return [];
    }
  }

  async deleteProgressPhoto(photoId: string): Promise<boolean> {
    try {
      // Get photo data to delete from storage
      const { data: photo, error: fetchError } = await supabase
        .from('ProgressPhoto')
        .select('photoUrl')
        .eq('id', photoId)
        .single();

      if (fetchError) throw fetchError;

      // Delete from storage if it exists
      if (photo?.photoUrl) {
        const fileName = photo.photoUrl.split('/').pop();
        if (fileName) {
          await supabase.storage
            .from('progress-photos')
            .remove([fileName]);
        }
      }

      // Delete from database
      const { error } = await supabase
        .from('ProgressPhoto')
        .delete()
        .eq('id', photoId);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting progress photo:', error);
      return false;
    }
  }

  // Wellness Ratings Methods
  async logWellnessRating(rating: Omit<WellnessRating, 'id' | 'userId' | 'createdAt'>): Promise<WellnessRating | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('WellnessRating')
        .upsert({
          userId: user.id,
          date: rating.date,
          moodRating: rating.moodRating,
          energyRating: rating.energyRating,
          sleepQuality: rating.sleepQuality,
          stressLevel: rating.stressLevel,
          motivationLevel: rating.motivationLevel,
          sorenessLevel: rating.sorenessLevel,
          notes: rating.notes
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error logging wellness rating:', error);
      return null;
    }
  }

  async getWellnessRating(date: string): Promise<WellnessRating | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('WellnessRating')
        .select('*')
        .eq('userId', user.id)
        .eq('date', date)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null; // No data found
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Error fetching wellness rating:', error);
      return null;
    }
  }

  async getWellnessHistory(days: number = 30): Promise<WellnessRating[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('WellnessRating')
        .select('*')
        .eq('userId', user.id)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching wellness history:', error);
      return [];
    }
  }

  // Goal Progress Methods
  async createGoal(goal: Omit<GoalProgress, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<GoalProgress | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('GoalProgress')
        .insert({
          userId: user.id,
          goalType: goal.goalType,
          goalName: goal.goalName,
          targetValue: goal.targetValue,
          currentValue: goal.currentValue,
          unit: goal.unit,
          targetDate: goal.targetDate,
          isAchieved: goal.isAchieved
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating goal:', error);
      return null;
    }
  }

  async updateGoalProgress(goalId: string, currentValue: number): Promise<boolean> {
    try {
      const { data: goal, error: fetchError } = await supabase
        .from('GoalProgress')
        .select('targetValue, goalType')
        .eq('id', goalId)
        .single();

      if (fetchError) throw fetchError;

      // Determine if goal is achieved based on goal type
      let isAchieved = false;
      if (goal.goalType === 'weightLoss') {
        isAchieved = currentValue <= goal.targetValue;
      } else if (goal.goalType === 'weightGain' || goal.goalType === 'muscleGain' || goal.goalType === 'strength') {
        isAchieved = currentValue >= goal.targetValue;
      } else {
        isAchieved = currentValue >= goal.targetValue;
      }

      const { error } = await supabase
        .from('GoalProgress')
        .update({
          currentValue: currentValue,
          isAchieved: isAchieved,
          updatedAt: new Date().toISOString()
        })
        .eq('id', goalId);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating goal progress:', error);
      return false;
    }
  }

  async getGoals(activeOnly: boolean = true): Promise<GoalProgress[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      let query = supabase
        .from('GoalProgress')
        .select('*')
        .eq('userId', user.id);

      if (activeOnly) {
        query = query.eq('isAchieved', false);
      }

      const { data, error } = await query.order('createdAt', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching goals:', error);
      return [];
    }
  }

  async deleteGoal(goalId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('GoalProgress')
        .delete()
        .eq('id', goalId);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting goal:', error);
      return false;
    }
  }

  // Progress Summary and Analytics Methods
  async getProgressSummary(): Promise<ProgressSummary | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Get current and previous weight
      const currentWeight = await this.getLatestMeasurement('weight');
      const { data: weightHistory, error: weightError } = await supabase
        .from('BodyMeasurement')
        .select('value, measuredAt')
        .eq('userId', user.id)
        .eq('measurementType', 'weight')
        .order('measuredAt', { ascending: false })
        .limit(2);

      if (weightError) throw weightError;

      const weightTrend = {
        current: currentWeight?.value || 0,
        previous: weightHistory?.[1]?.value || currentWeight?.value || 0,
        change: 0,
        changePercent: 0
      };

      if (weightTrend.current && weightTrend.previous) {
        weightTrend.change = weightTrend.current - weightTrend.previous;
        weightTrend.changePercent = (weightTrend.change / weightTrend.previous) * 100;
      }

      // Get recent photos
      const recentPhotos = await this.getProgressPhotos(undefined, 3);

      // Get goals summary
      const activeGoals = await this.getGoals(true);
      const achievedGoals = await this.getGoals(false);
      const totalActiveGoals = activeGoals.length;
      const totalAchievedGoals = achievedGoals.filter(g => g.isAchieved).length;
      
      let totalProgress = 0;
      if (activeGoals.length > 0) {
        totalProgress = activeGoals.reduce((sum, goal) => {
          const progress = Math.min((goal.currentValue / goal.targetValue) * 100, 100);
          return sum + progress;
        }, 0) / activeGoals.length;
      }

      // Get wellness averages (last 7 days)
      const wellnessHistory = await this.getWellnessHistory(7);
      const wellnessAverages = {
        mood: 0,
        energy: 0,
        sleep: 0
      };

      if (wellnessHistory.length > 0) {
        wellnessAverages.mood = wellnessHistory.reduce((sum, w) => sum + w.moodRating, 0) / wellnessHistory.length;
        wellnessAverages.energy = wellnessHistory.reduce((sum, w) => sum + w.energyRating, 0) / wellnessHistory.length;
        wellnessAverages.sleep = wellnessHistory.reduce((sum, w) => sum + w.sleepQuality, 0) / wellnessHistory.length;
      }

      // Get measurement changes (placeholder for now - would need more complex logic)
      const measurementChanges = {};

      return {
        weightTrend,
        measurementChanges,
        recentPhotos,
        goalProgress: {
          active: totalActiveGoals,
          achieved: totalAchievedGoals,
          totalProgress: Math.round(totalProgress)
        },
        wellnessAverages: {
          mood: Math.round(wellnessAverages.mood * 10) / 10,
          energy: Math.round(wellnessAverages.energy * 10) / 10,
          sleep: Math.round(wellnessAverages.sleep * 10) / 10
        }
      };
    } catch (error) {
      console.error('Error fetching progress summary:', error);
      return null;
    }
  }

  async getProgressChartData(type: BodyMeasurement['measurementType'], days: number = 30): Promise<any[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('BodyMeasurement')
        .select('value, measuredAt')
        .eq('userId', user.id)
        .eq('measurementType', type)
        .gte('measuredAt', startDate.toISOString())
        .order('measuredAt', { ascending: true });
      
      if (error) throw error;

      return (data || []).map(measurement => ({
        date: measurement.measuredAt.split('T')[0],
        value: measurement.value
      }));
    } catch (error) {
      console.error('Error fetching chart data:', error);
      return [];
    }
  }

  async getProgressStats(): Promise<any> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Count measurements in last 30 days
      const { data: measurements, error: measurementError } = await supabase
        .from('BodyMeasurement')
        .select('id, measuredAt')
        .eq('userId', user.id)
        .gte('measuredAt', thirtyDaysAgo.toISOString());

      if (measurementError) throw measurementError;

      // Count photos in last 30 days
      const { data: photos, error: photoError } = await supabase
        .from('ProgressPhoto')
        .select('id, takenAt')
        .eq('userId', user.id)
        .gte('takenAt', thirtyDaysAgo.toISOString());

      if (photoError) throw photoError;

      // Count wellness entries in last 30 days
      const { data: wellness, error: wellnessError } = await supabase
        .from('WellnessRating')
        .select('id, date')
        .eq('userId', user.id)
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0]);

      if (wellnessError) throw wellnessError;

      // Count active and completed goals
      const { data: goals, error: goalError } = await supabase
        .from('GoalProgress')
        .select('isAchieved')
        .eq('userId', user.id);

      if (goalError) throw goalError;

      const activeGoals = (goals || []).filter(g => !g.isAchieved).length;
      const completedGoals = (goals || []).filter(g => g.isAchieved).length;

      return {
        measurementsLogged: measurements?.length || 0,
        photosUploaded: photos?.length || 0,
        wellnessEntries: wellness?.length || 0,
        activeGoals,
        completedGoals,
        trackingDays: new Set([
          ...(measurements || []).map(m => m.measuredAt.split('T')[0]),
          ...(photos || []).map(p => p.takenAt.split('T')[0]),
          ...(wellness || []).map(w => w.date)
        ]).size
      };
    } catch (error) {
      console.error('Error fetching progress stats:', error);
      return null;
    }
  }
}

export const progressService = new ProgressService();