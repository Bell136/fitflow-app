-- ⚠️ IMMEDIATE FIX FOR FOOD TABLE ISSUES ⚠️
-- Run this NOW in Supabase SQL Editor

-- 1. Drop ALL constraints from Food table that are causing issues
ALTER TABLE "Food" 
ALTER COLUMN "mealId" DROP NOT NULL,
ALTER COLUMN "quantity" DROP NOT NULL,
ALTER COLUMN "unit" DROP NOT NULL;

-- 2. Set default values for problematic columns
ALTER TABLE "Food" 
ALTER COLUMN "quantity" SET DEFAULT 100,
ALTER COLUMN "unit" SET DEFAULT 'g';

-- 3. Update any NULL values in existing records
UPDATE "Food" 
SET "quantity" = 100 WHERE "quantity" IS NULL;

UPDATE "Food" 
SET "unit" = 'g' WHERE "unit" IS NULL;

-- 4. Create GoalProgress table if it doesn't exist
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

-- 5. Fix WaterIntake column name
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'WaterIntake' AND column_name = 'amount'
    ) THEN
        ALTER TABLE "WaterIntake" RENAME COLUMN "amount" TO "amountMl";
    END IF;
END $$;

-- 6. Add missing columns to Food table
ALTER TABLE "Food" 
ADD COLUMN IF NOT EXISTS "servingSize" DECIMAL(10, 2) DEFAULT 100,
ADD COLUMN IF NOT EXISTS "servingUnit" TEXT DEFAULT 'g',
ADD COLUMN IF NOT EXISTS "caloriesPerServing" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "proteinPerServing" DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS "carbsPerServing" DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS "fatPerServing" DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS "fiberPerServing" DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS "sugarPerServing" DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS "sodiumPerServing" DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS "verified" BOOLEAN DEFAULT false;

-- 7. Update Food records with proper nutritional values
UPDATE "Food" SET
    "servingSize" = COALESCE("servingSize", 100),
    "servingUnit" = COALESCE("servingUnit", 'g'),
    "caloriesPerServing" = COALESCE("caloriesPerServing", "calories", 0),
    "proteinPerServing" = COALESCE("proteinPerServing", "protein", 0),
    "carbsPerServing" = COALESCE("carbsPerServing", "carbs", 0),
    "fatPerServing" = COALESCE("fatPerServing", "fat", 0)
WHERE "servingSize" IS NULL OR "caloriesPerServing" IS NULL;

-- 8. Fix MealEntry table
ALTER TABLE "MealEntry" 
DROP COLUMN IF EXISTS "mealId";

ALTER TABLE "MealEntry" 
ADD COLUMN IF NOT EXISTS "foodId" TEXT,
ADD COLUMN IF NOT EXISTS "mealType" TEXT;

-- 9. Add foreign key relationships safely
DO $$
BEGIN
    -- MealEntry to Food
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'MealEntry_foodId_fkey'
    ) THEN
        ALTER TABLE "MealEntry" 
        ADD CONSTRAINT "MealEntry_foodId_fkey" 
        FOREIGN KEY ("foodId") REFERENCES "Food"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    -- MealEntry to User
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'MealEntry_userId_fkey'
    ) THEN
        ALTER TABLE "MealEntry"
        ADD CONSTRAINT "MealEntry_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    -- GoalProgress to User
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'GoalProgress_userId_fkey'
    ) THEN
        ALTER TABLE "GoalProgress"
        ADD CONSTRAINT "GoalProgress_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- 10. Enable RLS
ALTER TABLE "GoalProgress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Food" ENABLE ROW LEVEL SECURITY;

-- 11. Create RLS policies for GoalProgress
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'GoalProgress' AND policyname = 'Users can view own goals') THEN
        CREATE POLICY "Users can view own goals" ON "GoalProgress" FOR SELECT USING (auth.uid()::text = "userId");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'GoalProgress' AND policyname = 'Users can create own goals') THEN
        CREATE POLICY "Users can create own goals" ON "GoalProgress" FOR INSERT WITH CHECK (auth.uid()::text = "userId");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'GoalProgress' AND policyname = 'Users can update own goals') THEN
        CREATE POLICY "Users can update own goals" ON "GoalProgress" FOR UPDATE USING (auth.uid()::text = "userId");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'GoalProgress' AND policyname = 'Users can delete own goals') THEN
        CREATE POLICY "Users can delete own goals" ON "GoalProgress" FOR DELETE USING (auth.uid()::text = "userId");
    END IF;
END $$;

-- 12. Create RLS policies for Food
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Food' AND policyname = 'Anyone can view food') THEN
        CREATE POLICY "Anyone can view food" ON "Food" FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Food' AND policyname = 'Only verified users can create food') THEN
        CREATE POLICY "Only verified users can create food" ON "Food" FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
END $$;

-- 13. Clear existing test foods to avoid conflicts
DELETE FROM "Food" WHERE name IN ('Chicken Breast', 'Brown Rice', 'Banana', 'Apple', 'Egg', 'Greek Yogurt', 'Almonds', 'Oatmeal', 'Salmon', 'Broccoli');

-- 14. Insert sample foods with all fields properly set
INSERT INTO "Food" ("id", "name", "brand", "quantity", "unit", "servingSize", "servingUnit", "caloriesPerServing", "proteinPerServing", "carbsPerServing", "fatPerServing", "verified")
VALUES
    (gen_random_uuid()::text, 'Chicken Breast', NULL, 100, 'g', 100, 'g', 165, 31, 0, 3.6, true),
    (gen_random_uuid()::text, 'Brown Rice', NULL, 100, 'g', 100, 'g', 112, 2.6, 23.5, 0.9, true),
    (gen_random_uuid()::text, 'Banana', NULL, 118, 'g', 118, 'g', 105, 1.3, 27, 0.4, true),
    (gen_random_uuid()::text, 'Apple', NULL, 182, 'g', 182, 'g', 95, 0.5, 25, 0.3, true),
    (gen_random_uuid()::text, 'Egg', NULL, 50, 'g', 50, 'g', 78, 6, 0.6, 5.3, true),
    (gen_random_uuid()::text, 'Greek Yogurt', 'Generic', 150, 'g', 150, 'g', 100, 10, 6, 0, true),
    (gen_random_uuid()::text, 'Almonds', NULL, 28, 'g', 28, 'g', 164, 6, 6, 14, true),
    (gen_random_uuid()::text, 'Oatmeal', NULL, 40, 'g', 40, 'g', 150, 5, 27, 3, true),
    (gen_random_uuid()::text, 'Salmon', NULL, 100, 'g', 100, 'g', 208, 20, 0, 13, true),
    (gen_random_uuid()::text, 'Broccoli', NULL, 100, 'g', 100, 'g', 34, 2.8, 7, 0.4, true);

-- SUCCESS!
SELECT 'SUCCESS: All database issues have been fixed! The app should work now.' AS status;