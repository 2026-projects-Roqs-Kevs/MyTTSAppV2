import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SavedText {
  id: string;
  text: string;
  date: string;
  language: 'en' | 'tl';
}

const STORAGE_KEY = '@saved_texts';

class StorageService {
  async saveText(text: string, language: 'en' | 'tl'): Promise<void> {
    try {
      const existingTexts = await this.getAllTexts();
      
      const newText: SavedText = {
        id: Date.now().toString(),
        text: text,
        date: new Date().toISOString(),
        language: language,
      };

      const updatedTexts = [newText, ...existingTexts];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTexts));
    } catch (error) {
      console.error('Error saving text:', error);
      throw error;
    }
  }

  async getAllTexts(): Promise<SavedText[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting texts:', error);
      return [];
    }
  }

  async deleteText(id: string): Promise<void> {
    try {
      const texts = await this.getAllTexts();
      const filtered = texts.filter(item => item.id !== id);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting text:', error);
      throw error;
    }
  }

  async updateText(id: string, newText: string): Promise<void> {
    try {
      const texts = await this.getAllTexts();
      const updated = texts.map(item =>
        item.id === id ? { ...item, text: newText } : item
      );
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Error updating text:', error);
      throw error;
    }
  }
}

export default new StorageService();