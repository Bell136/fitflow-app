-- FitFlow Database Schema for Supabase
-- Run this in your Supabase SQL Editor

-- Create ENUM types
CREATE TYPE "Provider" AS ENUM ('LOCAL', 'GOOGLE', 'APPLE');
CREATE TYPE "GoalCategory" AS ENUM ('WEIGHT_LOSS', 'MUSCLE_GAIN', 'ENDURANCE', 'STRENGTH', 'FLEXIBILITY', 'NUTRITION', 'WELLNESS', 'CUSTOM');
CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'PAUSED', 'ARCHIVED');
CREATE TYPE "MealType" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'PRE_WORKOUT', 'POST_WORKOUT');
CREATE TYPE "ProgressType" AS ENUM ('WEIGHT', 'BODY_COMPOSITION', 'MEASUREMENTS', 'PHOTOS', 'PERFORMANCE');

-- Create User table
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "provider" "Provider" NOT NULL DEFAULT 'LOCAL',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "biometricEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- Create Session table
CREATE TABLE IF NOT EXISTS "Session" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "deviceId" TEXT,
    "deviceName" TEXT,
    "platform" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- Create PasswordReset table
CREATE TABLE IF NOT EXISTS "PasswordReset" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("id")
);

-- Create Goal table
CREATE TABLE IF NOT EXISTS "Goal" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "targetValue" DOUBLE PRECISION,
    "currentValue" DOUBLE PRECISION,
    "unit" TEXT,
    "category" "GoalCategory" NOT NULL,
    "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "targetDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- Create Workout table
CREATE TABLE IF NOT EXISTS "Workout" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "duration" INTEGER,
    "calories" INTEGER,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Workout_pkey" PRIMARY KEY ("id")
);

-- Create Exercise table
CREATE TABLE IF NOT EXISTS "Exercise" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "workoutId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

-- Create Set table
CREATE TABLE IF NOT EXISTS "Set" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "exerciseId" TEXT NOT NULL,
    "reps" INTEGER,
    "weight" DOUBLE PRECISION,
    "distance" DOUBLE PRECISION,
    "duration" INTEGER,
    "restTime" INTEGER,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Set_pkey" PRIMARY KEY ("id")
);

-- Create Meal table
CREATE TABLE IF NOT EXISTS "Meal" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "MealType" NOT NULL,
    "calories" INTEGER,
    "protein" DOUBLE PRECISION,
    "carbs" DOUBLE PRECISION,
    "fat" DOUBLE PRECISION,
    "fiber" DOUBLE PRECISION,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Meal_pkey" PRIMARY KEY ("id")
);

-- Create Food table
CREATE TABLE IF NOT EXISTS "Food" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "mealId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "barcode" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "calories" INTEGER NOT NULL,
    "protein" DOUBLE PRECISION NOT NULL,
    "carbs" DOUBLE PRECISION NOT NULL,
    "fat" DOUBLE PRECISION NOT NULL,
    "fiber" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Food_pkey" PRIMARY KEY ("id")
);

-- Create Progress table
CREATE TABLE IF NOT EXISTS "Progress" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "type" "ProgressType" NOT NULL,
    "weight" DOUBLE PRECISION,
    "bodyFat" DOUBLE PRECISION,
    "muscleMass" DOUBLE PRECISION,
    "measurements" JSONB,
    "photoUrl" TEXT,
    "notes" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Progress_pkey" PRIMARY KEY ("id")
);

-- Create unique indexes
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Session_accessToken_key" ON "Session"("accessToken");
CREATE UNIQUE INDEX "Session_refreshToken_key" ON "Session"("refreshToken");
CREATE UNIQUE INDEX "PasswordReset_code_key" ON "PasswordReset"("code");

-- Create indexes for better query performance
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_accessToken_idx" ON "Session"("accessToken");
CREATE INDEX "Session_refreshToken_idx" ON "Session"("refreshToken");
CREATE INDEX "PasswordReset_userId_idx" ON "PasswordReset"("userId");
CREATE INDEX "PasswordReset_code_idx" ON "PasswordReset"("code");
CREATE INDEX "Goal_userId_idx" ON "Goal"("userId");
CREATE INDEX "Workout_userId_idx" ON "Workout"("userId");
CREATE INDEX "Workout_completedAt_idx" ON "Workout"("completedAt");
CREATE INDEX "Exercise_workoutId_idx" ON "Exercise"("workoutId");
CREATE INDEX "Set_exerciseId_idx" ON "Set"("exerciseId");
CREATE INDEX "Meal_userId_idx" ON "Meal"("userId");
CREATE INDEX "Meal_loggedAt_idx" ON "Meal"("loggedAt");
CREATE INDEX "Food_mealId_idx" ON "Food"("mealId");
CREATE INDEX "Food_barcode_idx" ON "Food"("barcode");
CREATE INDEX "Progress_userId_idx" ON "Progress"("userId");
CREATE INDEX "Progress_recordedAt_idx" ON "Progress"("recordedAt");

-- Add foreign key constraints
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PasswordReset" ADD CONSTRAINT "PasswordReset_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Goal" ADD CONSTRAINT "Goal_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Workout" ADD CONSTRAINT "Workout_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_workoutId_fkey" 
    FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Set" ADD CONSTRAINT "Set_exerciseId_fkey" 
    FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Meal" ADD CONSTRAINT "Meal_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Food" ADD CONSTRAINT "Food_mealId_fkey" 
    FOREIGN KEY ("mealId") REFERENCES "Meal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Progress" ADD CONSTRAINT "Progress_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enable Row Level Security on all tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PasswordReset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Goal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Workout" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Exercise" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Set" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Meal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Food" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Progress" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for User table
CREATE POLICY "Users can view own profile" ON "User"
    FOR SELECT USING (auth.uid()::text = id);

CREATE POLICY "Users can update own profile" ON "User"
    FOR UPDATE USING (auth.uid()::text = id);

CREATE POLICY "Allow user creation during signup" ON "User"
    FOR INSERT WITH CHECK (true);

-- Create RLS policies for Session table
CREATE POLICY "Users can view own sessions" ON "Session"
    FOR SELECT USING (auth.uid()::text = "userId");

CREATE POLICY "Users can create own sessions" ON "Session"
    FOR INSERT WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can delete own sessions" ON "Session"
    FOR DELETE USING (auth.uid()::text = "userId");

-- Create RLS policies for Goal table
CREATE POLICY "Users can view own goals" ON "Goal"
    FOR SELECT USING (auth.uid()::text = "userId");

CREATE POLICY "Users can create own goals" ON "Goal"
    FOR INSERT WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can update own goals" ON "Goal"
    FOR UPDATE USING (auth.uid()::text = "userId");

CREATE POLICY "Users can delete own goals" ON "Goal"
    FOR DELETE USING (auth.uid()::text = "userId");

-- Create RLS policies for Workout table
CREATE POLICY "Users can view own workouts" ON "Workout"
    FOR SELECT USING (auth.uid()::text = "userId");

CREATE POLICY "Users can create own workouts" ON "Workout"
    FOR INSERT WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can update own workouts" ON "Workout"
    FOR UPDATE USING (auth.uid()::text = "userId");

CREATE POLICY "Users can delete own workouts" ON "Workout"
    FOR DELETE USING (auth.uid()::text = "userId");

-- Create RLS policies for Meal table
CREATE POLICY "Users can view own meals" ON "Meal"
    FOR SELECT USING (auth.uid()::text = "userId");

CREATE POLICY "Users can create own meals" ON "Meal"
    FOR INSERT WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can update own meals" ON "Meal"
    FOR UPDATE USING (auth.uid()::text = "userId");

CREATE POLICY "Users can delete own meals" ON "Meal"
    FOR DELETE USING (auth.uid()::text = "userId");

-- Create RLS policies for Progress table
CREATE POLICY "Users can view own progress" ON "Progress"
    FOR SELECT USING (auth.uid()::text = "userId");

CREATE POLICY "Users can create own progress" ON "Progress"
    FOR INSERT WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can update own progress" ON "Progress"
    FOR UPDATE USING (auth.uid()::text = "userId");

CREATE POLICY "Users can delete own progress" ON "Progress"
    FOR DELETE USING (auth.uid()::text = "userId");

-- Create RLS policies for Exercise table (based on workout ownership)
CREATE POLICY "Users can view exercises in own workouts" ON "Exercise"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM "Workout" 
            WHERE "Workout".id = "Exercise"."workoutId" 
            AND "Workout"."userId" = auth.uid()::text
        )
    );

CREATE POLICY "Users can create exercises in own workouts" ON "Exercise"
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM "Workout" 
            WHERE "Workout".id = "Exercise"."workoutId" 
            AND "Workout"."userId" = auth.uid()::text
        )
    );

CREATE POLICY "Users can update exercises in own workouts" ON "Exercise"
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM "Workout" 
            WHERE "Workout".id = "Exercise"."workoutId" 
            AND "Workout"."userId" = auth.uid()::text
        )
    );

CREATE POLICY "Users can delete exercises in own workouts" ON "Exercise"
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM "Workout" 
            WHERE "Workout".id = "Exercise"."workoutId" 
            AND "Workout"."userId" = auth.uid()::text
        )
    );

-- Create RLS policies for Set table (based on exercise/workout ownership)
CREATE POLICY "Users can view sets in own exercises" ON "Set"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM "Exercise" 
            JOIN "Workout" ON "Workout".id = "Exercise"."workoutId"
            WHERE "Exercise".id = "Set"."exerciseId" 
            AND "Workout"."userId" = auth.uid()::text
        )
    );

CREATE POLICY "Users can create sets in own exercises" ON "Set"
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM "Exercise" 
            JOIN "Workout" ON "Workout".id = "Exercise"."workoutId"
            WHERE "Exercise".id = "Set"."exerciseId" 
            AND "Workout"."userId" = auth.uid()::text
        )
    );

CREATE POLICY "Users can update sets in own exercises" ON "Set"
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM "Exercise" 
            JOIN "Workout" ON "Workout".id = "Exercise"."workoutId"
            WHERE "Exercise".id = "Set"."exerciseId" 
            AND "Workout"."userId" = auth.uid()::text
        )
    );

CREATE POLICY "Users can delete sets in own exercises" ON "Set"
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM "Exercise" 
            JOIN "Workout" ON "Workout".id = "Exercise"."workoutId"
            WHERE "Exercise".id = "Set"."exerciseId" 
            AND "Workout"."userId" = auth.uid()::text
        )
    );

-- Create RLS policies for Food table (based on meal ownership)
CREATE POLICY "Users can view foods in own meals" ON "Food"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM "Meal" 
            WHERE "Meal".id = "Food"."mealId" 
            AND "Meal"."userId" = auth.uid()::text
        )
    );

CREATE POLICY "Users can create foods in own meals" ON "Food"
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM "Meal" 
            WHERE "Meal".id = "Food"."mealId" 
            AND "Meal"."userId" = auth.uid()::text
        )
    );

CREATE POLICY "Users can update foods in own meals" ON "Food"
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM "Meal" 
            WHERE "Meal".id = "Food"."mealId" 
            AND "Meal"."userId" = auth.uid()::text
        )
    );

CREATE POLICY "Users can delete foods in own meals" ON "Food"
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM "Meal" 
            WHERE "Meal".id = "Food"."mealId" 
            AND "Meal"."userId" = auth.uid()::text
        )
    );

-- Add update trigger for updatedAt columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON "User"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goal_updated_at BEFORE UPDATE ON "Goal"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workout_updated_at BEFORE UPDATE ON "Workout"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;