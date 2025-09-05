-- ⚠️ RUN THIS IN SUPABASE SQL EDITOR NOW ⚠️
-- This creates all the missing tables needed for FitFlow Sprint 3

-- Create BodyMeasurement table
CREATE TABLE IF NOT EXISTS "BodyMeasurement" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "measurementType" TEXT NOT NULL,
    "value" DECIMAL(10, 2) NOT NULL,
    "unit" TEXT NOT NULL,
    "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BodyMeasurement_pkey" PRIMARY KEY ("id")
);

-- Create WellnessRating table
CREATE TABLE IF NOT EXISTS "WellnessRating" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "moodRating" INTEGER NOT NULL CHECK ("moodRating" >= 1 AND "moodRating" <= 10),
    "energyRating" INTEGER NOT NULL CHECK ("energyRating" >= 1 AND "energyRating" <= 10),
    "sleepQuality" INTEGER NOT NULL CHECK ("sleepQuality" >= 1 AND "sleepQuality" <= 10),
    "stressLevel" INTEGER NOT NULL CHECK ("stressLevel" >= 1 AND "stressLevel" <= 10),
    "motivationLevel" INTEGER CHECK ("motivationLevel" >= 1 AND "motivationLevel" <= 10),
    "sorenessLevel" INTEGER CHECK ("sorenessLevel" >= 1 AND "sorenessLevel" <= 10),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WellnessRating_pkey" PRIMARY KEY ("id")
);

-- Create ProgressPhoto table
CREATE TABLE IF NOT EXISTS "ProgressPhoto" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "photoUrl" TEXT NOT NULL,
    "photoType" TEXT NOT NULL,
    "takenAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProgressPhoto_pkey" PRIMARY KEY ("id")
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
    "amount" INTEGER NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'oz',
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WaterIntake_pkey" PRIMARY KEY ("id")
);

-- Create WorkoutExercise table
CREATE TABLE IF NOT EXISTS "WorkoutExercise" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "workoutId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "restTime" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkoutExercise_pkey" PRIMARY KEY ("id")
);

-- Enable Row Level Security on all new tables
ALTER TABLE "BodyMeasurement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WellnessRating" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProgressPhoto" ENABLE ROW LEVEL SECURITY;
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

-- Create RLS policies for WorkoutExercise (allow users to manage exercises in their workouts)
CREATE POLICY "Users can view workout exercises" ON "WorkoutExercise"
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM "Workout" WHERE "Workout"."id" = "WorkoutExercise"."workoutId" 
        AND "Workout"."userId" = auth.uid()::text
    ));
CREATE POLICY "Users can create workout exercises" ON "WorkoutExercise"
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM "Workout" WHERE "Workout"."id" = "WorkoutExercise"."workoutId" 
        AND "Workout"."userId" = auth.uid()::text
    ));
CREATE POLICY "Users can update workout exercises" ON "WorkoutExercise"
    FOR UPDATE USING (EXISTS (
        SELECT 1 FROM "Workout" WHERE "Workout"."id" = "WorkoutExercise"."workoutId" 
        AND "Workout"."userId" = auth.uid()::text
    ));
CREATE POLICY "Users can delete workout exercises" ON "WorkoutExercise"
    FOR DELETE USING (EXISTS (
        SELECT 1 FROM "Workout" WHERE "Workout"."id" = "WorkoutExercise"."workoutId" 
        AND "Workout"."userId" = auth.uid()::text
    ));

-- SUCCESS MESSAGE
SELECT 'SUCCESS: All missing tables have been created! Your FitFlow app should now work properly.' AS status;