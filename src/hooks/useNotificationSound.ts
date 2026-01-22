import { useState, useCallback, useEffect } from 'react';

const SOUND_ENABLED_KEY = 'admin_notification_sound_enabled';

export function useNotificationSound() {
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const stored = localStorage.getItem(SOUND_ENABLED_KEY);
    return stored === null ? true : stored === 'true';
  });

  useEffect(() => {
    localStorage.setItem(SOUND_ENABLED_KEY, String(soundEnabled));
  }, [soundEnabled]);

  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return;

    try {
      // Use Web Audio API for a simple notification beep
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create oscillator for the beep
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Configure sound - friendly notification tone
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5 note
      oscillator.type = 'sine';
      
      // Volume envelope - start quiet, peak, then fade
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + 0.02);
      gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.1);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
      
      // Second beep after short delay
      setTimeout(() => {
        try {
          const osc2 = audioContext.createOscillator();
          const gain2 = audioContext.createGain();
          
          osc2.connect(gain2);
          gain2.connect(audioContext.destination);
          
          osc2.frequency.setValueAtTime(1046.5, audioContext.currentTime); // C6 note (higher)
          osc2.type = 'sine';
          
          gain2.gain.setValueAtTime(0, audioContext.currentTime);
          gain2.gain.linearRampToValueAtTime(0.12, audioContext.currentTime + 0.02);
          gain2.gain.linearRampToValueAtTime(0.08, audioContext.currentTime + 0.1);
          gain2.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.25);
          
          osc2.start(audioContext.currentTime);
          osc2.stop(audioContext.currentTime + 0.25);
        } catch (e) {
          // Ignore errors on second beep
        }
      }, 150);
      
    } catch (error) {
      // Autoplay may be blocked, silently fail
      console.log('Could not play notification sound:', error);
    }
  }, [soundEnabled]);

  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => !prev);
  }, []);

  return { soundEnabled, toggleSound, playNotificationSound };
}
