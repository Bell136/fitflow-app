import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface BadgeState {
  dashboard: number;
  workout: number;
  nutrition: number;
  progress: number;
  profile: number;
}

interface BadgeContextType {
  badges: BadgeState;
  setBadge: (screen: keyof BadgeState, count: number) => void;
  clearBadge: (screen: keyof BadgeState) => void;
  clearAllBadges: () => void;
  getTotalBadgeCount: () => number;
}

const BadgeContext = createContext<BadgeContextType | undefined>(undefined);

const BADGE_STORAGE_KEY = '@fitflow_tab_badges';

export const BadgeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [badges, setBadges] = useState<BadgeState>({
    dashboard: 0,
    workout: 0,
    nutrition: 0,
    progress: 0,
    profile: 0,
  });

  // Load badges from storage on mount
  useEffect(() => {
    loadBadges();
  }, []);

  // Save badges to storage whenever they change
  useEffect(() => {
    saveBadges(badges);
  }, [badges]);

  const loadBadges = async () => {
    try {
      const savedBadges = await AsyncStorage.getItem(BADGE_STORAGE_KEY);
      if (savedBadges) {
        setBadges(JSON.parse(savedBadges));
      }
    } catch (error) {
      console.error('Error loading badges:', error);
    }
  };

  const saveBadges = async (badgeState: BadgeState) => {
    try {
      await AsyncStorage.setItem(BADGE_STORAGE_KEY, JSON.stringify(badgeState));
    } catch (error) {
      console.error('Error saving badges:', error);
    }
  };

  const setBadge = (screen: keyof BadgeState, count: number) => {
    setBadges(prev => ({
      ...prev,
      [screen]: Math.max(0, count), // Ensure non-negative
    }));
  };

  const clearBadge = (screen: keyof BadgeState) => {
    setBadges(prev => ({
      ...prev,
      [screen]: 0,
    }));
  };

  const clearAllBadges = () => {
    setBadges({
      dashboard: 0,
      workout: 0,
      nutrition: 0,
      progress: 0,
      profile: 0,
    });
  };

  const getTotalBadgeCount = () => {
    return Object.values(badges).reduce((sum, count) => sum + count, 0);
  };

  return (
    <BadgeContext.Provider
      value={{
        badges,
        setBadge,
        clearBadge,
        clearAllBadges,
        getTotalBadgeCount,
      }}
    >
      {children}
    </BadgeContext.Provider>
  );
};

export const useBadges = () => {
  const context = useContext(BadgeContext);
  if (!context) {
    throw new Error('useBadges must be used within a BadgeProvider');
  }
  return context;
};

// Helper hook to automatically update badges based on data
export const useAutoBadges = () => {
  const { setBadge } = useBadges();

  const updateWorkoutBadge = (incompleteSessions: number) => {
    setBadge('workout', incompleteSessions);
  };

  const updateNutritionBadge = (unloggedMeals: number) => {
    setBadge('nutrition', unloggedMeals);
  };

  const updateProgressBadge = (pendingPhotos: number) => {
    setBadge('progress', pendingPhotos);
  };

  const updateProfileBadge = (incompleteProfile: boolean, unreadNotifications: number = 0) => {
    const count = (incompleteProfile ? 1 : 0) + unreadNotifications;
    setBadge('profile', count);
  };

  return {
    updateWorkoutBadge,
    updateNutritionBadge,
    updateProgressBadge,
    updateProfileBadge,
  };
};