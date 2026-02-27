
export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  constructor() {
    // Audio context is initialized on first user interaction
  }

  // Called by InputHandler on first interaction
  public resume() {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    this.masterGain.gain.value = 0.3; // Master Volume

    // Create White Noise Buffer for impacts
    const bufferSize = this.ctx.sampleRate * 2; // 2 seconds
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
  }

  private playTone(freq: number, type: OscillatorType, duration: number, volume: number, slideTo?: number) {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(slideTo, this.ctx.currentTime + duration);
    }

    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  private playNoise(duration: number, volume: number) {
      if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;

      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const gain = this.ctx.createGain();
      
      // Filter the noise to sound like a thud/crunch
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 800;

      gain.gain.setValueAtTime(volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      src.start();
      src.stop(this.ctx.currentTime + duration);
  }

  playJump() {
    // Rising tone for jump "Bwuuup"
    this.playTone(120, 'sine', 0.2, 0.4, 300);
  }

  playDoubleJump() {
    // Higher pitched shorter tone
    this.playTone(300, 'sine', 0.15, 0.3, 500);
  }

  playLand() {
    this.playTone(50, 'triangle', 0.05, 0.2, 30);
  }

  playAttack() {
    // Whoosh sound
    this.playTone(150, 'triangle', 0.1, 0.15, 50);
  }

  playShoot() {
    this.playTone(600, 'square', 0.1, 0.1, 100);
  }

  playHit() {
    // Crunchy noise + Low thud
    this.playNoise(0.15, 0.5);
    this.playTone(80, 'sawtooth', 0.1, 0.3, 40);
  }

  playCollect() {
    // High ping
    this.playTone(800, 'sine', 0.1, 0.3, 1200);
  }

  playEnemyAttack() {
    this.playTone(100, 'sawtooth', 0.2, 0.2, 50);
  }

  playDash() {
    // Quick air slide
    this.playTone(200, 'sawtooth', 0.15, 0.2, 600);
  }
}

export const audio = new AudioManager();
