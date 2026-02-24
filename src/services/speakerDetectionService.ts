interface VoiceCharacteristics {
  averagePitch: number;
  averageVolume: number;
  speakingRate: number;
}

class SpeakerDetectionService {
  private currentSpeaker: number = 1;
  private previousCharacteristics: VoiceCharacteristics | null = null;
  private speakerHistory: number[] = [];
  private readonly CHANGE_THRESHOLD = 0.3; // 30% difference triggers speaker change

  analyzeText(text: string): VoiceCharacteristics {
    // Simple heuristics based on text patterns
    const words = text.split(' ').filter(w => w.length > 0);
    const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length || 0;
    
    // Estimate characteristics (simplified)
    return {
      averagePitch: avgWordLength * 10, // Rough estimation
      averageVolume: text.length / 10,
      speakingRate: words.length,
    };
  }

  detectSpeakerChange(currentText: string): { changed: boolean; speaker: number } {
    const current = this.analyzeText(currentText);

    if (!this.previousCharacteristics) {
      this.previousCharacteristics = current;
      this.speakerHistory.push(this.currentSpeaker);
      return { changed: false, speaker: this.currentSpeaker };
    }

    // Calculate difference percentage
    const pitchDiff = Math.abs(current.averagePitch - this.previousCharacteristics.averagePitch) 
      / this.previousCharacteristics.averagePitch;
    const volumeDiff = Math.abs(current.averageVolume - this.previousCharacteristics.averageVolume) 
      / this.previousCharacteristics.averageVolume;

    // If significant change detected
    if (pitchDiff > this.CHANGE_THRESHOLD || volumeDiff > this.CHANGE_THRESHOLD) {
      // Toggle between speakers (simple 2-person detection)
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
  }
}

export default new SpeakerDetectionService();