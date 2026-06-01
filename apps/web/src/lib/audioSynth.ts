let audioCtx: AudioContext | null = null;

type BrowserAudioContextConstructor = new (contextOptions?: AudioContextOptions) => AudioContext;
type WindowWithWebKitAudio = Window &
  typeof globalThis & {
    webkitAudioContext?: BrowserAudioContextConstructor;
  };

export function getBrowserAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ?? (window as WindowWithWebKitAudio).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Procedural stadium audio synthesizer using Web Audio API
 */
export const stadiumAudio = {
  /**
   * Synthesizes a referee whistle using high-frequency oscillators and an LFO warble.
   * @param pan - The pan value (-1 to 1)
   */
  playWhistle(pan: number = 0) {
    const ctx = getBrowserAudioContext();
    if (!ctx) return;

    try {
      // 1. Create Nodes
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const mainGain = ctx.createGain();

      const pannerNode = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      if (pannerNode) {
        pannerNode.pan.value = pan;
      }

      // 2. Configure Oscillators (Referee whistle is high-pitched, ~1000Hz-2000Hz)
      osc1.type = 'triangle';
      osc1.frequency.value = 1200;

      osc2.type = 'sine';
      osc2.frequency.value = 1220; // Slightly detuned for a realistic beating effect

      // LFO for the whistle warble (tremolo/vibrato effect)
      lfo.frequency.value = 30; // 30Hz fast vibration
      lfoGain.gain.value = 15; // frequency modulation depth

      // 3. Connect LFO to modulate oscillator frequencies
      lfo.connect(lfoGain);
      lfoGain.connect(osc1.frequency);
      lfoGain.connect(osc2.frequency);

      // 4. Configure Filter to soften high frequencies
      filter.type = 'lowpass';
      filter.frequency.value = 3000;

      // 5. Volume Envelope (Quick fade in, sharp double whistle, then fade out)
      const now = ctx.currentTime;
      mainGain.gain.setValueAtTime(0, now);
      // Whistle 1
      mainGain.gain.linearRampToValueAtTime(0.3, now + 0.05);
      mainGain.gain.setValueAtTime(0.3, now + 0.2);
      mainGain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      mainGain.gain.setValueAtTime(0, now + 0.26);
      // Whistle 2 (longer and sharper)
      mainGain.gain.linearRampToValueAtTime(0.35, now + 0.3);
      mainGain.gain.setValueAtTime(0.35, now + 0.65);
      mainGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

      // 6. Connect the Chain
      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(mainGain);

      if (pannerNode) {
        mainGain.connect(pannerNode);
        pannerNode.connect(ctx.destination);
      } else {
        mainGain.connect(ctx.destination);
      }

      // 7. Start and Schedule Stops
      lfo.start(now);
      osc1.start(now);
      osc2.start(now);

      lfo.stop(now + 0.9);
      osc1.stop(now + 0.9);
      osc2.stop(now + 0.9);
    } catch (err) {
      console.warn('Failed to play procedural whistle audio:', err);
    }
  },

  /**
   * Synthesizes stadium crowd cheers/surges using filtered white noise and dynamic envelopes.
   * @param pan - The pan value (-1 to 1)
   */
  playCrowdCheer(pan: number = 0) {
    const ctx = getBrowserAudioContext();
    if (!ctx) return;

    try {
      // 1. Create a 3-second buffer of White Noise
      const bufferSize = ctx.sampleRate * 3.5; // 3.5 seconds
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      
      // Fill the buffer with random noise
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      // 2. Create Nodes
      const noiseNode = ctx.createBufferSource();
      noiseNode.buffer = buffer;

      // Bandpass filter to model stadium acoustics (emphasize crowd frequency mid-range)
      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.value = 650; // Center frequency
      bandpass.Q.value = 0.8; // Semi-wide curve

      // Lowpass filter to dampen harsh high-frequency noise
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 1800;

      const mainGain = ctx.createGain();

      const pannerNode = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      if (pannerNode) {
        pannerNode.pan.value = pan;
      }

      // 3. Volume Envelope (Sharp explosion on goal, then slowly decrescendoing cheers)
      const now = ctx.currentTime;
      mainGain.gain.setValueAtTime(0, now);
      // Explode to high volume
      mainGain.gain.linearRampToValueAtTime(0.45, now + 0.15);
      // Maintain energy
      mainGain.gain.setValueAtTime(0.45, now + 0.8);
      // Gradual stadium decay
      mainGain.gain.exponentialRampToValueAtTime(0.08, now + 2.2);
      mainGain.gain.exponentialRampToValueAtTime(0.001, now + 3.5);

      // 4. Connect Chain
      noiseNode.connect(bandpass);
      bandpass.connect(lowpass);
      lowpass.connect(mainGain);

      if (pannerNode) {
        mainGain.connect(pannerNode);
        pannerNode.connect(ctx.destination);
      } else {
        mainGain.connect(ctx.destination);
      }

      // 5. Start playing
      noiseNode.start(now);
      noiseNode.stop(now + 3.5);
    } catch (err) {
      console.warn('Failed to play procedural crowd audio:', err);
    }
  },

  /**
   * Triggers a combined goal sequence: Referee whistle followed by massive crowd chants, panned appropriately.
   * @param team - 'home' | 'away'
   */
  triggerGoalSequence(team: 'home' | 'away') {
    const pan = team === 'home' ? -0.6 : 0.6; // Mexico is left, Argentina is right
    
    // Play whistle first
    this.playWhistle(pan);
    
    // Play stadium cheer immediately after whistle start
    setTimeout(() => {
      this.playCrowdCheer(pan);
    }, 250);
  }
};
