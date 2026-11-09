import React, { useEffect, useRef } from 'react';
import { Animated, View, ViewProps } from 'react-native';

interface AnimatedViewProps extends ViewProps {
  delay?: number;
  duration?: number;
  fadeIn?: boolean;
  slideIn?: 'up' | 'down' | 'left' | 'right';
  children: React.ReactNode;
}

export function AnimatedView({ 
  delay = 0, 
  duration = 300, 
  fadeIn = true, 
  slideIn,
  children,
  style,
  ...props 
}: AnimatedViewProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(slideIn ? 20 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      fadeIn && Animated.timing(fadeAnim, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
      }),
      slideIn && Animated.timing(slideAnim, {
        toValue: 0,
        duration,
        delay,
        useNativeDriver: true,
      }),
    ].filter(Boolean) as Animated.CompositeAnimation[]).start();
  }, [delay, duration, fadeAnim, slideAnim, fadeIn, slideIn]);

  const getSlideTransform = () => {
    if (!slideIn) return {};
    
    const transforms: any = {};
    if (slideIn === 'up') transforms.translateY = slideAnim;
    if (slideIn === 'down') transforms.translateY = Animated.multiply(slideAnim, -1);
    if (slideIn === 'left') transforms.translateX = slideAnim;
    if (slideIn === 'right') transforms.translateX = Animated.multiply(slideAnim, -1);
    
    return { transform: Object.keys(transforms).length > 0 ? [transforms] : [] };
  };

  return (
    <Animated.View
      style={[
        {
          opacity: fadeIn ? fadeAnim : 1,
          ...getSlideTransform(),
        },
        style,
      ]}
      {...props}
    >
      {children}
    </Animated.View>
  );
}
