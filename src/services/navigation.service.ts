import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationState } from '@react-navigation/native';

const NAVIGATION_STATE_KEY = '@fitflow_navigation_state';
const LAST_SCREEN_KEY = '@fitflow_last_screen';

class NavigationService {
  /**
   * Save the current navigation state
   */
  async saveNavigationState(state: NavigationState | undefined): Promise<void> {
    try {
      if (state) {
        await AsyncStorage.setItem(
          NAVIGATION_STATE_KEY,
          JSON.stringify(state)
        );
        
        // Also save the last active screen name for quick access
        const lastRoute = this.getActiveRouteName(state);
        if (lastRoute) {
          await AsyncStorage.setItem(LAST_SCREEN_KEY, lastRoute);
        }
      }
    } catch (error) {
      console.error('Error saving navigation state:', error);
    }
  }

  /**
   * Restore the navigation state
   */
  async restoreNavigationState(): Promise<NavigationState | undefined> {
    try {
      const jsonState = await AsyncStorage.getItem(NAVIGATION_STATE_KEY);
      return jsonState ? JSON.parse(jsonState) : undefined;
    } catch (error) {
      console.error('Error restoring navigation state:', error);
      return undefined;
    }
  }

  /**
   * Get the last visited screen
   */
  async getLastScreen(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(LAST_SCREEN_KEY);
    } catch (error) {
      console.error('Error getting last screen:', error);
      return null;
    }
  }

  /**
   * Clear saved navigation state
   */
  async clearNavigationState(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([NAVIGATION_STATE_KEY, LAST_SCREEN_KEY]);
    } catch (error) {
      console.error('Error clearing navigation state:', error);
    }
  }

  /**
   * Get the active route name from navigation state
   */
  private getActiveRouteName(state: NavigationState): string | undefined {
    if (!state) return undefined;

    const route = state.routes[state.index];
    
    // If the route has nested state, recurse
    if (route.state) {
      return this.getActiveRouteName(route.state as NavigationState);
    }
    
    return route.name;
  }

  /**
   * Check if user should be redirected based on their last activity
   */
  async shouldRestoreLastScreen(): Promise<boolean> {
    try {
      const lastScreen = await this.getLastScreen();
      
      // Don't restore if last screen was auth-related or onboarding
      const excludedScreens = ['Login', 'Register', 'Onboarding', 'Welcome'];
      
      if (!lastScreen || excludedScreens.includes(lastScreen)) {
        return false;
      }
      
      // Check if the last activity was recent (within 30 minutes)
      const lastActivityKey = '@fitflow_last_activity';
      const lastActivity = await AsyncStorage.getItem(lastActivityKey);
      
      if (lastActivity) {
        const lastTime = parseInt(lastActivity, 10);
        const currentTime = Date.now();
        const thirtyMinutes = 30 * 60 * 1000;
        
        return (currentTime - lastTime) < thirtyMinutes;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking restore condition:', error);
      return false;
    }
  }

  /**
   * Update last activity timestamp
   */
  async updateLastActivity(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        '@fitflow_last_activity',
        Date.now().toString()
      );
    } catch (error) {
      console.error('Error updating last activity:', error);
    }
  }
}

export const navigationService = new NavigationService();