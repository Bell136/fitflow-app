import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';

interface LoadingSkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
  variant?: 'card' | 'text' | 'circle' | 'button';
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
  variant = 'text',
}) => {
  const shimmerAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnimation, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const opacity = shimmerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const getVariantStyles = () => {
    switch (variant) {
      case 'card':
        return {
          width: '100%',
          height: 120,
          borderRadius: 12,
          marginBottom: 15,
        };
      case 'circle':
        return {
          width: 60,
          height: 60,
          borderRadius: 30,
        };
      case 'button':
        return {
          width: 120,
          height: 40,
          borderRadius: 20,
        };
      default:
        return {
          width,
          height,
          borderRadius,
        };
    }
  };

  return (
    <Animated.View
      style={[
        styles.skeleton,
        getVariantStyles(),
        { opacity },
        style,
      ]}
    />
  );
};

export const DashboardSkeleton: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Welcome Section Skeleton */}
      <View style={styles.welcomeSection}>
        <View>
          <LoadingSkeleton width={100} height={16} />
          <LoadingSkeleton width={150} height={24} style={{ marginTop: 4 }} />
        </View>
        <LoadingSkeleton variant="circle" />
      </View>

      {/* Activity Rings Skeleton */}
      <View style={styles.card}>
        <LoadingSkeleton width={150} height={20} style={{ marginBottom: 15 }} />
        <View style={styles.ringsSkeletonContainer}>
          <LoadingSkeleton width={120} height={120} borderRadius={60} />
          <View style={styles.ringLegends}>
            <LoadingSkeleton width="80%" height={16} style={{ marginBottom: 8 }} />
            <LoadingSkeleton width="80%" height={16} style={{ marginBottom: 8 }} />
            <LoadingSkeleton width="80%" height={16} />
          </View>
        </View>
      </View>

      {/* Quick Actions Skeleton */}
      <View style={styles.card}>
        <LoadingSkeleton width={150} height={20} style={{ marginBottom: 15 }} />
        <View style={styles.quickActions}>
          <LoadingSkeleton variant="circle" />
          <LoadingSkeleton variant="circle" />
          <LoadingSkeleton variant="circle" />
          <LoadingSkeleton variant="circle" />
        </View>
      </View>

      {/* Stats Card Skeleton */}
      <LoadingSkeleton variant="card" />
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#E9ECEF',
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F4F6F8',
  },
  welcomeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  ringsSkeletonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  ringLegends: {
    flex: 1,
    marginLeft: 20,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
});

export default LoadingSkeleton;