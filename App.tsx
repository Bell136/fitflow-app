import React from 'react';
import { 
  StyleSheet, 
  View,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import AuthNavigator from './src/navigation/AuthNavigator';

// Main app component that handles auth state and navigation
function AppContent() {
  const { user, session, loading, initializing } = useAuth();

  // Show loading spinner while initializing auth state
  if (initializing || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
      </View>
    );
  }

  // Show auth screens if user is not authenticated
  if (!user || !session) {
    return <AuthNavigator />;
  }

  // Show main app if user is authenticated
  return <AppNavigator session={session} />;
}

// Root app component with providers
export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar style="auto" />
        <AppContent />
      </NavigationContainer>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F4F6F8',
    justifyContent: 'center',
    alignItems: 'center',
  },
});