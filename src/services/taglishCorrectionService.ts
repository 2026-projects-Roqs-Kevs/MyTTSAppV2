import AsyncStorage from '@react-native-async-storage/async-storage';

const CUSTOM_WORDS_KEY = '@taglish_custom_words';

// Base dictionary — common Taglish English words
const BASE_DICTIONARY: Set<string> = new Set([
  // Places
  'mall', 'school', 'office', 'hospital', 'church', 'market', 'store',
  // Communication
  'text', 'call', 'chat', 'post', 'share', 'send', 'reply', 'message',
  // Tech
  'phone', 'wifi', 'load', 'charge', 'download', 'upload', 'online',
  'signal', 'battery', 'data', 'internet',
  // Money
  'budget', 'cash', 'pay', 'bill', 'change', 'receipt',
  // Work/School
  'work', 'job', 'boss', 'meeting', 'class', 'project', 'report',
  'deadline', 'pass', 'fail', 'grade',
  // Transport
  'driver', 'ride', 'traffic', 'parking', 'commute',
  // Common adjectives
  'busy', 'free', 'late', 'early', 'sure', 'ready', 'okay', 'ok',
  'sweet', 'nice', 'cute', 'cool', 'fresh',
  // Common fillers
  'actually', 'basically', 'honestly', 'anyway', 'wait',
  'sorry', 'please', 'thanks', 'thank',
  // Food
  'food', 'drink', 'order', 'delivery', 'rice', 'viand',
  // Common verbs
  'check', 'save', 'open', 'close', 'start', 'stop',
  'try', 'need', 'want', 'get', 'take', 'give',
]);

class TaglishCorrectionService {
  private customWords: Set<string> = new Set();
  private partialHistory: string[][] = []; // last 3 partial word arrays
  private readonly MAX_HISTORY = 3;
  private readonly CONFIDENCE_MIN = 1; // word must appear in 2+ partials

  async initialize() {
    try {
      const stored = await AsyncStorage.getItem(CUSTOM_WORDS_KEY);
      if (stored) {
        const arr: string[] = JSON.parse(stored);
        this.customWords = new Set(arr.map(w => w.toLowerCase()));
      }
      console.log('TaglishCorrectionService initialized, custom words:', this.customWords.size);
    } catch (error) {
      console.error('Failed to load custom words:', error);
    }
  }

  // Called on every onPartialResult
  trackPartial(partialText: string) {
    const words = this.normalizeWords(partialText);
    this.partialHistory.push(words);
    if (this.partialHistory.length > this.MAX_HISTORY) {
      this.partialHistory.shift();
    }
  }

  // Called on every onResult — returns corrected text
correct(resultText: string): string {
  const resultWords = resultText.split(' ');
  
    console.log('>>> [Correction] raw result:', resultText);
  console.log('>>> [Correction] partial history:', this.partialHistory);
  const knownWordsInPartials = this.extractKnownWordsFromPartials();
    console.log('>>> [Correction] known words found:', knownWordsInPartials);
  
  const corrected = resultWords.map(word => {
    if (word !== '<unk>') return word;
    
    // Pick the first known word from partials not already used in result
    const candidate = knownWordsInPartials.find(
      w => !resultWords.includes(w)
    );
    
    if (candidate) {
      // Remove it so it's not reused for the next <unk>
      knownWordsInPartials.splice(knownWordsInPartials.indexOf(candidate), 1);
      return candidate;
    }
    
    return null; // remove <unk> with no match
  });

  this.partialHistory = [];

  return corrected
    .filter(w => w !== null)
    .join(' ')
    .trim();
}

private extractKnownWordsFromPartials(): string[] {
  // Count how many partials each known word appeared in
  const wordCounts: Record<string, number> = {};

  for (const partial of this.partialHistory) {
    // Use a Set per partial so we don't double-count within same partial
    const seen = new Set<string>();
    for (const word of partial) {
      const lower = word.toLowerCase();
      if (this.isKnownWord(lower) && !seen.has(lower)) {
        seen.add(lower);
        wordCounts[lower] = (wordCounts[lower] || 0) + 1;
      }
    }
  }

  // Return words that appeared in at least CONFIDENCE_MIN partials
  // sorted by frequency (most confident first)
  return Object.entries(wordCounts)
    .filter(([_, count]) => count >= this.CONFIDENCE_MIN)
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word);
}

  private isKnownWord(word: string): boolean {
    return BASE_DICTIONARY.has(word) || this.customWords.has(word);
  }

  private normalizeWords(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[.,!?;:'"()\-]/g, '')
      .split(' ')
      .filter(w => w.length > 0);
  }

  // ── Custom word management ──────────────────────────────────────────────

  async addCustomWord(word: string): Promise<void> {
    const lower = word.toLowerCase().trim();
    if (!lower) return;
    this.customWords.add(lower);
    await this.saveCustomWords();
  }

  async removeCustomWord(word: string): Promise<void> {
    this.customWords.delete(word.toLowerCase().trim());
    await this.saveCustomWords();
  }

  getCustomWords(): string[] {
    return Array.from(this.customWords).sort();
  }

  getBaseDictionary(): string[] {
    return Array.from(BASE_DICTIONARY).sort();
  }

  isInBaseDictionary(word: string): boolean {
    return BASE_DICTIONARY.has(word.toLowerCase());
  }

  private async saveCustomWords(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        CUSTOM_WORDS_KEY,
        JSON.stringify(Array.from(this.customWords)),
      );
    } catch (error) {
      console.error('Failed to save custom words:', error);
    }
  }

  resetPartialHistory() {
    this.partialHistory = [];
  }
}

export default new TaglishCorrectionService();