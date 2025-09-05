import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Session } from '@supabase/supabase-js';

import DashboardScreen from '../screens/DashboardScreen';
import WorkoutScreen from '../screens/WorkoutScreen';
import NutritionScreen from '../screens/NutritionScreen';
import ProgressScreen from '../screens/ProgressScreen';
import ProfileScreen from '../screens/ProfileScreen';
import StartWorkoutScreen from '../screens/QuickActions/StartWorkoutScreen';
import LogWaterScreen from '../screens/QuickActions/LogWaterScreen';

export type RootStackParamList = {
  Main: undefined;
  Dashboard: undefined;
  Workout: undefined;
  Nutrition: undefined;
  Progress: undefined;
  Profile: undefined;
  StartWorkout: undefined;
  LogWater: undefined;
};

const Tab = createBottomTabNavigator<RootStackParamList>();
const Stack = createStackNavigator<RootStackParamList>();

interface AppNavigatorProps {
  session: Session | null;
}

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Workout') {
            iconName = focused ? 'barbell' : 'barbell-outline';
          } else if (route.name === 'Nutrition') {
            iconName = focused ? 'nutrition' : 'nutrition-outline';
          } else if (route.name === 'Progress') {
            iconName = focused ? 'trending-up' : 'trending-up-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#0066CC',
        tabBarInactiveTintColor: '#6C757D',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#E9ECEF',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: '#fff',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: '#E9ECEF',
        },
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 20,
          color: '#212529',
        },
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{
          title: 'Dashboard',
          headerTitle: 'FitFlow',
        }}
      />
      <Tab.Screen 
        name="Workout" 
        component={WorkoutScreen}
        options={{
          title: 'Workout',
          headerTitle: 'Workouts',
        }}
      />
      <Tab.Screen 
        name="Nutrition" 
        component={NutritionScreen}
        options={{
          title: 'Nutrition',
          headerTitle: 'Nutrition',
        }}
      />
      <Tab.Screen 
        name="Progress" 
        component={ProgressScreen}
        options={{
          title: 'Progress',
          headerTitle: 'Progress',
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          title: 'Profile',
          headerTitle: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator({ session }: AppNavigatorProps) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={TabNavigator} />
      <Stack.Screen 
        name="StartWorkout" 
        component={StartWorkoutScreen}
        options={{ 
          headerShown: false,
          presentation: 'modal'
        }}
      />
      <Stack.Screen 
        name="LogWater" 
        component={LogWaterScreen}
        options={{ 
          headerShown: false,
          presentation: 'modal'
        }}
      />
    </Stack.Navigator>
  );
}