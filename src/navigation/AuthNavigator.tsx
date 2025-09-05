import React from 'react';
import { createStackNavigator, StackNavigationOptions } from '@react-navigation/stack';
import { Platform } from 'react-native';

// Auth Screens
import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/Auth/ForgotPasswordScreen';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

const Stack = createStackNavigator<AuthStackParamList>();

// Common screen options for auth flow
const authScreenOptions: StackNavigationOptions = {
  headerShown: false,
  cardStyle: { backgroundColor: '#F4F6F8' },
  gestureEnabled: true,
  ...Platform.select({
    ios: {
      cardStyleInterpolator: ({ current, layouts }) => {
        return {
          cardStyle: {
            transform: [
              {
                translateX: current.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [layouts.screen.width, 0],
                }),
              },
            ],
          },
        };
      },
    },
    android: {
      cardStyleInterpolator: ({ current, layouts }) => {
        return {
          cardStyle: {
            transform: [
              {
                translateX: current.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [layouts.screen.width, 0],
                }),
              },
            ],
          },
        };
      },
    },
  }),
};

// Screen-specific options
const loginScreenOptions: StackNavigationOptions = {
  ...authScreenOptions,
  gestureEnabled: false, // Disable swipe back on login screen
};

const registerScreenOptions: StackNavigationOptions = {
  ...authScreenOptions,
  title: 'Create Account',
  headerShown: true,
  headerStyle: {
    backgroundColor: '#F4F6F8',
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 0,
  },
  headerTitleStyle: {
    fontWeight: '600',
    fontSize: 18,
    color: '#212529',
  },
  headerTintColor: '#0066CC',
  headerBackTitleVisible: false,
};

const forgotPasswordScreenOptions: StackNavigationOptions = {
  ...authScreenOptions,
  title: 'Reset Password',
  headerShown: true,
  headerStyle: {
    backgroundColor: '#F4F6F8',
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 0,
  },
  headerTitleStyle: {
    fontWeight: '600',
    fontSize: 18,
    color: '#212529',
  },
  headerTintColor: '#0066CC',
  headerBackTitleVisible: false,
};

interface AuthNavigatorProps {
  initialRouteName?: keyof AuthStackParamList;
}

export default function AuthNavigator({ initialRouteName = 'Login' }: AuthNavigatorProps) {
  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        cardStyle: { backgroundColor: '#F4F6F8' },
      }}
    >
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={loginScreenOptions}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={registerScreenOptions}
      />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={forgotPasswordScreenOptions}
      />
    </Stack.Navigator>
  );
}

// Custom hook for auth navigation
export function useAuthNavigation() {
  // This can be extended with auth-specific navigation logic
  const navigateToLogin = () => {
    // Navigation logic
  };

  const navigateToRegister = () => {
    // Navigation logic  
  };

  const navigateToForgotPassword = () => {
    // Navigation logic
  };

  return {
    navigateToLogin,
    navigateToRegister,
    navigateToForgotPassword,
  };
}