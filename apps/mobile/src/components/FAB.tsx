import React, { useRef } from 'react'
import { TouchableOpacity, StyleSheet, Animated } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { colors as designColors, shadows } from '../design/theme'
import { mediumHaptic } from '../lib/haptics'

interface FABProps {
  onPress: () => void
}

export function FAB({ onPress }: FABProps) {
  const scale = useRef(new Animated.Value(1)).current

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start()
  }

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
    }).start()
  }

  const handlePress = () => {
    mediumHaptic()
    onPress()
  }

  return (
    <Animated.View style={[styles.container, { transform: [{ scale }] }]}>
      <TouchableOpacity
        style={styles.button}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.85}
      >
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.5}>
          <Path d="M12 5v14m7-7H5" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </TouchableOpacity>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    right: 24,
    zIndex: 1000,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: designColors.accent.main,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.xl,
  },
})
