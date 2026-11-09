/**
 * Sound Effects System
 * 
 * Lightweight sound manager for celebration and feedback sounds.
 * Uses Web Audio API for low-latency playback.
 */

export type SoundEffect = 
  | 'success'
  | 'achievement'
  | 'levelUp'
  | 'confetti'
  | 'click'
  | 'error'
  | 'notification';

// Sound configurations with base64 encoded tones
// These are simple synthesized sounds to avoid loading external files
const SOUND_CONFIGS: Record<SoundEffect, { frequency: number; duration: number; type: OscillatorType; gain: number; ramp?: boolean }> = {
  success: { frequency: 880, duration: 0.15, type: 'sine', gain: 0.3, ramp: true },
  achievement: { frequency: 523.25, duration: 0.3, type: 'sine', gain: 0.25, ramp: true },
  levelUp: { frequency: 659.25, duration: 0.4, type: 'sine', gain: 0.3, ramp: true },
  confetti: { frequency: 1046.5, duration: 0.1, type: 'sine', gain: 0.2 },
  click: { frequency: 1200, duration: 0.05, type: 'square', gain: 0.1 },
  error: { frequency: 200, duration: 0.2, type: 'sawtooth', gain: 0.15 },
  notification: { frequency: 740, duration: 0.12, type: 'sine', gain: 0.2 },
};

// Achievement jingle notes (C5, E5, G5, C6)
const ACHIEVEMENT_NOTES = [523.25, 659.25, 783.99, 1046.5];

class SoundManager {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;
  private volume: number = 0.5;
  private initialized: boolean = false;

  /**
   * Initialize the audio context (must be called after user interaction)
   */
  init(): boolean {
    if (this.initialized) return true;
    
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.initialized = true;
      return true;
    } catch (e) {
      console.warn('[SoundManager] Web Audio API not supported');
      return false;
    }
  }

  /**
   * Resume audio context if suspended (required after user interaction on some browsers)
   */
  async resume(): Promise<void> {
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  /**
   * Set whether sounds are enabled
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Set master volume (0-1)
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Play a simple tone
   */
  private playTone(frequency: number, duration: number, type: OscillatorType, gain: number, ramp: boolean = false): void {
    if (!this.audioContext || !this.enabled) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

    const effectiveGain = gain * this.volume;
    gainNode.gain.setValueAtTime(effectiveGain, this.audioContext.currentTime);
    
    if (ramp) {
      // Fade out for smoother sound
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
    }

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  /**
   * Play a sound effect
   */
  play(effect: SoundEffect): void {
    if (!this.init() || !this.enabled) return;
    this.resume();

    const config = SOUND_CONFIGS[effect];
    if (!config) return;

    // Special handling for achievement sound (plays a jingle)
    if (effect === 'achievement' || effect === 'levelUp') {
      this.playJingle(effect === 'levelUp');
      return;
    }

    this.playTone(config.frequency, config.duration, config.type, config.gain, config.ramp);
  }

  /**
   * Play achievement jingle (ascending notes)
   */
  private playJingle(isLevelUp: boolean = false): void {
    if (!this.audioContext || !this.enabled) return;

    const notes = isLevelUp ? ACHIEVEMENT_NOTES : ACHIEVEMENT_NOTES.slice(0, 3);
    const noteDelay = 0.1;

    notes.forEach((freq, index) => {
      setTimeout(() => {
        this.playTone(freq, 0.15, 'sine', 0.25 * this.volume, true);
      }, index * noteDelay * 1000);
    });
  }

  /**
   * Play success sound with optional pitch variation
   */
  playSuccess(variation: number = 0): void {
    if (!this.init() || !this.enabled) return;
    this.resume();

    const baseFreq = 880;
    const freq = baseFreq * (1 + variation * 0.1);
    this.playTone(freq, 0.15, 'sine', 0.3, true);
  }
}

// Export singleton instance
export const soundManager = new SoundManager();

// Convenience functions
export const playSound = (effect: SoundEffect) => soundManager.play(effect);
export const setSoundEnabled = (enabled: boolean) => soundManager.setEnabled(enabled);
export const setSoundVolume = (volume: number) => soundManager.setVolume(volume);
