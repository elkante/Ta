/**
 * Synthesizes a loud, crisp, celebratory cash-register and notification bell sound
 * using the HTML5 Web Audio API. Requires zero external audio assets, works instantly
 * on desktop and mobile browsers, and cannot fail due to network/CDN latency.
 */
export function playOrderNotificationSound(volume = 1.0) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const startTime = ctx.currentTime + 0.02;

    // Harmonic 1: Bright introductory metallic ping (Cash drawer ring)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(987.77, startTime); // B5
    osc1.frequency.exponentialRampToValueAtTime(1318.51, startTime + 0.08); // E6
    gain1.gain.setValueAtTime(volume * 0.9, startTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(startTime);
    osc1.stop(startTime + 0.4);

    // Harmonic 2: Loud, rich celebratory dual-tone register chime
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1318.51, startTime + 0.08); // E6
    osc2.frequency.exponentialRampToValueAtTime(1975.53, startTime + 0.18); // B6
    osc2.frequency.exponentialRampToValueAtTime(2637.02, startTime + 0.28); // E7
    gain2.gain.setValueAtTime(volume, startTime + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, startTime + 1.2);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(startTime + 0.08);
    osc2.stop(startTime + 1.2);

    // Harmonic 3: Subtle warm resonant overtone
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(659.25, startTime + 0.1); // E5
    gain3.gain.setValueAtTime(volume * 0.6, startTime + 0.1);
    gain3.gain.exponentialRampToValueAtTime(0.001, startTime + 0.9);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(startTime + 0.1);
    osc3.stop(startTime + 0.9);
  } catch (err) {
    console.warn('Audio notification failed or blocked by autoplay permissions', err);
  }
}
