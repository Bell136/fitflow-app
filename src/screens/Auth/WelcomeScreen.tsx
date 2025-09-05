import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Image,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  description: string;
}

const onboardingSlides: OnboardingSlide[] = [
  {
    id: '1',
    title: 'Track Your Workouts',
    subtitle: 'Never miss a rep',
    icon: 'barbell',
    color: '#FF6B6B',
    description: 'Log exercises, sets, and reps with our comprehensive exercise database. Track your progress and beat your personal records.',
  },
  {
    id: '2',
    title: 'Monitor Nutrition',
    subtitle: 'Fuel your fitness',
    icon: 'nutrition',
    color: '#4ECDC4',
    description: 'Track calories, macros, and water intake. Get personalized nutrition recommendations based on your fitness goals.',
  },
  {
    id: '3',
    title: 'Track Progress',
    subtitle: 'See your transformation',
    icon: 'trending-up',
    color: '#45B7D1',
    description: 'Take progress photos, log measurements, and visualize your fitness journey with detailed analytics and charts.',
  },
  {
    id: '4',
    title: 'AI-Powered Coaching',
    subtitle: 'Your personal trainer',
    icon: 'bulb',
    color: '#96CEB4',
    description: 'Get personalized workout plans, form tips, and motivation from our AI coach that learns from your progress.',
  },
  {
    id: '5',
    title: 'Join the Community',
    subtitle: 'Fitness together',
    icon: 'people',
    color: '#FFA500',
    description: 'Connect with like-minded fitness enthusiasts, join challenges, and celebrate achievements together.',
  },
];

export default function WelcomeScreen() {
  const navigation = useNavigation();
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleScroll = (event: any) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentSlide(slideIndex);
  };

  const goToSlide = (index: number) => {
    scrollViewRef.current?.scrollTo({
      x: index * SCREEN_WIDTH,
      animated: true,
    });
    setCurrentSlide(index);
  };

  const handleGetStarted = async () => {
    // Mark onboarding as complete
    await AsyncStorage.setItem('@fitflow_onboarding_complete', 'true');
    navigation.navigate('Login' as never);
  };

  const handleSkip = async () => {
    // Mark onboarding as complete
    await AsyncStorage.setItem('@fitflow_onboarding_complete', 'true');
    navigation.navigate('Login' as never);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Skip Button */}
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Slides */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
      >
        {onboardingSlides.map((slide, index) => (
          <View key={slide.id} style={styles.slide}>
            <View style={[styles.iconContainer, { backgroundColor: slide.color + '20' }]}>
              <Ionicons name={slide.icon as any} size={80} color={slide.color} />
            </View>
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.subtitle}>{slide.subtitle}</Text>
            <Text style={styles.description}>{slide.description}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Pagination Dots */}
      <View style={styles.pagination}>
        {onboardingSlides.map((_, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => goToSlide(index)}
            style={[
              styles.dot,
              currentSlide === index && styles.activeDot,
            ]}
          />
        ))}
      </View>

      {/* Action Buttons */}
      <View style={styles.footer}>
        {currentSlide === onboardingSlides.length - 1 ? (
          <TouchableOpacity style={styles.getStartedButton} onPress={handleGetStarted}>
            <Text style={styles.getStartedText}>Get Started</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        ) : (
          <View style={styles.navigationButtons}>
            <TouchableOpacity
              style={styles.prevButton}
              onPress={() => goToSlide(Math.max(0, currentSlide - 1))}
              disabled={currentSlide === 0}
            >
              <Ionicons 
                name="chevron-back" 
                size={24} 
                color={currentSlide === 0 ? '#ADB5BD' : '#0066CC'} 
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.nextButton}
              onPress={() => goToSlide(currentSlide + 1)}
            >
              <Text style={styles.nextText}>Next</Text>
              <Ionicons name="chevron-forward" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Already have an account? */}
      <View style={styles.loginContainer}>
        <Text style={styles.loginText}>Already have an account? </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Login' as never)}>
          <Text style={styles.loginLink}>Log In</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F8',
  },
  skipButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  skipText: {
    fontSize: 16,
    color: '#6C757D',
  },
  slide: {
    width: SCREEN_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#495057',
    marginBottom: 20,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#6C757D',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 30,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DEE2E6',
    marginHorizontal: 5,
  },
  activeDot: {
    width: 24,
    backgroundColor: '#0066CC',
  },
  footer: {
    paddingHorizontal: 40,
    paddingBottom: 20,
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  prevButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0066CC',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  nextText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  getStartedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0066CC',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  getStartedText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  loginText: {
    fontSize: 14,
    color: '#6C757D',
  },
  loginLink: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '600',
  },
});