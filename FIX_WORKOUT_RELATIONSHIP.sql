-- Fix WorkoutExercise foreign key relationship
-- Run this in Supabase SQL Editor

-- Add foreign key from WorkoutExercise to Workout
ALTER TABLE "WorkoutExercise" 
ADD CONSTRAINT "WorkoutExercise_workoutId_fkey" 
FOREIGN KEY ("workoutId") 
REFERENCES "Workout"("id") 
ON DELETE CASCADE 
ON UPDATE CASCADE;

-- Add foreign key from WorkoutExercise to Exercise  
ALTER TABLE "WorkoutExercise"
ADD CONSTRAINT "WorkoutExercise_exerciseId_fkey"
FOREIGN KEY ("exerciseId")
REFERENCES "Exercise"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- Verify the relationships are created
SELECT 'Foreign key relationships added successfully!' AS status;