import { supabase } from './supabase.client';

export interface Exercise {
  id: string;
  name: string;
  category: string;
  primary_muscle: string;
  secondary_muscles?: string[];
  equipment: string;
  instructions?: string;
  createdAt?: string;
}

export interface WorkoutSession {
  id?: string;
  user_id?: string;
  name: string;
  start_time: string;
  end_time?: string;
  duration?: number;
  total_volume?: number;
  exercises_count?: number;
  notes?: string;
  createdAt?: string;
}

export interface WorkoutExercise {
  id?: string;
  workout_id: string;
  exercise_id: string;
  exercise?: Exercise;
  sets: WorkoutSet[];
  notes?: string;
  rest_time?: number;
}

export interface WorkoutSet {
  id?: string;
  workout_exercise_id?: string;
  set_number: number;
  weight: number;
  reps: number;
  completed: boolean;
  rpe?: number; // Rate of Perceived Exertion (1-10)
}

class WorkoutService {
  // Exercise Database Methods
  async getExercises(category?: string): Promise<Exercise[]> {
    try {
      let query = supabase.from('Exercise').select('*');
      
      if (category && category !== 'All') {
        query = query.eq('category', category);
      }
      
      const { data, error } = await query.order('name');
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching exercises:', error);
      return [];
    }
  }

  async searchExercises(searchTerm: string): Promise<Exercise[]> {
    try {
      const { data, error } = await supabase
        .from('Exercise')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,primary_muscle.ilike.%${searchTerm}%`)
        .order('name')
        .limit(20);
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching exercises:', error);
      return [];
    }
  }

  // Workout Session Methods
  async createWorkout(workout: WorkoutSession): Promise<WorkoutSession | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('Workout')
        .insert({
          userId: user.id,
          name: workout.name,
          description: workout.notes,
          duration: workout.duration,
          calories: 0
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating workout:', error);
      return null;
    }
  }

  async updateWorkout(workoutId: string, updates: Partial<WorkoutSession>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('Workout')
        .update(updates)
        .eq('id', workoutId);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating workout:', error);
      return false;
    }
  }

  async finishWorkout(workoutId: string, endTime: string, duration: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('Workout')
        .update({
          completedAt: endTime,
          duration
        })
        .eq('id', workoutId);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error finishing workout:', error);
      return false;
    }
  }

  async getRecentWorkouts(limit: number = 10): Promise<WorkoutSession[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('Workout')
        .select('*')
        .eq('userId', user.id)
        .order('createdAt', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching recent workouts:', error);
      return [];
    }
  }

  async getWorkoutDetails(workoutId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('Workout')
        .select('*')
        .eq('id', workoutId)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching workout details:', error);
      return null;
    }
  }

  // Workout Exercise Methods
  async addExerciseToWorkout(workoutId: string, exerciseId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('WorkoutExercise')
        .insert({
          workoutId: workoutId,
          exerciseId: exerciseId
        })
        .select('id')
        .single();
      
      if (error) throw error;
      return data?.id || null;
    } catch (error) {
      console.error('Error adding exercise to workout:', error);
      return null;
    }
  }

  // Set Methods
  async addSet(workoutExerciseId: string, set: WorkoutSet): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('Set')
        .insert({
          workoutExerciseId: workoutExerciseId,
          setNumber: set.set_number,
          weight: set.weight,
          reps: set.reps,
          completed: set.completed,
          rpe: set.rpe
        });
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error adding set:', error);
      return false;
    }
  }

  async updateSet(setId: string, updates: Partial<WorkoutSet>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('Set')
        .update(updates)
        .eq('id', setId);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating set:', error);
      return false;
    }
  }

  // Stats Methods
  async getWeeklyStats(): Promise<any> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data, error } = await supabase
        .from('Workout')
        .select('*')
        .eq('userId', user.id)
        .gte('createdAt', weekAgo.toISOString())
        .order('createdAt', { ascending: false });
      
      if (error) throw error;

      const stats = {
        totalWorkouts: data?.length || 0,
        totalMinutes: data?.reduce((sum, w) => sum + (w.duration || 0), 0) || 0,
        totalVolume: data?.reduce((sum, w) => sum + (w.total_volume || 0), 0) || 0,
        workoutDays: new Set(data?.map(w => new Date(w.createdAt).toDateString())).size
      };

      return stats;
    } catch (error) {
      console.error('Error fetching weekly stats:', error);
      return null;
    }
  }

  async getPersonalRecords(exerciseId?: string): Promise<any[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      let query = supabase
        .from('PersonalRecord')
        .select(`
          *,
          exercise:Exercise(name, category)
        `)
        .eq('userId', user.id);
      
      if (exerciseId) {
        query = query.eq('exercise_id', exerciseId);
      }

      const { data, error } = await query.order('weight', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching personal records:', error);
      return [];
    }
  }
}

export const workoutService = new WorkoutService();