import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface Ring {
  value: number;
  maxValue: number;
  color: string;
  label: string;
  icon?: string;
}

interface ActivityRingsProps {
  rings: Ring[];
  size?: number;
  strokeWidth?: number;
}

const ActivityRings: React.FC<ActivityRingsProps> = ({ 
  rings, 
  size = 120, 
  strokeWidth = 12 
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const centerOffset = size / 2;

  const calculateProgress = (value: number, maxValue: number) => {
    const progress = Math.min(value / maxValue, 1);
    return circumference - (progress * circumference);
  };

  return (
    <View style={styles.container}>
      <View style={styles.ringsContainer}>
        <Svg height={size} width={size} style={StyleSheet.absoluteFillObject}>
          {rings.map((ring, index) => {
            const ringRadius = radius - (index * (strokeWidth + 4));
            const ringCircumference = 2 * Math.PI * ringRadius;
            const strokeDashoffset = ringCircumference - ((ring.value / ring.maxValue) * ringCircumference);
            
            return (
              <React.Fragment key={index}>
                {/* Background ring */}
                <Circle
                  cx={centerOffset}
                  cy={centerOffset}
                  r={ringRadius}
                  stroke="#E9ECEF"
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeLinecap="round"
                />
                {/* Progress ring */}
                <Circle
                  cx={centerOffset}
                  cy={centerOffset}
                  r={ringRadius}
                  stroke={ring.color}
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  transform={`rotate(-90 ${centerOffset} ${centerOffset})`}
                />
              </React.Fragment>
            );
          })}
        </Svg>
        
        <View style={styles.centerContent}>
          <Text style={styles.centerValue}>
            {Math.round((rings[0]?.value / rings[0]?.maxValue) * 100) || 0}%
          </Text>
          <Text style={styles.centerLabel}>Daily Goal</Text>
        </View>
      </View>

      <View style={styles.legendContainer}>
        {rings.map((ring, index) => (
          <View key={index} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: ring.color }]} />
            <Text style={styles.legendLabel}>{ring.label}</Text>
            <Text style={styles.legendValue}>
              {ring.value}/{ring.maxValue}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 20,
  },
  ringsContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  centerContent: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#212529',
  },
  centerLabel: {
    fontSize: 12,
    color: '#6C757D',
    marginTop: 2,
  },
  legendContainer: {
    width: '100%',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendLabel: {
    flex: 1,
    fontSize: 14,
    color: '#495057',
  },
  legendValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
  },
});

export default ActivityRings;