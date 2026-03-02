interface VoiceCharacteristics {
  pitch: number;
  timestamp: number;
}

class SpeakerDetectionService {
  private currentSpeaker: number = 1;
  private previousCharacteristics: VoiceCharacteristics | null = null;
  private speakerHistory: number[] = [];
  private readonly CHANGE_THRESHOLD = 0.25;

  private pitchBuffer: number[] = [];
  private readonly PITCH_BUFFER_MAX = 20;

  receivePitch(pitch: number) {
    // Filter out unrealistic pitch values
    // Human voice range: 80Hz (deep male) to 300Hz (high female)
    if (pitch < 80 || pitch > 300) return;
    
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
      this.currentSpeaker = this.currentSpeaker === 1 ? 2 : 1;
      this.previousCharacteristics = current;
      this.speakerHistory.push(this.currentSpeaker);
      return { changed: true, speaker: this.currentSpeaker };
    }

    this.previousCharacteristics = current;
    return { changed: false, speaker: this.currentSpeaker };
  }

  getCurrentSpeaker(): number {
    return this.currentSpeaker;
  }

  reset() {
    this.currentSpeaker = 1;
    this.previousCharacteristics = null;
    this.speakerHistory = [];
    this.pitchBuffer = [];
  }
}

export default new SpeakerDetectionService();