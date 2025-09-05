import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  SafeAreaView,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { supabase } from './src/services/supabase.client';
import { Session } from '@supabase/supabase-js';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async () => {
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              firstName: 'FitFlow',
              lastName: 'User',
            },
          },
        });
        if (error) throw error;
        Alert.alert('Success', 'Account created! Please check your email for verification.');
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0066CC" />
      </View>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="auto" />
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.authContainer}
        >
          <View style={styles.header}>
            <Text style={styles.logo}>💪 FitFlow</Text>
            <Text style={styles.tagline}>Your Complete Fitness Companion</Text>
          </View>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor="#999"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor="#999"
            />
            
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={handleAuth}
              disabled={!email || !password}
            >
              <Text style={styles.primaryButtonText}>
                {isSignUp ? 'Sign Up' : 'Sign In'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.linkButton}
              onPress={() => setIsSignUp(!isSignUp)}
            >
              <Text style={styles.linkButtonText}>
                {isSignUp 
                  ? 'Already have an account? Sign In' 
                  : "Don't have an account? Sign Up"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.features}>
            <Text style={styles.featuresTitle}>Features:</Text>
            <Text style={styles.featureItem}>✅ Workout Tracking</Text>
            <Text style={styles.featureItem}>✅ Nutrition Logging</Text>
            <Text style={styles.featureItem}>✅ Progress Monitoring</Text>
            <Text style={styles.featureItem}>✅ AI Coach</Text>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return <AppNavigator session={session} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F8',
  },
  authContainer: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  dashboardContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  logo: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#0066CC',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#6C757D',
  },
  form: {
    marginBottom: 30,
  },
  input: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    color: '#212529',
  },
  primaryButton: {
    backgroundColor: '#0066CC',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  linkButton: {
    alignItems: 'center',
    marginTop: 16,
  },
  linkButtonText: {
    color: '#0066CC',
    fontSize: 14,
  },
  features: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginTop: 20,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#212529',
  },
  featureItem: {
    fontSize: 16,
    color: '#495057',
    marginBottom: 8,
  },
  signOutButton: {
    position: 'absolute',
    right: 0,
    top: 25,
    padding: 8,
  },
  signOutText: {
    color: '#E03131',
    fontSize: 14,
    fontWeight: '500',
  },
  welcomeCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8,
  },
  emailText: {
    fontSize: 14,
    color: '#6C757D',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  workoutCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#1890FF',
  },
  nutritionCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#00A67E',
  },
  progressCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#FFA500',
  },
  goalCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#E03131',
  },
  statEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  statTitle: {
    fontSize: 14,
    color: '#6C757D',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
  },
  statLabel: {
    fontSize: 12,
    color: '#ADB5BD',
    marginTop: 4,
  },
  comingSoon: {
    backgroundColor: '#E8F4FD',
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
  },
  comingSoonTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0066CC',
    marginBottom: 12,
  },
  comingSoonText: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 16,
    lineHeight: 20,
  },
  techStack: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  techItem: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    fontSize: 12,
    color: '#00A67E',
    fontWeight: '500',
  },
});