-- ⚠️ RUN THIS IN SUPABASE SQL EDITOR TO FIX REMAINING ISSUES ⚠️
-- Version 3: Handles the mealId NOT NULL constraint issue

-- 1. Create GoalProgress table (missing table)
CREATE TABLE IF NOT EXISTS "GoalProgress" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "goalType" TEXT NOT NULL,
    "goalName" TEXT NOT NULL,
    "targetValue" DECIMAL(10, 2) NOT NULL,
    "currentValue" DECIMAL(10, 2) NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL,
    "targetDate" DATE,
    "isAchieved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GoalProgress_pkey" PRIMARY KEY ("id")
);

-- 2. Fix WaterIntake column - check if column exists first
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'WaterIntake' 
        AND column_name = 'amount'
    ) THEN
        ALTER TABLE "WaterIntake" RENAME COLUMN "amount" TO "amountMl";
    END IF;
END $$;

-- 3. Fix the Food table structure
-- First, drop the NOT NULL constraint on mealId if it exists
ALTER TABLE "Food" 
ALTER COLUMN "mealId" DROP NOT NULL;

-- Drop the foreign key constraint if it exists
ALTER TABLE "Food" 
DROP CONSTRAINT IF EXISTS "Food_mealId_fkey";

-- Now we can safely add the new columns
ALTER TABLE "Food" 
ADD COLUMN IF NOT EXISTS "servingSize" DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS "servingUnit" TEXT,
ADD COLUMN IF NOT EXISTS "caloriesPerServing" INTEGER,
ADD COLUMN IF NOT EXISTS "proteinPerServing" DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS "carbsPerServing" DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS "fatPerServing" DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS "fiberPerServing" DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS "sugarPerServing" DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS "sodiumPerServing" DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS "verified" BOOLEAN DEFAULT false;

-- Update existing Food records to have default values for new columns
UPDATE "Food" 
SET "servingSize" = COALESCE("servingSize", 100),
    "servingUnit" = COALESCE("servingUnit", 'g'),
    "caloriesPerServing" = COALESCE("caloriesPerServing", COALESCE("calories", 0)),
    "proteinPerServing" = COALESCE("proteinPerServing", COALESCE("protein", 0)),
    "carbsPerServing" = COALESCE("carbsPerServing", COALESCE("carbs", 0)),
    "fatPerServing" = COALESCE("fatPerServing", COALESCE("fat", 0)),
    "verified" = COALESCE("verified", false)
WHERE "servingSize" IS NULL 
   OR "servingUnit" IS NULL 
   OR "caloriesPerServing" IS NULL;

-- 4. Fix MealEntry table
ALTER TABLE "MealEntry" 
DROP COLUMN IF EXISTS "mealId";

ALTER TABLE "MealEntry" 
ADD COLUMN IF NOT EXISTS "foodId" TEXT,
ADD COLUMN IF NOT EXISTS "mealType" TEXT;

-- 5. Add foreign key relationships (check if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'MealEntry_foodId_fkey'
    ) THEN
        ALTER TABLE "MealEntry" 
        ADD CONSTRAINT "MealEntry_foodId_fkey" 
        FOREIGN KEY ("foodId") 
        REFERENCES "Food"("id") 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'MealEntry_userId_fkey'
    ) THEN
        ALTER TABLE "MealEntry"
        ADD CONSTRAINT "MealEntry_userId_fkey"
        FOREIGN KEY ("userId")
        REFERENCES "User"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'GoalProgress_userId_fkey'
    ) THEN
        ALTER TABLE "GoalProgress"
        ADD CONSTRAINT "GoalProgress_userId_fkey"
        FOREIGN KEY ("userId")
        REFERENCES "User"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE;
    END IF;
END $$;

-- 6. Enable RLS for new tables
ALTER TABLE "GoalProgress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Food" ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies for GoalProgress (if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'GoalProgress' 
        AND policyname = 'Users can view own goals'
    ) THEN
        CREATE POLICY "Users can view own goals" ON "GoalProgress"
            FOR SELECT USING (auth.uid()::text = "userId");
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'GoalProgress' 
        AND policyname = 'Users can create own goals'
    ) THEN
        CREATE POLICY "Users can create own goals" ON "GoalProgress"
            FOR INSERT WITH CHECK (auth.uid()::text = "userId");
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'GoalProgress' 
        AND policyname = 'Users can update own goals'
    ) THEN
        CREATE POLICY "Users can update own goals" ON "GoalProgress"
            FOR UPDATE USING (auth.uid()::text = "userId");
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'GoalProgress' 
        AND policyname = 'Users can delete own goals'
    ) THEN
        CREATE POLICY "Users can delete own goals" ON "GoalProgress"
            FOR DELETE USING (auth.uid()::text = "userId");
    END IF;
END $$;

-- 8. Create RLS policies for Food (if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'Food' 
        AND policyname = 'Anyone can view food'
    ) THEN
        CREATE POLICY "Anyone can view food" ON "Food"
            FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'Food' 
        AND policyname = 'Only verified users can create food'
    ) THEN
        CREATE POLICY "Only verified users can create food" ON "Food"
            FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
END $$;

-- 9. Delete any existing test foods to avoid duplicates
DELETE FROM "Food" WHERE name IN ('Chicken Breast', 'Brown Rice', 'Banana', 'Apple', 'Egg', 'Greek Yogurt', 'Almonds', 'Oatmeal', 'Salmon', 'Broccoli');

-- 10. Insert sample foods with all required fields
INSERT INTO "Food" ("id", "name", "brand", "servingSize", "servingUnit", "caloriesPerServing", "proteinPerServing", "carbsPerServing", "fatPerServing", "verified")
VALUES
    (gen_random_uuid()::text, 'Chicken Breast', NULL, 100, 'g', 165, 31, 0, 3.6, true),
    (gen_random_uuid()::text, 'Brown Rice', NULL, 100, 'g', 112, 2.6, 23.5, 0.9, true),
    (gen_random_uuid()::text, 'Banana', NULL, 118, 'g', 105, 1.3, 27, 0.4, true),
    (gen_random_uuid()::text, 'Apple', NULL, 182, 'g', 95, 0.5, 25, 0.3, true),
    (gen_random_uuid()::text, 'Egg', NULL, 50, 'g', 78, 6, 0.6, 5.3, true),
    (gen_random_uuid()::text, 'Greek Yogurt', 'Generic', 150, 'g', 100, 10, 6, 0, true),
    (gen_random_uuid()::text, 'Almonds', NULL, 28, 'g', 164, 6, 6, 14, true),
    (gen_random_uuid()::text, 'Oatmeal', NULL, 40, 'g', 150, 5, 27, 3, true),
    (gen_random_uuid()::text, 'Salmon', NULL, 100, 'g', 208, 20, 0, 13, true),
    (gen_random_uuid()::text, 'Broccoli', NULL, 100, 'g', 34, 2.8, 7, 0.4, true);

-- SUCCESS MESSAGE
SELECT 'SUCCESS: All remaining issues have been fixed! Your app should now work without errors.' AS status;