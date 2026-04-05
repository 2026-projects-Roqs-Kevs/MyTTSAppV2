import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';

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
        item.id === id ? {...item, text: newText} : item,
      );
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Error updating text:', error);
      throw error;
    }
  }

  // NEW — export single transcription to Downloads folder
  async exportToTxt(item: SavedText): Promise<string> {
    try {
      const date = new Date(item.date);
      const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const formattedTime = `${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}`;
      const language = item.language === 'en' ? 'English' : 'Tagalog';
      const fileName = `transcription_${formattedDate}_${formattedTime}_${language}.txt`;
      const filePath = `${RNFS.DownloadDirectoryPath}/${fileName}`;

      const fileContent = [
        `EchoLink Transcription`,
        `====================`,
        `Date: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`,
        `====================`,
        ``,
        item.text,
      ].join('\n');

      await RNFS.writeFile(filePath, fileContent, 'utf8');
      return filePath;
    } catch (error) {
      console.error('Error exporting text:', error);
      throw error;
    }
  }
}

export default new StorageService();