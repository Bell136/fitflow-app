import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { nutritionService, Food, MealEntry, MacroGoals } from '../services/nutrition.service';

interface MealSummary {
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foods: MealEntry[];
  calories: number;
}

export default function NutritionScreen() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');
  const [searchQuery, setSearchQuery] = useState('');
  const [foods, setFoods] = useState<Food[]>([]);
  const [todayMeals, setTodayMeals] = useState<MealSummary[]>([
    { type: 'breakfast', foods: [], calories: 0 },
    { type: 'lunch', foods: [], calories: 0 },
    { type: 'dinner', foods: [], calories: 0 },
    { type: 'snack', foods: [], calories: 0 },
  ]);
  const [dailyGoals, setDailyGoals] = useState<MacroGoals>({
    daily_calories: 2000,
    daily_protein: 150,
    daily_carbs: 250,
    daily_fat: 65,
    daily_water_ml: 2500
  });
  const [waterIntake, setWaterIntake] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchingFoods, setSearchingFoods] = useState(false);

  const dailyTotals = {
    calories: todayMeals.reduce((sum, meal) => sum + meal.calories, 0),
    protein: todayMeals.reduce((sum, meal) => 
      sum + meal.foods.reduce((s, f) => s + f.protein, 0), 0),
    carbs: todayMeals.reduce((sum, meal) => 
      sum + meal.foods.reduce((s, f) => s + f.carbs, 0), 0),
    fat: todayMeals.reduce((sum, meal) => 
      sum + meal.foods.reduce((s, f) => s + f.fat, 0), 0),
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      searchFoods();
    } else {
      setFoods([]);
    }
  }, [searchQuery]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadTodaysMeals(),
        loadMacroGoals(),
        loadWaterIntake()
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTodaysMeals = async () => {
    const today = new Date().toISOString().split('T')[0];
    const dailyNutrition = await nutritionService.getDailyNutrition(today);
    
    if (dailyNutrition && dailyNutrition.mealEntries) {
      const mealsByType = {
        breakfast: dailyNutrition.mealEntries.filter(m => m.mealType === 'breakfast'),
        lunch: dailyNutrition.mealEntries.filter(m => m.mealType === 'lunch'),
        dinner: dailyNutrition.mealEntries.filter(m => m.mealType === 'dinner'),
        snack: dailyNutrition.mealEntries.filter(m => m.mealType === 'snack'),
      };

      const updatedMeals: MealSummary[] = [
        { type: 'breakfast', foods: mealsByType.breakfast, calories: mealsByType.breakfast.reduce((sum, m) => sum + m.calories, 0) },
        { type: 'lunch', foods: mealsByType.lunch, calories: mealsByType.lunch.reduce((sum, m) => sum + m.calories, 0) },
        { type: 'dinner', foods: mealsByType.dinner, calories: mealsByType.dinner.reduce((sum, m) => sum + m.calories, 0) },
        { type: 'snack', foods: mealsByType.snack, calories: mealsByType.snack.reduce((sum, m) => sum + m.calories, 0) },
      ];

      setTodayMeals(updatedMeals);
    }
  };

  const loadMacroGoals = async () => {
    const goals = await nutritionService.getMacroGoals();
    if (goals) {
      setDailyGoals(goals);
    }
  };

  const loadWaterIntake = async () => {
    const today = new Date().toISOString().split('T')[0];
    const waterMl = await nutritionService.getDailyWaterIntake(today);
    setWaterIntake(waterMl);
  };

  const searchFoods = async () => {
    if (!searchQuery.trim()) return;
    
    setSearchingFoods(true);
    try {
      const results = await nutritionService.searchFoods(searchQuery);
      setFoods(results);
    } catch (error) {
      console.error('Error searching foods:', error);
    } finally {
      setSearchingFoods(false);
    }
  };

  const addFoodToMeal = async (food: Food) => {
    try {
      const now = new Date().toISOString();
      const mealEntry = await nutritionService.logMeal({
        food_id: food.id,
        meal_type: selectedMealType,
        quantity: 1,
        serving_size: food.serving_size,
        calories: food.calories_per_serving,
        protein: food.protein_per_serving,
        carbs: food.carbs_per_serving,
        fat: food.fat_per_serving,
        logged_at: now
      });

      if (mealEntry) {
        // Update local state
        setTodayMeals(meals => 
          meals.map(meal => 
            meal.type === selectedMealType
              ? { 
                  ...meal, 
                  foods: [...meal.foods, mealEntry], 
                  calories: meal.calories + mealEntry.calories 
                }
              : meal
          )
        );
        setShowAddModal(false);
        setSearchQuery('');
        Alert.alert('Success', 'Food added to your meal!');
      } else {
        Alert.alert('Error', 'Failed to log food. Please try again.');
      }
    } catch (error) {
      console.error('Error adding food to meal:', error);
      Alert.alert('Error', 'Failed to log food. Please try again.');
    }
  };

  const addWaterGlass = async () => {
    try {
      const glassSize = 250; // 250ml per glass
      const success = await nutritionService.logWater(glassSize);
      if (success) {
        setWaterIntake(prev => prev + glassSize);
      }
    } catch (error) {
      console.error('Error logging water:', error);
    }
  };

  const MacroProgress = ({ label, current, goal, color }: any) => (
    <View style={styles.macroItem}>
      <Text style={styles.macroLabel}>{label}</Text>
      <View style={styles.macroProgressBar}>
        <View 
          style={[
            styles.macroProgressFill, 
            { width: `${Math.min((current / goal) * 100, 100)}%`, backgroundColor: color }
          ]} 
        />
      </View>
      <Text style={styles.macroValue}>{Math.round(current)}g / {goal}g</Text>
    </View>
  );

  const MealCard = ({ meal }: { meal: MealSummary }) => (
    <View style={styles.mealCard}>
      <View style={styles.mealHeader}>
        <View style={styles.mealTitleContainer}>
          <Ionicons 
            name={
              meal.type === 'breakfast' ? 'sunny' :
              meal.type === 'lunch' ? 'partly-sunny' :
              meal.type === 'dinner' ? 'moon' : 'nutrition'
            } 
            size={20} 
            color="#0066CC" 
          />
          <Text style={styles.mealTitle}>
            {meal.type.charAt(0).toUpperCase() + meal.type.slice(1)}
          </Text>
        </View>
        <TouchableOpacity 
          onPress={() => {
            setSelectedMealType(meal.type);
            setShowAddModal(true);
          }}
        >
          <Ionicons name="add-circle" size={24} color="#0066CC" />
        </TouchableOpacity>
      </View>
      
      {meal.foods.length > 0 ? (
        <View style={styles.foodsList}>
          {meal.foods.map((food, index) => (
            <View key={food.id || index} style={styles.foodItem}>
              <View>
                <Text style={styles.foodName}>{food.food?.name || 'Unknown Food'}</Text>
                <Text style={styles.foodServing}>
                  {food.quantity} × {food.food?.serving_size || food.serving_size}{food.food?.serving_unit || ''}
                </Text>
              </View>
              <Text style={styles.foodCalories}>{Math.round(food.calories)} cal</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.emptyMealText}>No foods logged</Text>
      )}
      
      <View style={styles.mealFooter}>
        <Text style={styles.mealCalories}>Total: {Math.round(meal.calories)} calories</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Loading nutrition data...</Text>
      </View>
    );
  }

  const waterGlasses = Math.min(Math.floor(waterIntake / 250), 8); // 250ml per glass, max 8 glasses shown

  return (
    <ScrollView style={styles.container}>
      {/* Daily Summary Card */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Daily Summary</Text>
        
        {/* Calorie Ring */}
        <View style={styles.calorieRing}>
          <View style={styles.calorieContent}>
            <Text style={styles.calorieValue}>{Math.round(dailyTotals.calories)}</Text>
            <Text style={styles.calorieLabel}>of {dailyGoals.daily_calories}</Text>
            <Text style={styles.calorieLabel}>calories</Text>
          </View>
        </View>

        {/* Macros */}
        <View style={styles.macrosContainer}>
          <MacroProgress 
            label="Protein" 
            current={dailyTotals.protein} 
            goal={dailyGoals.daily_protein} 
            color="#1890FF" 
          />
          <MacroProgress 
            label="Carbs" 
            current={dailyTotals.carbs} 
            goal={dailyGoals.daily_carbs} 
            color="#FFA500" 
          />
          <MacroProgress 
            label="Fat" 
            current={dailyTotals.fat} 
            goal={dailyGoals.daily_fat} 
            color="#00A67E" 
          />
        </View>
      </View>

      {/* Water Tracking */}
      <View style={styles.waterCard}>
        <View style={styles.waterHeader}>
          <View style={styles.waterTitleContainer}>
            <Ionicons name="water" size={20} color="#00B4D8" />
            <Text style={styles.waterTitle}>Water Intake</Text>
          </View>
          <Text style={styles.waterCount}>{waterGlasses} / 8 glasses ({Math.round(waterIntake)}ml)</Text>
        </View>
        <View style={styles.waterGlasses}>
          {[...Array(8)].map((_, i) => (
            <TouchableOpacity key={i} style={styles.waterGlass} onPress={addWaterGlass}>
              <Ionicons 
                name={i < waterGlasses ? "water" : "water-outline"} 
                size={24} 
                color={i < waterGlasses ? "#00B4D8" : "#E9ECEF"} 
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Meals */}
      <View style={styles.mealsSection}>
        <Text style={styles.sectionTitle}>Today's Meals</Text>
        {todayMeals.map((meal, index) => (
          <MealCard key={index} meal={meal} />
        ))}
      </View>

      {/* Add Food Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={showAddModal}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Add to {selectedMealType.charAt(0).toUpperCase() + selectedMealType.slice(1)}
            </Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Ionicons name="close" size={28} color="#212529" />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#6C757D" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search foods..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#ADB5BD"
            />
            <TouchableOpacity style={styles.barcodeButton}>
              <Ionicons name="barcode" size={24} color="#0066CC" />
            </TouchableOpacity>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickAction}>
              <Ionicons name="time" size={20} color="#6C757D" />
              <Text style={styles.quickActionText}>Recent</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction}>
              <Ionicons name="star" size={20} color="#6C757D" />
              <Text style={styles.quickActionText}>Favorites</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction}>
              <Ionicons name="add-circle" size={20} color="#6C757D" />
              <Text style={styles.quickActionText}>Custom</Text>
            </TouchableOpacity>
          </View>

          {/* Food List */}
          {searchingFoods ? (
            <View style={styles.searchLoadingContainer}>
              <ActivityIndicator size="small" color="#0066CC" />
              <Text style={styles.searchLoadingText}>Searching foods...</Text>
            </View>
          ) : (
            <FlatList
              data={foods}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.foodCard}
                  onPress={() => addFoodToMeal(item)}
                >
                  <View style={styles.foodInfo}>
                    <Text style={styles.foodCardName}>{item.name}</Text>
                    {item.brand && <Text style={styles.foodBrand}>{item.brand}</Text>}
                    <Text style={styles.foodServing}>{item.serving_size} {item.serving_unit}</Text>
                  </View>
                  <View style={styles.foodNutrition}>
                    <Text style={styles.foodCardCalories}>{item.calories_per_serving}</Text>
                    <Text style={styles.foodCardCaloriesLabel}>cal</Text>
                  </View>
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.foodList}
              ListEmptyComponent={
                searchQuery ? (
                  <View style={styles.emptyFoodList}>
                    <Text style={styles.emptyFoodText}>No foods found</Text>
                    <Text style={styles.emptyFoodSubtext}>Try searching for a different food</Text>
                  </View>
                ) : (
                  <View style={styles.emptyFoodList}>
                    <Text style={styles.emptyFoodText}>Start typing to search foods</Text>
                    <Text style={styles.emptyFoodSubtext}>Search our database of thousands of foods</Text>
                  </View>
                )
              }
            />
          )}
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F6F8',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6C757D',
  },
  summaryCard: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 20,
  },
  calorieRing: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 12,
    borderColor: '#E9ECEF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  calorieContent: {
    alignItems: 'center',
  },
  calorieValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#212529',
  },
  calorieLabel: {
    fontSize: 14,
    color: '#6C757D',
  },
  macrosContainer: {
    width: '100%',
  },
  macroItem: {
    marginBottom: 16,
  },
  macroLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
    marginBottom: 6,
  },
  macroProgressBar: {
    height: 8,
    backgroundColor: '#E9ECEF',
    borderRadius: 4,
    marginBottom: 4,
  },
  macroProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  macroValue: {
    fontSize: 12,
    color: '#6C757D',
  },
  waterCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 12,
  },
  waterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  waterTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  waterTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#212529',
    marginLeft: 8,
  },
  waterCount: {
    fontSize: 14,
    color: '#6C757D',
  },
  waterGlasses: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  waterGlass: {
    padding: 8,
  },
  mealsSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 16,
  },
  mealCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mealTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mealTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#212529',
    marginLeft: 8,
  },
  foodsList: {
    marginBottom: 12,
  },
  foodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F6F8',
  },
  foodName: {
    fontSize: 14,
    color: '#212529',
  },
  foodServing: {
    fontSize: 12,
    color: '#6C757D',
    marginTop: 2,
  },
  foodCalories: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
  },
  emptyMealText: {
    fontSize: 14,
    color: '#ADB5BD',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
  mealFooter: {
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
    paddingTop: 8,
  },
  mealCalories: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F4F6F8',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212529',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#212529',
  },
  barcodeButton: {
    padding: 4,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  quickAction: {
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 10,
    flex: 1,
    marginHorizontal: 4,
  },
  quickActionText: {
    fontSize: 12,
    color: '#6C757D',
    marginTop: 4,
  },
  searchLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  searchLoadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6C757D',
  },
  foodList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  emptyFoodList: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyFoodText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6C757D',
    marginBottom: 8,
  },
  emptyFoodSubtext: {
    fontSize: 14,
    color: '#ADB5BD',
    textAlign: 'center',
  },
  foodCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
  },
  foodInfo: {
    flex: 1,
  },
  foodCardName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#212529',
  },
  foodBrand: {
    fontSize: 12,
    color: '#6C757D',
    marginTop: 2,
  },
  foodNutrition: {
    alignItems: 'center',
  },
  foodCardCalories: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0066CC',
  },
  foodCardCaloriesLabel: {
    fontSize: 12,
    color: '#6C757D',
  },
});