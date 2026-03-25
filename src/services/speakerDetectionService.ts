interface VoiceCharacteristics {
  pitch: number;
  timestamp: number;
}

class SpeakerDetectionService {
  private currentSpeaker: number = 1;
  private previousCharacteristics: VoiceCharacteristics | null = null;
  private speakerHistory: number[] = [];
  private readonly CHANGE_THRESHOLD = 0.40;
  private consecutiveChanges: number = 0;
  private readonly REQUIRED_CONSECUTIVE = 2;

  private pitchBuffer: number[] = [];
  private readonly PITCH_BUFFER_MAX = 20;

  receivePitch(pitch: number) {
    if (pitch < 85 || pitch > 400) return;
    
    this.pitchBuffer.push(pitch);
    if (this.pitchBuffer.length > this.PITCH_BUFFER_MAX) {
      this.pitchBuffer.shift();
    }
  }

  private getAveragePitch(): number {
    if (this.pitchBuffer.length === 0) return 0;
    const sum = this.pitchBuffer.reduce((a, b) => a + b, 0);
    return sum / this.pitchBuffer.length;
  }

  detectSpeakerChange(currentText: string): { changed: boolean; speaker: number } {
    const avgPitch = this.getAveragePitch();
    console.log('>>> avgPitch:', avgPitch);
    console.log('>>> pitchBuffer length:', this.pitchBuffer.length);
    console.log('>>> previousPitch:', this.previousCharacteristics?.pitch);

    // Clear buffer after sampling so next result gets fresh readings
    this.pitchBuffer = [];

    if (avgPitch === 0) {
      return { changed: false, speaker: this.currentSpeaker };
    }

    const current: VoiceCharacteristics = {
      pitch: avgPitch,
      timestamp: Date.now(),
    };

    if (!this.previousCharacteristics) {
      this.previousCharacteristics = current;
      this.speakerHistory.push(this.currentSpeaker);
      return { changed: false, speaker: this.currentSpeaker };
    }

    const pitchDiff = Math.abs(current.pitch - this.previousCharacteristics.pitch)
      / this.previousCharacteristics.pitch;

    console.log('>>> pitchDiff:', pitchDiff);

    if (pitchDiff > this.CHANGE_THRESHOLD) {
      this.consecutiveChanges++;
      if (this.consecutiveChanges >= this.REQUIRED_CONSECUTIVE) {
        this.currentSpeaker = this.currentSpeaker === 1 ? 2 : 1;
        this.consecutiveChanges = 0;
        this.previousCharacteristics = current;
        this.speakerHistory.push(this.currentSpeaker);
        return { changed: true, speaker: this.currentSpeaker };
      }
    } else {
      this.consecutiveChanges = 0;
    }

    this.previousCharacteristics = current;
    return { changed: false, speaker: this.currentSpeaker };
  }

  isSameAsReferenceSpeaker(): boolean {
    const avgPitch = this.getAveragePitch();

    if (avgPitch === 0 || this.pitchBuffer.length < 2) {
      this.pitchBuffer = [];
      return true;
    }

    this.pitchBuffer = [];

    if (!this.previousCharacteristics) {
      this.previousCharacteristics = {
        pitch: avgPitch,
        timestamp: Date.now(),
      };
      return true;
    }

    const pitchDiff =
      Math.abs(avgPitch - this.previousCharacteristics.pitch) /
      this.previousCharacteristics.pitch;

    console.log('>>> [SingleSpeaker] pitchDiff:', pitchDiff, 'avg:', avgPitch, 'ref:', this.previousCharacteristics.pitch);

    if (pitchDiff <= this.CHANGE_THRESHOLD) {
      // Same speaker — update reference with rolling average
      this.previousCharacteristics = {
        pitch: (this.previousCharacteristics.pitch + avgPitch) / 2,
        timestamp: Date.now(),
      };
      return true;
    }

    return false;
  }

  getCurrentSpeaker(): number {
    return this.currentSpeaker;
  }

  reset() {
    this.currentSpeaker = 1;
    this.previousCharacteristics = null;
    this.speakerHistory = [];
    this.pitchBuffer = [];
    this.consecutiveChanges = 0;
  }
}

export default new SpeakerDetectionService();