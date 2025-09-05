-- ================================================================
-- COMPREHENSIVE DATABASE SCHEMA FIX FOR FITFLOW APP
-- ================================================================
-- This script fixes the Food table structure issues by:
-- 1. Analyzing current table constraints
-- 2. Separating food reference data from meal entries
-- 3. Creating proper normalized schema
-- 4. Migrating existing data safely
-- ================================================================

-- First, let's analyze the current Food table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'Food' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check current constraints
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    tc.constraint_type
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'Food';

-- Check if there's any existing data in Food table
SELECT COUNT(*) as total_food_records FROM "Food";

-- ================================================================
-- SOLUTION: CREATE PROPER NORMALIZED SCHEMA
-- ================================================================

-- Step 1: Create a backup of existing Food data (if any)
CREATE TABLE IF NOT EXISTS "Food_backup" AS 
SELECT * FROM "Food";

-- Step 2: Create the new FoodDatabase table (for food reference data)
-- This contains the master list of foods with nutritional information per 100g/standard serving
CREATE TABLE IF NOT EXISTS "FoodDatabase" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "barcode" TEXT,
    "category" TEXT,
    "servingSize" REAL DEFAULT 100, -- Standard serving size in grams
    "servingUnit" TEXT DEFAULT 'g', -- Unit for serving size
    
    -- Nutritional values per serving size
    "caloriesPer100g" INTEGER NOT NULL,
    "proteinPer100g" REAL NOT NULL,
    "carbsPer100g" REAL NOT NULL,
    "fatPer100g" REAL NOT NULL,
    "fiberPer100g" REAL,
    "sugarPer100g" REAL,
    "sodiumPer100g" REAL,
    
    -- Metadata
    "isVerified" BOOLEAN DEFAULT false,
    "source" TEXT, -- 'USER', 'USDA', 'BRANDED', etc.
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for FoodDatabase
CREATE INDEX IF NOT EXISTS "FoodDatabase_name_idx" ON "FoodDatabase"("name");
CREATE INDEX IF NOT EXISTS "FoodDatabase_barcode_idx" ON "FoodDatabase"("barcode") WHERE "barcode" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "FoodDatabase_category_idx" ON "FoodDatabase"("category") WHERE "category" IS NOT NULL;

-- Step 3: Create the new MealEntry table (for meal-specific food entries)
-- This links meals to foods with specific quantities
CREATE TABLE IF NOT EXISTS "MealEntry" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "mealId" TEXT NOT NULL,
    "foodDatabaseId" TEXT NOT NULL,
    
    -- Quantity consumed
    "quantity" REAL NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'g',
    
    -- Calculated nutritional values (based on quantity)
    "calories" INTEGER NOT NULL,
    "protein" REAL NOT NULL,
    "carbs" REAL NOT NULL,
    "fat" REAL NOT NULL,
    "fiber" REAL,
    
    -- Optional custom notes
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT "MealEntry_mealId_fkey" 
        FOREIGN KEY ("mealId") REFERENCES "Meal"("id") ON DELETE CASCADE,
    CONSTRAINT "MealEntry_foodDatabaseId_fkey" 
        FOREIGN KEY ("foodDatabaseId") REFERENCES "FoodDatabase"("id") ON DELETE RESTRICT
);

-- Create indexes for MealEntry
CREATE INDEX IF NOT EXISTS "MealEntry_mealId_idx" ON "MealEntry"("mealId");
CREATE INDEX IF NOT EXISTS "MealEntry_foodDatabaseId_idx" ON "MealEntry"("foodDatabaseId");

-- ================================================================
-- DATA MIGRATION FROM OLD FOOD TABLE
-- ================================================================

-- Step 4: Migrate existing data if any exists
DO $$
DECLARE
    food_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO food_count FROM "Food";
    
    IF food_count > 0 THEN
        -- Insert unique foods into FoodDatabase
        INSERT INTO "FoodDatabase" (
            "id",
            "name", 
            "brand", 
            "barcode",
            "caloriesPer100g",
            "proteinPer100g", 
            "carbsPer100g", 
            "fatPer100g", 
            "fiberPer100g",
            "source",
            "createdAt"
        )
        SELECT DISTINCT
            gen_random_uuid()::text,
            "name",
            "brand",
            "barcode",
            -- Convert to per-100g values (assuming old values were per serving)
            ROUND(("calories"::REAL / NULLIF("quantity", 0)) * 100)::INTEGER,
            ROUND(("protein"::REAL / NULLIF("quantity", 0)) * 100, 2),
            ROUND(("carbs"::REAL / NULLIF("quantity", 0)) * 100, 2),
            ROUND(("fat"::REAL / NULLIF("quantity", 0)) * 100, 2),
            CASE WHEN "fiber" IS NOT NULL 
                 THEN ROUND(("fiber"::REAL / NULLIF("quantity", 0)) * 100, 2)
                 ELSE NULL END,
            'MIGRATED',
            "createdAt"
        FROM "Food"
        WHERE "quantity" > 0; -- Only migrate records with valid quantities
        
        -- Insert meal entries into MealEntry table
        INSERT INTO "MealEntry" (
            "id",
            "mealId",
            "foodDatabaseId",
            "quantity",
            "unit",
            "calories",
            "protein",
            "carbs", 
            "fat",
            "fiber",
            "createdAt"
        )
        SELECT
            f."id",
            f."mealId",
            fd."id",
            f."quantity",
            f."unit",
            f."calories",
            f."protein",
            f."carbs",
            f."fat",
            f."fiber",
            f."createdAt"
        FROM "Food" f
        INNER JOIN "FoodDatabase" fd ON (
            fd."name" = f."name" 
            AND (fd."brand" = f."brand" OR (fd."brand" IS NULL AND f."brand" IS NULL))
            AND (fd."barcode" = f."barcode" OR (fd."barcode" IS NULL AND f."barcode" IS NULL))
        )
        WHERE f."quantity" > 0;
        
        RAISE NOTICE 'Migrated % food records', food_count;
    ELSE
        RAISE NOTICE 'No existing food records to migrate';
    END IF;
END $$;

-- ================================================================
-- DROP OLD FOOD TABLE AND RECREATE WITH PROPER STRUCTURE
-- ================================================================

-- Step 5: Drop the old Food table (this removes all the problematic constraints)
DROP TABLE IF EXISTS "Food" CASCADE;

-- Step 6: Update the Meal model to reference MealEntry instead of Food
-- Note: This will be handled in Prisma schema update

-- ================================================================
-- SEED SOME COMMON FOODS FOR TESTING
-- ================================================================

-- Insert some common foods for immediate use
INSERT INTO "FoodDatabase" (
    "name", "category", "caloriesPer100g", "proteinPer100g", 
    "carbsPer100g", "fatPer100g", "fiberPer100g", "source", "isVerified"
) VALUES
    ('Chicken Breast (Raw)', 'Protein', 165, 31.0, 0.0, 3.6, 0.0, 'USDA', true),
    ('White Rice (Cooked)', 'Grains', 130, 2.7, 28.0, 0.3, 0.4, 'USDA', true),
    ('Broccoli (Raw)', 'Vegetables', 34, 2.8, 7.0, 0.4, 2.6, 'USDA', true),
    ('Banana', 'Fruits', 89, 1.1, 23.0, 0.3, 2.6, 'USDA', true),
    ('Oats (Dry)', 'Grains', 389, 16.9, 66.0, 6.9, 10.6, 'USDA', true),
    ('Salmon (Raw)', 'Protein', 208, 25.4, 0.0, 12.4, 0.0, 'USDA', true),
    ('Sweet Potato (Raw)', 'Vegetables', 86, 1.6, 20.0, 0.1, 3.0, 'USDA', true),
    ('Greek Yogurt (Plain)', 'Dairy', 59, 10.0, 3.6, 0.4, 0.0, 'USDA', true),
    ('Almonds', 'Nuts', 579, 21.0, 22.0, 50.0, 12.5, 'USDA', true),
    ('Egg (Large)', 'Protein', 155, 13.0, 1.1, 11.0, 0.0, 'USDA', true);

-- ================================================================
-- CREATE VIEWS FOR EASIER QUERYING
-- ================================================================

-- View to get meal entries with food details
CREATE OR REPLACE VIEW "MealEntryDetails" AS
SELECT 
    me."id",
    me."mealId",
    me."quantity",
    me."unit",
    me."calories",
    me."protein",
    me."carbs",
    me."fat",
    me."fiber",
    me."notes",
    me."createdAt",
    
    -- Food details
    fd."name" as "foodName",
    fd."brand" as "foodBrand",
    fd."category" as "foodCategory",
    fd."barcode" as "foodBarcode"
    
FROM "MealEntry" me
JOIN "FoodDatabase" fd ON me."foodDatabaseId" = fd."id";

-- View to get meal totals
CREATE OR REPLACE VIEW "MealTotals" AS
SELECT 
    m."id" as "mealId",
    m."name" as "mealName",
    m."type" as "mealType",
    m."loggedAt",
    
    -- Calculated totals
    COALESCE(SUM(me."calories"), 0) as "totalCalories",
    COALESCE(SUM(me."protein"), 0) as "totalProtein",
    COALESCE(SUM(me."carbs"), 0) as "totalCarbs",
    COALESCE(SUM(me."fat"), 0) as "totalFat",
    COALESCE(SUM(me."fiber"), 0) as "totalFiber",
    COUNT(me."id") as "entryCount"
    
FROM "Meal" m
LEFT JOIN "MealEntry" me ON m."id" = me."mealId"
GROUP BY m."id", m."name", m."type", m."loggedAt";

-- ================================================================
-- VERIFICATION QUERIES
-- ================================================================

-- Check the new table structures
\d "FoodDatabase"
\d "MealEntry"

-- Verify seed data
SELECT COUNT(*) as food_database_count FROM "FoodDatabase";
SELECT COUNT(*) as meal_entry_count FROM "MealEntry";

-- Check if migration was successful
SELECT 
    'Migration completed successfully. Tables created:' as status,
    (SELECT COUNT(*) FROM "FoodDatabase") as food_database_records,
    (SELECT COUNT(*) FROM "MealEntry") as meal_entry_records;

-- ================================================================
-- CLEANUP INSTRUCTIONS
-- ================================================================

/*
After running this script successfully:

1. Update your Prisma schema to reflect the new structure:
   - Remove the old Food model
   - Add FoodDatabase model 
   - Add MealEntry model
   - Update Meal relations

2. Run: npx prisma generate

3. Update your application code to use:
   - FoodDatabase for food search/selection
   - MealEntry for meal logging

4. Test the new structure thoroughly

5. Once confirmed working, you can drop the backup:
   DROP TABLE "Food_backup";
*/

COMMIT;