import React, { useEffect, useRef, memo } from 'react';
import { Animated, View, StyleSheet, ViewStyle, DimensionValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { spacing, borderRadius as br } from '../design/theme';

interface SkeletonLoaderProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
  delay?: number; // Stagger delay for cascading effect
  variant?: 'default' | 'text' | 'card' | 'circle' | 'chart';
  pulse?: boolean; // Enable pulse animation instead of shimmer
}

export const SkeletonLoader = memo(function SkeletonLoader({ 
  width = '100%', 
  height = 20, 
  borderRadius = 8,
  style,
  delay = 0,
  variant = 'default',
  pulse = false,
}: SkeletonLoaderProps) {
  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';
  
  const shimmerAnim = useRef(new Animated.Value(-1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.97)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Get variant-specific dimensions
  const getDimensions = () => {
    switch (variant) {
      case 'text':
        return { height: height || 14, borderRadius: br.sm };
      case 'card':
        return { height: height || 120, borderRadius: 16 }; // Match new card design
      case 'circle':
        return { 
          width: typeof width === 'number' ? width : 48, 
          height: typeof width === 'number' ? width : 48, 
          borderRadius: 100 
        };
      case 'chart':
        return { height: height || 180, borderRadius: 16 };
      default:
        return { height, borderRadius };
    }
  };

  const dimensions = getDimensions();

  useEffect(() => {
    // Staggered fade-in entrance
    const entranceDelay = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);

    // Animation based on mode
    let animationRef: Animated.CompositeAnimation;
    
    if (pulse) {
      // Subtle pulse animation
      animationRef = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.6,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
    } else {
      // Shimmer animation loop
      animationRef = Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        })
      );
    }
    animationRef.start();

    return () => {
      clearTimeout(entranceDelay);
      animationRef.stop();
    };
  }, [delay, fadeAnim, scaleAnim, shimmerAnim, pulseAnim, pulse]);

  const translateX = shimmerAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [-200, 200],
  });

  const baseColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)';
  const shimmerColor = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.02)';

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          width: dimensions.width ?? width, 
          height: dimensions.height, 
          borderRadius: dimensions.borderRadius,
          backgroundColor: baseColor,
          opacity: pulse ? Animated.multiply(fadeAnim, pulseAnim) : fadeAnim,
          transform: [{ scale: scaleAnim }],
        }, 
        style
      ]}
    >
      {!pulse && (
        <Animated.View
          style={[
            styles.shimmerContainer,
            { transform: [{ translateX }] }
          ]}
        >
          <LinearGradient
            colors={['transparent', shimmerColor, 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.gradient}
          />
        </Animated.View>
      )}
    </Animated.View>
  );
});

// Pre-built skeleton layouts for common use cases
interface SkeletonGroupProps {
  children: React.ReactNode;
}

export function SkeletonGroup({ children }: SkeletonGroupProps) {
  return <View style={styles.group}>{children}</View>;
}

// Dashboard skeleton - matches new Phase 3 Home layout
export function DashboardSkeleton() {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.dashboardContainer, { backgroundColor: colors.background }]}>
      {/* Hero card - TODAY */}
      <SkeletonLoader variant="card" height={140} delay={0} style={styles.heroSkeleton} />
      
      {/* Key Metrics Row - 4 items horizontal */}
      <View style={styles.metricsRow}>
        <SkeletonLoader variant="card" height={72} delay={60} style={styles.metricItem} />
        <SkeletonLoader variant="card" height={72} delay={90} style={styles.metricItem} />
        <SkeletonLoader variant="card" height={72} delay={120} style={styles.metricItem} />
        <SkeletonLoader variant="card" height={72} delay={150} style={styles.metricItem} />
      </View>
      
      {/* Equity Curve Sparkline */}
      <SkeletonLoader variant="card" height={120} delay={200} style={styles.chartSkeleton} />
      
      {/* Recent trades - horizontal scroll */}
      <View style={styles.recentSection}>
        <SkeletonLoader variant="text" width={100} delay={260} style={styles.sectionTitle} />
        <View style={styles.recentTradesRow}>
          <SkeletonLoader variant="card" height={80} delay={300} style={styles.recentTradeCard} />
          <SkeletonLoader variant="card" height={80} delay={340} style={styles.recentTradeCard} />
          <SkeletonLoader variant="card" height={80} delay={380} style={styles.recentTradeCard} />
        </View>
      </View>
      
      {/* Insights card */}
      <SkeletonLoader variant="card" height={60} delay={440} style={styles.insightSkeleton} />
    </View>
  );
}

// List skeleton
export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <View style={styles.listContainer}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.listItem}>
          <SkeletonLoader variant="circle" width={44} delay={i * 60} />
          <View style={styles.listItemContent}>
            <SkeletonLoader variant="text" width="60%" delay={i * 60 + 30} />
            <SkeletonLoader variant="text" width="40%" height={12} delay={i * 60 + 60} style={{ marginTop: 8 }} />
          </View>
          <SkeletonLoader variant="text" width={60} delay={i * 60 + 90} />
        </View>
      ))}
    </View>
  );
}

// Card skeleton
export function CardSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <View style={styles.cardContainer}>
      <View style={styles.cardHeader}>
        <SkeletonLoader variant="text" width="50%" delay={delay} />
        <SkeletonLoader variant="text" width={60} delay={delay + 50} />
      </View>
      <SkeletonLoader variant="text" width="80%" height={32} delay={delay + 100} style={{ marginTop: 12 }} />
      <SkeletonLoader variant="text" width="30%" delay={delay + 150} style={{ marginTop: 8 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  shimmerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '200%',
  },
  gradient: {
    flex: 1,
    width: '50%',
  },
  group: {
    gap: spacing.md,
  },
  // Dashboard skeleton styles
  dashboardContainer: {
    flex: 1,
    padding: spacing.md,
  },
  heroSkeleton: {
    marginBottom: spacing.xl,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  metricItem: {
    flex: 1,
  },
  chartSkeleton: {
    marginBottom: spacing.xl,
  },
  recentSection: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  recentTradesRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  recentTradeCard: {
    width: 100,
  },
  insightSkeleton: {
    marginBottom: spacing.md,
  },
  // List skeleton styles
  listContainer: {
    padding: spacing.md,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  listItemContent: {
    flex: 1,
  },
  // Card skeleton styles
  cardContainer: {
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
