import AsyncStorage from '@react-native-async-storage/async-storage';

const CUSTOM_WORDS_KEY = '@taglish_custom_words';

// Tier 1 — Purely English words (count toward English ratio)
const ENGLISH_WORDS: Set<string> = new Set([
  'the', 'is', 'are', 'was', 'were', 'be', 'been',
  'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'could', 'should', 'may',
  'this', 'that', 'these', 'those',
  'who', 'what', 'where', 'when', 'why', 'how', 'which',
  'and', 'or', 'but', 'for', 'with', 'from', 'about',
  'after', 'before', 'during', 'between',
  'i', 'you', 'he', 'she', 'we', 'they',
  'me', 'him', 'her', 'us', 'them',
  'my', 'your', 'his', 'our', 'their',
  'actually', 'basically', 'honestly', 'anyway',
  'really', 'very', 'too', 'also', 'still',
  'because', 'through', 'even', 'such',
  'something', 'anything', 'nothing', 'someone',
  'everyone', 'anyone', 'nobody',
  'always', 'never', 'sometimes', 'often', 'again', 'maybe',
]);

// Tier 2 — Taglish loanwords (neutral — used in both languages,
// don't count toward English ratio)
const TAGLISH_LOANWORDS: Set<string> = new Set([
  'mall', 'school', 'office', 'hospital', 'church', 'market', 'store',
  'text', 'call', 'chat', 'post', 'share', 'send', 'reply', 'message',
  'phone', 'wifi', 'load', 'charge', 'download', 'upload', 'online',
  'signal', 'battery', 'data', 'internet',
  'budget', 'cash', 'pay', 'bill', 'change', 'receipt',
  'work', 'job', 'boss', 'meeting', 'class', 'project', 'report',
  'deadline', 'pass', 'fail', 'grade',
  'driver', 'ride', 'traffic', 'parking', 'commute',
  'busy', 'free', 'late', 'early', 'sure', 'ready', 'okay', 'ok',
  'sweet', 'nice', 'cute', 'cool', 'fresh',
  'sorry', 'please', 'thanks', 'thank',
  'food', 'drink', 'order', 'delivery', 'rice',
  'check', 'save', 'open', 'close', 'start', 'stop',
  'try', 'need', 'want', 'get', 'take', 'give',
  'no', 'yes',
  'military', 'crush', 'borrow', 'price',
  'straight', 'adjust', 'guarantee',
]);

// Tier 3 — Numbers and neutral words (never count toward ratio)
const NEUTRAL_WORDS: Set<string> = new Set([
  'one', 'two', 'three', 'four', 'five', 'six', 'seven',
  'eight', 'nine', 'ten', 'eleven', 'twelve', 'twenty',
  'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty',
  'ninety', 'hundred', 'percent',
  'today', 'tomorrow', 'yesterday',
  'ok', 'okay',
]);

class TaglishCorrectionService {
  private customWords: Set<string> = new Set();
  private partialHistory: string[][] = [];
  private readonly MAX_HISTORY = 3;
  private readonly CONFIDENCE_MIN = 1;
  private readonly ENGLISH_SWITCH_THRESHOLD = 0.40; // raised from 0.30
  private readonly REQUIRED_ENGLISH_PARTIALS = 2;
  private consecutiveEnglishPartials: number = 0;
  private consecutiveTalagogPartials: number = 0;
  private readonly REQUIRED_TAGALOG_PARTIALS = 3;

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

      const candidate = knownWordsInPartials.find(
        w => !resultWords.includes(w)
      );

      if (candidate) {
        knownWordsInPartials.splice(knownWordsInPartials.indexOf(candidate), 1);
        return candidate;
      }

      return null;
    });

    this.partialHistory = [];

    return corrected
      .filter(w => w !== null)
      .join(' ')
      .trim();
  }

  private extractKnownWordsFromPartials(): string[] {
    const wordCounts: Record<string, number> = {};

    for (const partial of this.partialHistory) {
      const seen = new Set<string>();
      for (const word of partial) {
        const lower = word.toLowerCase();
        if (this.isKnownWord(lower) && !seen.has(lower)) {
          seen.add(lower);
          wordCounts[lower] = (wordCounts[lower] || 0) + 1;
        }
      }
    }

    return Object.entries(wordCounts)
      .filter(([_, count]) => count >= this.CONFIDENCE_MIN)
      .sort((a, b) => b[1] - a[1])
      .map(([word]) => word);
  }

  // Used for <unk> correction — all tiers are valid candidates
  private isKnownWord(word: string): boolean {
    return (
      ENGLISH_WORDS.has(word) ||
      TAGLISH_LOANWORDS.has(word) ||
      NEUTRAL_WORDS.has(word) ||
      this.customWords.has(word)
    );
  }

  // Used for language detection — ONLY pure English words count
  private isEnglishWord(word: string): boolean {
    return ENGLISH_WORDS.has(word) || this.customWords.has(word);
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

  // Updated — combines all three tiers since BASE_DICTIONARY no longer exists
  getBaseDictionary(): string[] {
    return [
      ...Array.from(ENGLISH_WORDS),
      ...Array.from(TAGLISH_LOANWORDS),
      ...Array.from(NEUTRAL_WORDS),
    ].sort();
  }

  // Updated — checks all three tiers
  isInBaseDictionary(word: string): boolean {
    const lower = word.toLowerCase();
    return (
      ENGLISH_WORDS.has(lower) ||
      TAGLISH_LOANWORDS.has(lower) ||
      NEUTRAL_WORDS.has(lower)
    );
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

  detectLanguage(
    partialText: string,
    currentModel: 'tl' | 'en',
  ): 'en' | 'tl' | null {
    const words = this.normalizeWords(partialText);
    if (words.length === 0) return null;

    const englishCount = words.filter(w => this.isEnglishWord(w)).length;
    const englishRatio = englishCount / words.length;

    console.log(
      `>>> [LangDetect] ratio: ${(englishRatio * 100).toFixed(0)}% English`,
      `(${englishCount}/${words.length} words)`,
      `current: ${currentModel}`,
    );

    if (currentModel === 'tl') {
      if (englishRatio >= this.ENGLISH_SWITCH_THRESHOLD) {
        this.consecutiveEnglishPartials++;
        this.consecutiveTalagogPartials = 0;
        if (this.consecutiveEnglishPartials >= this.REQUIRED_ENGLISH_PARTIALS) {
          console.log('>>> [LangDetect] Switching to EN model');
          return 'en';
        }
      } else {
        this.consecutiveEnglishPartials = 0;
      }
    } else {
      if (englishRatio < this.ENGLISH_SWITCH_THRESHOLD) {
        this.consecutiveTalagogPartials++;
        this.consecutiveEnglishPartials = 0;
        if (this.consecutiveTalagogPartials >= this.REQUIRED_TAGALOG_PARTIALS) {
          console.log('>>> [LangDetect] Switching back to TL model');
          return 'tl';
        }
      } else {
        this.consecutiveTalagogPartials = 0;
      }
    }

    return null;
  }

  resetLanguageDetection(): void {
    this.consecutiveEnglishPartials = 0;
    this.consecutiveTalagogPartials = 0;
  }

  resetPartialHistory() {
    this.partialHistory = [];
    this.resetLanguageDetection();
  }
}

export default new TaglishCorrectionService();