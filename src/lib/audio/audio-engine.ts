/**
 * AudioEngine — wraps Tone.js synths and effects.
 *
 * Architecture:
 *   MonoSynth → Reverb → Delay → Destination
 *   PolySynth → Reverb → Destination
 *
 * The MonoSynth plays continuous lead notes driven by hand position.
 * The PolySynth plays chords triggered by the spread gesture.
 *
 * Tone.js runs audio processing on the browser's audio thread (via
 * Web Audio API), NOT on the main thread. So even if our JS is busy
 * with particle physics, audio keeps playing smoothly. We only send
 * control messages from the main thread: "change frequency to X",
 * "set volume to Y", "trigger chord Z".
 *
 * IMPORTANT: initialize() must be called inside a user gesture handler
 * (click/tap). Calling it outside will silently fail or throw.
 */

import * as Tone from "tone";

/** Musical scales for quantizing hand position to "good" notes. */
const PENTATONIC_NOTES = [
  "C3", "D3", "E3", "G3", "A3",
  "C4", "D4", "E4", "G4", "A4",
  "C5", "D5", "E5", "G5", "A5",
  "C6",
];

/** Chord voicings for spread gesture. */
const CHORDS: string[][] = [
  ["C4", "E4", "G4"],       // C major
  ["D4", "F#4", "A4"],      // D major
  ["E4", "G#4", "B4"],      // E major
  ["A3", "C4", "E4"],       // A minor
  ["G3", "B3", "D4"],       // G major
  ["F3", "A3", "C4"],       // F major
];

export class AudioEngine {
  private monoSynth: Tone.MonoSynth | null = null;
  private polySynth: Tone.PolySynth | null = null;
  private reverb: Tone.Reverb | null = null;
  private delay: Tone.FeedbackDelay | null = null;
  private _isReady = false;
  private _isMuted = true;
  private chordIndex = 0;
  private currentNote: string | null = null;
  private noteActive = false;

  get isReady(): boolean {
    return this._isReady;
  }

  get isMuted(): boolean {
    return this._isMuted;
  }

  /**
   * Initialize Tone.js audio context and create synths.
   * MUST be called inside a click/tap handler.
   */
  async initialize(): Promise<void> {
    if (this._isReady) return;

    // This is the critical line — starts the Web Audio context.
    // Will throw or silently fail if not inside a user gesture.
    await Tone.start();

    // Effects chain.
    this.reverb = new Tone.Reverb({
      decay: 3,
      wet: 0.3,
    }).toDestination();
    await this.reverb.ready;

    this.delay = new Tone.FeedbackDelay({
      delayTime: "8n",
      feedback: 0.2,
      wet: 0.15,
    }).connect(this.reverb);

    // Lead synth — smooth, atmospheric tone.
    this.monoSynth = new Tone.MonoSynth({
      oscillator: {
        type: "sine",
      },
      envelope: {
        attack: 0.1,
        decay: 0.3,
        sustain: 0.6,
        release: 0.8,
      },
      filterEnvelope: {
        attack: 0.05,
        decay: 0.2,
        sustain: 0.5,
        release: 0.5,
        baseFrequency: 200,
        octaves: 3,
      },
    }).connect(this.delay);

    this.monoSynth.volume.value = -20; // start quiet

    // Chord synth — plays multiple notes simultaneously.
    this.polySynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: "triangle",
      },
      envelope: {
        attack: 0.05,
        decay: 0.4,
        sustain: 0.3,
        release: 1.5,
      },
    }).connect(this.reverb);

    this.polySynth.volume.value = -15;

    this._isReady = true;
    this._isMuted = false;
  }

  /**
   * Update the lead note based on hand position.
   *
   * @param noteIndex — index into the pentatonic scale (0–15)
   * @param volume — 0 to 1, mapped from hand speed
   */
  updateNote(noteIndex: number, volume: number): void {
    if (!this._isReady || this._isMuted || !this.monoSynth) return;

    // Clamp to valid range.
    const idx = Math.max(0, Math.min(PENTATONIC_NOTES.length - 1, Math.round(noteIndex)));
    const note = PENTATONIC_NOTES[idx];

    // Set volume with smooth ramp to avoid clicks.
    // Map 0–1 to -40dB to -8dB range.
    const dbVolume = -40 + volume * 32;
    this.monoSynth.volume.linearRampTo(dbVolume, 0.1);

    // Only trigger a new note if it changed.
    if (note !== this.currentNote) {
      if (this.noteActive) {
        // Glide to new note instead of retriggering — smoother.
        this.monoSynth.frequency.linearRampTo(
          Tone.Frequency(note).toFrequency(),
          0.08
        );
      } else {
        this.monoSynth.triggerAttack(note);
        this.noteActive = true;
      }
      this.currentNote = note;
    }

    // If volume is very low, release the note to avoid constant drone.
    if (volume < 0.05 && this.noteActive) {
      this.monoSynth.triggerRelease();
      this.noteActive = false;
      this.currentNote = null;
    }
  }

  /** Start playing if not already (called when hand appears). */
  startNote(noteIndex: number): void {
    if (!this._isReady || this._isMuted || !this.monoSynth || this.noteActive) return;

    const idx = Math.max(0, Math.min(PENTATONIC_NOTES.length - 1, Math.round(noteIndex)));
    const note = PENTATONIC_NOTES[idx];

    this.monoSynth.triggerAttack(note);
    this.noteActive = true;
    this.currentNote = note;
  }

  /** Stop playing (called when hand disappears). */
  stopNote(): void {
    if (!this.monoSynth || !this.noteActive) return;

    this.monoSynth.triggerRelease();
    this.noteActive = false;
    this.currentNote = null;
  }

  /** Trigger a chord — called on spread gesture. */
  triggerChord(): void {
    if (!this._isReady || this._isMuted || !this.polySynth) return;

    const chord = CHORDS[this.chordIndex % CHORDS.length];
    this.chordIndex++;

    this.polySynth.triggerAttackRelease(chord, "2n");
  }

  /** Toggle mute state. */
  toggleMute(): boolean {
    this._isMuted = !this._isMuted;

    if (this._isMuted) {
      this.stopNote();
    }

    return this._isMuted;
  }

  /** Set mute state directly. */
  setMuted(muted: boolean): void {
    this._isMuted = muted;
    if (muted) {
      this.stopNote();
    }
  }

  /** Clean up all audio resources. */
  destroy(): void {
    this.stopNote();
    this.monoSynth?.dispose();
    this.polySynth?.dispose();
    this.reverb?.dispose();
    this.delay?.dispose();
    this.monoSynth = null;
    this.polySynth = null;
    this.reverb = null;
    this.delay = null;
    this._isReady = false;
  }
}