import { NativeModules } from 'react-native';

const { MFCCModule, Vosk } = NativeModules;

// ── Types ────────────────────────────────────────────────────────────────────

interface SpeakerProfile {
  id: number;
  centroid: number[];
  sampleCount: number;
  lastSeen: number;
}

interface SpeakerResult {
  speaker: number;
  changed: boolean;
  isNewSpeaker: boolean;
  confidence: number;
}

// ── Config ───────────────────────────────────────────────────────────────────

const SIMILARITY_THRESHOLD = 0.82;
const MAX_CENTROID_SAMPLES = 8;
const MIN_CONFIDENCE_TO_UPDATE = 0.70;

// ── Cosine similarity ────────────────────────────────────────────────────────

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;
  return (dot / denom + 1) / 2;
}

// ── Rolling centroid update ──────────────────────────────────────────────────

function updateCentroid(
  current: number[],
  newVector: number[],
  sampleCount: number,
): number[] {
  const weight = Math.min(sampleCount, MAX_CENTROID_SAMPLES);
  return current.map((v, i) => (v * weight + newVector[i]) / (weight + 1));
}

// ── MFCCSpeakerService ───────────────────────────────────────────────────────

class MFCCSpeakerService {
  private profiles: SpeakerProfile[] = [];
  private currentSpeakerId: number = 1;
  private isEnabled: boolean = true;
  private utteranceStarted: boolean = false;

  // ── Called when a NEW utterance begins (on first partial result) ─────────
  //    This resets the PCM buffer so we only capture audio for THIS utterance

  async onUtteranceStart(): Promise<void> {
    try {
      await Vosk.resetPCMBuffer();
      this.utteranceStarted = true;
      console.log('[MFCC] PCM buffer reset — new utterance started');
    } catch (e) {
      console.warn('[MFCC] resetPCMBuffer failed:', e);
    }
  }

  // ── Called when final result arrives — reads PCM for this utterance ──────

  async identifySpeaker(): Promise<SpeakerResult> {
    const fallback: SpeakerResult = {
      speaker: this.currentSpeakerId,
      changed: false,
      isNewSpeaker: false,
      confidence: 1,
    };

    if (!this.isEnabled) return fallback;

    try {
      // Get PCM samples captured since onUtteranceStart()
      const pcmSamples: number[] = await Vosk.flushPCMBuffer();
      this.utteranceStarted = false;

      if (!pcmSamples || pcmSamples.length === 0) {
        console.log('[MFCC] Empty PCM buffer, skipping');
        return fallback;
      }

      console.log(`[MFCC] PCM samples for utterance: ${pcmSamples.length}`);

      // Compute MFCC vector
      let mfcc: number[];
      try {
        mfcc = await MFCCModule.computeMFCC(pcmSamples);
      } catch (e: any) {
        console.log('[MFCC] Skipped:', e?.message ?? e);
        return fallback;
      }

      return this.classifySpeaker(mfcc);

    } catch (error) {
      console.error('[MFCC] identifySpeaker error:', error);
      return fallback;
    }
  }

  // ── Classifier ───────────────────────────────────────────────────────────

  private classifySpeaker(mfcc: number[]): SpeakerResult {
    if (this.profiles.length === 0) {
      this.profiles.push({
        id: 1,
        centroid: mfcc,
        sampleCount: 1,
        lastSeen: Date.now(),
      });
      this.currentSpeakerId = 1;
      console.log('[MFCC] First speaker registered as Person 1');
      return { speaker: 1, changed: false, isNewSpeaker: true, confidence: 1 };
    }

    let bestMatch: SpeakerProfile | null = null;
    let bestScore = -1;

    for (const profile of this.profiles) {
      const score = cosineSimilarity(mfcc, profile.centroid);
      console.log(`[MFCC] vs Person ${profile.id}: similarity=${score.toFixed(3)}`);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = profile;
      }
    }

    if (bestScore >= SIMILARITY_THRESHOLD && bestMatch) {
      if (bestScore >= MIN_CONFIDENCE_TO_UPDATE) {
        bestMatch.centroid = updateCentroid(
          bestMatch.centroid,
          mfcc,
          bestMatch.sampleCount,
        );
        bestMatch.sampleCount = Math.min(
          bestMatch.sampleCount + 1,
          MAX_CENTROID_SAMPLES,
        );
      }
      bestMatch.lastSeen = Date.now();

      const changed = bestMatch.id !== this.currentSpeakerId;
      this.currentSpeakerId = bestMatch.id;

      return {
        speaker: bestMatch.id,
        changed,
        isNewSpeaker: false,
        confidence: bestScore,
      };

    } else {
      const newId = this.profiles.length + 1;
      this.profiles.push({
        id: newId,
        centroid: mfcc,
        sampleCount: 1,
        lastSeen: Date.now(),
      });

      const changed = newId !== this.currentSpeakerId;
      this.currentSpeakerId = newId;

      console.log(
        `[MFCC] New speaker detected! Person ${newId} (best match was ${bestScore.toFixed(3)})`,
      );
      return {
        speaker: newId,
        changed,
        isNewSpeaker: true,
        confidence: bestScore,
      };
    }
  }

  // ── Single-speaker mode ───────────────────────────────────────────────────

  async isSameAsReferenceSpeaker(): Promise<boolean> {
    const result = await this.identifySpeaker();
    return result.speaker === 1;
  }

  // ── Controls ─────────────────────────────────────────────────────────────

  reset(): void {
    this.profiles = [];
    this.currentSpeakerId = 1;
    this.utteranceStarted = false;
    console.log('[MFCC] Speaker profiles reset');
  }

  getCurrentSpeaker(): number {
    return this.currentSpeakerId;
  }

  getSpeakerCount(): number {
    return this.profiles.length;
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }
}

export default new MFCCSpeakerService();