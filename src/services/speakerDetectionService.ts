// ── Speaker Detection Service ─────────────────────────────────────────────────
// Uses pitch clustering to support unlimited speakers.
// Each speaker builds a pitch profile over time (rolling average).
// New speaker detected when pitch differs significantly from ALL known profiles.

interface SpeakerProfile {
  id: number;
  pitchMean: number;   // rolling average pitch
  pitchSamples: number; // how many results averaged in (capped)
  lastSeen: number;
}

// ── Config ────────────────────────────────────────────────────────────────────

const NEW_SPEAKER_THRESHOLD = 0.30;  // 30% pitch difference from all known profiles
const MAX_PROFILE_SAMPLES   = 10;    // cap rolling average to prevent drift
const MIN_PITCH_SAMPLES     = 3;     // need at least 3 pitch readings per utterance
const PITCH_MIN_HZ          = 80;
const PITCH_MAX_HZ          = 400;

class SpeakerDetectionService {
  private profiles: SpeakerProfile[] = [];
  private currentSpeakerId = 1;

  // Pitch buffer — filled between utterances via receivePitch()
  private pitchBuffer: number[] = [];

  // ── Called on every onPitchDetected event ────────────────────────────────
  receivePitch(pitch: number): void {
    if (pitch < PITCH_MIN_HZ || pitch > PITCH_MAX_HZ) return;
    this.pitchBuffer.push(pitch);
    // Keep rolling window of last 30 readings
    if (this.pitchBuffer.length > 30) this.pitchBuffer.shift();
  }

  // ── Called on every final result ─────────────────────────────────────────
  // Returns speaker id and whether it changed
  detectSpeakerChange(text: string): { changed: boolean; speaker: number } {
    const avgPitch = this.getAveragePitch();
    this.pitchBuffer = []; // clear after sampling

    if (avgPitch === 0) {
      return { changed: false, speaker: this.currentSpeakerId };
    }

    // First utterance ever
    if (this.profiles.length === 0) {
      this.profiles.push({
        id: 1,
        pitchMean: avgPitch,
        pitchSamples: 1,
        lastSeen: Date.now(),
      });
      this.currentSpeakerId = 1;
      console.log(`[Speaker] First speaker registered — Person 1, pitch=${avgPitch.toFixed(1)}Hz`);
      return { changed: false, speaker: 1 };
    }

    // Find the closest existing profile
    let bestMatch: SpeakerProfile | null = null;
    let bestDiff = Infinity;

    for (const profile of this.profiles) {
      const diff = Math.abs(avgPitch - profile.pitchMean) / profile.pitchMean;
      console.log(`[Speaker] vs Person ${profile.id}: pitchDiff=${(diff * 100).toFixed(1)}% (avg=${avgPitch.toFixed(1)}Hz, ref=${profile.pitchMean.toFixed(1)}Hz)`);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestMatch = profile;
      }
    }

    if (bestDiff <= NEW_SPEAKER_THRESHOLD && bestMatch) {
      // Known speaker — update their rolling average
      const weight = Math.min(bestMatch.pitchSamples, MAX_PROFILE_SAMPLES);
      bestMatch.pitchMean = (bestMatch.pitchMean * weight + avgPitch) / (weight + 1);
      bestMatch.pitchSamples = Math.min(bestMatch.pitchSamples + 1, MAX_PROFILE_SAMPLES);
      bestMatch.lastSeen = Date.now();

      const changed = bestMatch.id !== this.currentSpeakerId;
      this.currentSpeakerId = bestMatch.id;

      if (changed) {
        console.log(`[Speaker] Switched back to Person ${bestMatch.id}`);
      }
      return { changed, speaker: bestMatch.id };

    } else {
      // New speaker
      const newId = this.profiles.length + 1;
      this.profiles.push({
        id: newId,
        pitchMean: avgPitch,
        pitchSamples: 1,
        lastSeen: Date.now(),
      });

      const changed = newId !== this.currentSpeakerId;
      this.currentSpeakerId = newId;

      console.log(`[Speaker] New speaker! Person ${newId}, pitch=${avgPitch.toFixed(1)}Hz (diff=${(bestDiff * 100).toFixed(1)}% from nearest)`);
      return { changed, speaker: newId };
    }
  }

  // ── Single-speaker mode ───────────────────────────────────────────────────
  isSameAsReferenceSpeaker(): boolean {
    const avgPitch = this.getAveragePitch();
    this.pitchBuffer = [];

    if (avgPitch === 0) return true;

    if (!this.profiles.length) {
      this.profiles.push({ id: 1, pitchMean: avgPitch, pitchSamples: 1, lastSeen: Date.now() });
      return true;
    }

    const ref = this.profiles[0];
    const diff = Math.abs(avgPitch - ref.pitchMean) / ref.pitchMean;

    if (diff <= NEW_SPEAKER_THRESHOLD) {
      const weight = Math.min(ref.pitchSamples, MAX_PROFILE_SAMPLES);
      ref.pitchMean = (ref.pitchMean * weight + avgPitch) / (weight + 1);
      ref.pitchSamples = Math.min(ref.pitchSamples + 1, MAX_PROFILE_SAMPLES);
      return true;
    }

    return false;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private getAveragePitch(): number {
    if (this.pitchBuffer.length < MIN_PITCH_SAMPLES) return 0;
    // Use median instead of mean — more robust to outliers
    const sorted = [...this.pitchBuffer].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  }

  reset(): void {
    this.profiles = [];
    this.currentSpeakerId = 1;
    this.pitchBuffer = [];
    console.log('[Speaker] Profiles reset');
  }

  getCurrentSpeaker(): number { return this.currentSpeakerId; }
  getSpeakerCount(): number { return this.profiles.length; }
}

export default new SpeakerDetectionService();