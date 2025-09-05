-- Extended Schema for FitFlow - Additional Tables
-- Run this in Supabase SQL Editor after the main schema

-- Create BodyMeasurement table
CREATE TABLE IF NOT EXISTS "BodyMeasurement" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "measurementType" TEXT NOT NULL, -- weight, body_fat, muscle_mass, chest, waist, hips, etc.
    "value" DECIMAL(10, 2) NOT NULL,
    "unit" TEXT NOT NULL, -- lbs, kg, %, inches, cm
    "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "BodyMeasurement_pkey" PRIMARY KEY ("id")
);

-- Create WellnessRating table
CREATE TABLE IF NOT EXISTS "WellnessRating" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "mood" INTEGER NOT NULL CHECK ("mood" >= 1 AND "mood" <= 10),
    "energy" INTEGER NOT NULL CHECK ("energy" >= 1 AND "energy" <= 10),
    "sleep" INTEGER NOT NULL CHECK ("sleep" >= 1 AND "sleep" <= 10),
    "stress" INTEGER NOT NULL CHECK ("stress" >= 1 AND "stress" <= 10),
    "motivation" INTEGER CHECK ("motivation" >= 1 AND "motivation" <= 10),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "WellnessRating_pkey" PRIMARY KEY ("id")
);

-- Create ProgressPhoto table
CREATE TABLE IF NOT EXISTS "ProgressPhoto" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "photoUrl" TEXT NOT NULL,
    "photoType" TEXT NOT NULL, -- front, side, back, other
    "takenAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "ProgressPhoto_pkey" PRIMARY KEY ("id")
);

-- Create GoalProgress table
CREATE TABLE IF NOT EXISTS "GoalProgress" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "goalId" TEXT NOT NULL,
    "value" DECIMAL(10, 2) NOT NULL,
    "notes" TEXT,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "GoalProgress_pkey" PRIMARY KEY ("id")
);

-- Create MacroGoals table
CREATE TABLE IF NOT EXISTS "MacroGoals" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "calories" INTEGER NOT NULL,
    "protein" INTEGER NOT NULL,
    "carbs" INTEGER NOT NULL,
    "fat" INTEGER NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "MacroGoals_pkey" PRIMARY KEY ("id")
);

-- Create MealEntry table  
CREATE TABLE IF NOT EXISTS "MealEntry" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "mealId" TEXT NOT NULL,
    "foodId" TEXT NOT NULL,
    "quantity" DECIMAL(10, 2) NOT NULL,
    "unit" TEXT NOT NULL,
    "calories" INTEGER NOT NULL,
    "protein" DECIMAL(10, 2) NOT NULL,
    "carbs" DECIMAL(10, 2) NOT NULL,
    "fat" DECIMAL(10, 2) NOT NULL,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "MealEntry_pkey" PRIMARY KEY ("id")
);

-- Create WaterIntake table
CREATE TABLE IF NOT EXISTS "WaterIntake" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL, -- in ml or oz
    "unit" TEXT NOT NULL DEFAULT 'oz',
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "WaterIntake_pkey" PRIMARY KEY ("id")
);

-- Create WorkoutExercise table (link between Workout and Exercise)
CREATE TABLE IF NOT EXISTS "WorkoutExercise" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "workoutId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "restTime" INTEGER, -- in seconds
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "WorkoutExercise_pkey" PRIMARY KEY ("id")
);

-- Add indexes
CREATE INDEX "BodyMeasurement_userId_idx" ON "BodyMeasurement"("userId");
CREATE INDEX "BodyMeasurement_measuredAt_idx" ON "BodyMeasurement"("measuredAt");
CREATE INDEX "WellnessRating_userId_idx" ON "WellnessRating"("userId");
CREATE INDEX "WellnessRating_date_idx" ON "WellnessRating"("date");
CREATE INDEX "ProgressPhoto_userId_idx" ON "ProgressPhoto"("userId");
CREATE INDEX "GoalProgress_goalId_idx" ON "GoalProgress"("goalId");
CREATE INDEX "MacroGoals_userId_idx" ON "MacroGoals"("userId");
CREATE INDEX "MealEntry_userId_idx" ON "MealEntry"("userId");
CREATE INDEX "MealEntry_mealId_idx" ON "MealEntry"("mealId");
CREATE INDEX "WaterIntake_userId_idx" ON "WaterIntake"("userId");
CREATE INDEX "WorkoutExercise_workoutId_idx" ON "WorkoutExercise"("workoutId");
CREATE INDEX "WorkoutExercise_exerciseId_idx" ON "WorkoutExercise"("exerciseId");

-- Add foreign key constraints
ALTER TABLE "BodyMeasurement" ADD CONSTRAINT "BodyMeasurement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WellnessRating" ADD CONSTRAINT "WellnessRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProgressPhoto" ADD CONSTRAINT "ProgressPhoto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GoalProgress" ADD CONSTRAINT "GoalProgress_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MacroGoals" ADD CONSTRAINT "MacroGoals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MealEntry" ADD CONSTRAINT "MealEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MealEntry" ADD CONSTRAINT "MealEntry_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "Meal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MealEntry" ADD CONSTRAINT "MealEntry_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "Food"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WaterIntake" ADD CONSTRAINT "WaterIntake_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkoutExercise" ADD CONSTRAINT "WorkoutExercise_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkoutExercise" ADD CONSTRAINT "WorkoutExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enable Row Level Security
ALTER TABLE "BodyMeasurement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WellnessRating" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProgressPhoto" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GoalProgress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MacroGoals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MealEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WaterIntake" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkoutExercise" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for BodyMeasurement
CREATE POLICY "Users can view own body measurements" ON "BodyMeasurement"
    FOR SELECT USING (auth.uid()::text = "userId");
CREATE POLICY "Users can create own body measurements" ON "BodyMeasurement"
    FOR INSERT WITH CHECK (auth.uid()::text = "userId");
CREATE POLICY "Users can update own body measurements" ON "BodyMeasurement"
    FOR UPDATE USING (auth.uid()::text = "userId");
CREATE POLICY "Users can delete own body measurements" ON "BodyMeasurement"
    FOR DELETE USING (auth.uid()::text = "userId");

-- Create RLS policies for WellnessRating
CREATE POLICY "Users can view own wellness ratings" ON "WellnessRating"
    FOR SELECT USING (auth.uid()::text = "userId");
CREATE POLICY "Users can create own wellness ratings" ON "WellnessRating"
    FOR INSERT WITH CHECK (auth.uid()::text = "userId");
CREATE POLICY "Users can update own wellness ratings" ON "WellnessRating"
    FOR UPDATE USING (auth.uid()::text = "userId");
CREATE POLICY "Users can delete own wellness ratings" ON "WellnessRating"
    FOR DELETE USING (auth.uid()::text = "userId");

-- Create RLS policies for ProgressPhoto
CREATE POLICY "Users can view own progress photos" ON "ProgressPhoto"
    FOR SELECT USING (auth.uid()::text = "userId");
CREATE POLICY "Users can create own progress photos" ON "ProgressPhoto"
    FOR INSERT WITH CHECK (auth.uid()::text = "userId");
CREATE POLICY "Users can update own progress photos" ON "ProgressPhoto"
    FOR UPDATE USING (auth.uid()::text = "userId");
CREATE POLICY "Users can delete own progress photos" ON "ProgressPhoto"
    FOR DELETE USING (auth.uid()::text = "userId");

-- Create RLS policies for MacroGoals
CREATE POLICY "Users can view own macro goals" ON "MacroGoals"
    FOR SELECT USING (auth.uid()::text = "userId");
CREATE POLICY "Users can create own macro goals" ON "MacroGoals"
    FOR INSERT WITH CHECK (auth.uid()::text = "userId");
CREATE POLICY "Users can update own macro goals" ON "MacroGoals"
    FOR UPDATE USING (auth.uid()::text = "userId");
CREATE POLICY "Users can delete own macro goals" ON "MacroGoals"
    FOR DELETE USING (auth.uid()::text = "userId");

-- Create RLS policies for MealEntry
CREATE POLICY "Users can view own meal entries" ON "MealEntry"
    FOR SELECT USING (auth.uid()::text = "userId");
CREATE POLICY "Users can create own meal entries" ON "MealEntry"
    FOR INSERT WITH CHECK (auth.uid()::text = "userId");
CREATE POLICY "Users can update own meal entries" ON "MealEntry"
    FOR UPDATE USING (auth.uid()::text = "userId");
CREATE POLICY "Users can delete own meal entries" ON "MealEntry"
    FOR DELETE USING (auth.uid()::text = "userId");

-- Create RLS policies for WaterIntake
CREATE POLICY "Users can view own water intake" ON "WaterIntake"
    FOR SELECT USING (auth.uid()::text = "userId");
CREATE POLICY "Users can create own water intake" ON "WaterIntake"
    FOR INSERT WITH CHECK (auth.uid()::text = "userId");
CREATE POLICY "Users can update own water intake" ON "WaterIntake"
    FOR UPDATE USING (auth.uid()::text = "userId");
CREATE POLICY "Users can delete own water intake" ON "WaterIntake"
    FOR DELETE USING (auth.uid()::text = "userId");