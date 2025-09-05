# Database Schema Fix - Implementation Guide

## Problem Analysis

The current Food table has a flawed design that mixes:
- **Food reference data** (name, brand, nutritional info per 100g)
- **Meal entry data** (quantity consumed, meal association)

This causes NOT NULL constraint violations when trying to create food reference records without meal associations.

## Root Cause

The existing Food model has these problematic required fields:
- `mealId` (String, NOT NULL) - Forces every food to belong to a meal
- `quantity` (Float, NOT NULL) - Forces every food to have a consumed quantity

This prevents creating a food database for users to select from.

## Solution Overview

**Separate concerns into two tables:**

1. **FoodDatabase** - Master list of foods with nutritional data per 100g
2. **MealEntry** - Links meals to foods with specific quantities consumed

## Implementation Steps

### Step 1: Run the Database Migration

Connect to your database and run the SQL script:

```bash
# Connect to your database (adjust connection details)
psql "your-database-connection-string"

# Run the migration script
\i fix-database-schema.sql
```

Or if using a database client, execute the contents of `fix-database-schema.sql`.

### Step 2: Update Prisma Schema

Replace your current `prisma/schema.prisma` with the contents of `schema-updated.prisma`:

```bash
# Backup current schema
cp prisma/schema.prisma prisma/schema.prisma.backup

# Replace with updated schema
cp schema-updated.prisma prisma/schema.prisma

# Generate new Prisma client
npx prisma generate
```

### Step 3: Update Application Code

Update your food/meal-related API endpoints and services:

#### Before (Old Code):
```typescript
// Creating a food record (FAILED due to mealId constraint)
const food = await prisma.food.create({
  data: {
    name: "Chicken Breast",
    calories: 165,
    protein: 31.0,
    // mealId: REQUIRED but shouldn't be for food database
    // quantity: REQUIRED but shouldn't be for food database  
  }
});
```

#### After (New Code):
```typescript
// 1. Create/find food in database
const food = await prisma.foodDatabase.create({
  data: {
    name: "Chicken Breast",
    caloriesPer100g: 165,
    proteinPer100g: 31.0,
    carbsPer100g: 0.0,
    fatPer100g: 3.6,
    source: "USDA",
    isVerified: true
  }
});

// 2. Add to meal with specific quantity
const mealEntry = await prisma.mealEntry.create({
  data: {
    mealId: "meal-id-here",
    foodDatabaseId: food.id,
    quantity: 150, // 150g consumed
    unit: "g",
    // Calculate nutritional values based on quantity
    calories: Math.round((food.caloriesPer100g * 150) / 100),
    protein: (food.proteinPer100g * 150) / 100,
    carbs: (food.carbsPer100g * 150) / 100,
    fat: (food.fatPer100g * 150) / 100,
  }
});
```

### Step 4: Update API Endpoints

#### Food Database Endpoints:
```typescript
// GET /api/foods - Search food database
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  
  const foods = await prisma.foodDatabase.findMany({
    where: {
      name: {
        contains: query,
        mode: 'insensitive',
      },
    },
    take: 20,
  });
  
  return Response.json(foods);
}

// POST /api/foods - Add new food to database
export async function POST(request: Request) {
  const data = await request.json();
  
  const food = await prisma.foodDatabase.create({
    data: {
      name: data.name,
      brand: data.brand,
      caloriesPer100g: data.caloriesPer100g,
      proteinPer100g: data.proteinPer100g,
      carbsPer100g: data.carbsPer100g,
      fatPer100g: data.fatPer100g,
      fiberPer100g: data.fiberPer100g,
      source: "USER",
    },
  });
  
  return Response.json(food);
}
```

#### Meal Entry Endpoints:
```typescript
// POST /api/meals/:mealId/entries - Add food to meal
export async function POST(request: Request, { params }: { params: { mealId: string } }) {
  const data = await request.json();
  const { mealId } = params;
  
  // Get food nutritional data
  const food = await prisma.foodDatabase.findUnique({
    where: { id: data.foodDatabaseId },
  });
  
  if (!food) {
    return Response.json({ error: 'Food not found' }, { status: 404 });
  }
  
  // Calculate nutrition based on quantity
  const quantityRatio = data.quantity / 100; // Assuming 100g base
  
  const mealEntry = await prisma.mealEntry.create({
    data: {
      mealId,
      foodDatabaseId: data.foodDatabaseId,
      quantity: data.quantity,
      unit: data.unit || 'g',
      calories: Math.round(food.caloriesPer100g * quantityRatio),
      protein: food.proteinPer100g * quantityRatio,
      carbs: food.carbsPer100g * quantityRatio,
      fat: food.fatPer100g * quantityRatio,
      fiber: food.fiberPer100g ? food.fiberPer100g * quantityRatio : null,
    },
  });
  
  return Response.json(mealEntry);
}
```

### Step 5: Update Frontend Components

Update your React Native components to work with the new structure:

```typescript
// Food search component
const FoodSearchScreen = () => {
  const [foods, setFoods] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const searchFoods = async (query: string) => {
    const response = await fetch(`/api/foods?q=${encodeURIComponent(query)}`);
    const results = await response.json();
    setFoods(results);
  };
  
  const addFoodToMeal = async (food: FoodDatabase, quantity: number) => {
    await fetch(`/api/meals/${mealId}/entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        foodDatabaseId: food.id,
        quantity,
        unit: 'g',
      }),
    });
  };
  
  // ... rest of component
};
```

### Step 6: Testing

Test the new structure:

```sql
-- 1. Verify food database has data
SELECT COUNT(*) FROM "FoodDatabase";

-- 2. Create a test meal entry
INSERT INTO "MealEntry" (
  "mealId", "foodDatabaseId", "quantity", "unit",
  "calories", "protein", "carbs", "fat"
) 
SELECT 
  'test-meal-id',
  fd.id,
  150,
  'g',
  ROUND((fd."caloriesPer100g" * 150) / 100),
  ROUND((fd."proteinPer100g" * 150) / 100, 2),
  ROUND((fd."carbsPer100g" * 150) / 100, 2),
  ROUND((fd."fatPer100g" * 150) / 100, 2)
FROM "FoodDatabase" fd 
WHERE fd.name = 'Chicken Breast (Raw)'
LIMIT 1;

-- 3. Verify the entry was created successfully
SELECT * FROM "MealEntryDetails" WHERE "mealId" = 'test-meal-id';
```

## Benefits of New Structure

1. **Separation of Concerns**: Food reference data vs. meal consumption data
2. **No More Constraint Violations**: Foods can exist without meals
3. **Better Normalization**: Reduces data duplication
4. **Flexible Portions**: Same food can be consumed in different quantities
5. **Scalable**: Easy to add new foods to the database
6. **Analytics Ready**: Better structure for nutrition analytics

## Migration Safety

- The script creates backups before making changes
- Existing data is migrated safely
- Rollback instructions are provided if needed
- Comprehensive validation queries ensure data integrity

## Next Steps

After implementation:

1. Test all food/meal functionality thoroughly
2. Update any remaining references to the old Food model
3. Consider adding more sophisticated food search (fuzzy matching, categories)
4. Implement batch food entry for recipes
5. Add nutritional goal tracking based on meal entries

## Rollback Plan

If issues occur:

```sql
-- Restore from backup (if needed)
DROP TABLE IF EXISTS "FoodDatabase";
DROP TABLE IF EXISTS "MealEntry"; 
CREATE TABLE "Food" AS SELECT * FROM "Food_backup";
-- Then restore original Prisma schema
```

This comprehensive solution will resolve all the NOT NULL constraint issues and provide a robust foundation for the nutrition tracking features.