import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import storageService, {SavedText} from '../services/storageService';
import {Clipboard} from 'react-native';
import {useSettings} from '../context/SettingsContext';

const TranscribeScreen = () => {
  const [savedTexts, setSavedTexts] = useState<SavedText[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingText, setEditingText] = useState<SavedText | null>(null);
  const [editValue, setEditValue] = useState('');
  const {settings, effectiveTheme} = useSettings();
  const isDarkMode = effectiveTheme === 'dark';

  useFocusEffect(
    useCallback(() => {
      loadTexts();
    }, []),
  );

  const loadTexts = async () => {
    try {
      setIsLoading(true);
      const texts = await storageService.getAllTexts();
      setSavedTexts(texts);
    } catch (error) {
      Alert.alert('Error', 'Failed to load saved texts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Text', 'Are you sure you want to delete this text?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await storageService.deleteText(id);
            await loadTexts();
            Alert.alert('Success', 'Text deleted successfully');
          } catch (error) {
            Alert.alert('Error', 'Failed to delete text');
          }
        },
      },
    ]);
  };

  const handleCopy = (text: string) => {
    Clipboard.setString(text);
    Alert.alert('Success', 'Text copied to clipboard!');
  };

  const handleEdit = (item: SavedText) => {
    setEditingText(item);
    setEditValue(item.text);
  };

  const handleSaveEdit = async () => {
    if (editingText && editValue.trim()) {
      try {
        await storageService.updateText(editingText.id, editValue.trim());
        await loadTexts();
        setEditingText(null);
        Alert.alert('Success', 'Text updated successfully');
      } catch (error) {
        Alert.alert('Error', 'Failed to update text');
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const renderItem = ({item}: {item: SavedText}) => (
    <View style={[styles.card, isDarkMode && styles.cardDark]}>
      <View style={styles.cardHeader}>
        <Text
          style={[
            styles.languageBadge,
            item.language === 'en' ? styles.englishBadge : styles.tagalogBadge,
          ]}>
          {item.language === 'en' ? '🇺🇸 English' : '🇵🇭 Tagalog'}
        </Text>
        <Text style={[styles.dateText, isDarkMode && styles.textDark]}>
          {formatDate(item.date)}
        </Text>
      </View>

      <Text
        style={[styles.textContent, isDarkMode && styles.textDark]}
        numberOfLines={5}>
        {item.text}
      </Text>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => handleEdit(item)}>
          <Icon name="create-outline" size={20} color="#007AFF" />
          <Text style={styles.actionBtnText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => handleCopy(item.text)}>
          <Icon name="copy-outline" size={20} color="#34C759" />
          <Text style={[styles.actionBtnText, {color: '#34C759'}]}>Copy</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => handleDelete(item.id)}>
          <Icon name="trash-outline" size={20} color="#FF3B30" />
          <Text style={[styles.actionBtnText, {color: '#FF3B30'}]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 20,
        }}>
        <Icon name="information-circle-outline" size={20} color="#3ba7ff" />
        <Text
          style={[
            styles.title,
            isDarkMode && styles.textDark,
            {fontSize: 12, padding: 5, fontStyle: 'italic'},
          ]}>
          Manage your transcription data here
        </Text>
      </View>

      {isLoading ? (
        <Text style={[styles.emptyText, isDarkMode && styles.textDark]}>
          Loading...
        </Text>
      ) : savedTexts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="document-text-outline" size={64} color="#999" />
          <Text style={[styles.emptyText, isDarkMode && styles.textDark]}>
            No saved texts yet
          </Text>
          <Text style={[styles.emptySubText, isDarkMode && styles.textDark]}>
            Transcribe some text and save it to see it here
          </Text>
        </View>
      ) : (
        <FlatList
          data={savedTexts}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Edit Modal */}
      <Modal
        visible={editingText !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingText(null)}>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              isDarkMode && styles.modalContentDark,
            ]}>
            <Text style={[styles.modalTitle, isDarkMode && styles.textDark]}>
              Edit Text
            </Text>

            <TextInput
              style={[styles.textInput, isDarkMode && styles.textInputDark]}
              value={editValue}
              onChangeText={setEditValue}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setEditingText(null)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={handleSaveEdit}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  containerDark: {
    backgroundColor: '#1a1a1a',
  },
  title: {
    fontSize: 24,
    padding: 20,
    color: '#333',
  },
  textDark: {
    color: '#fff',
  },
  listContent: {
    padding: 20,
    paddingTop: 0,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardDark: {
    backgroundColor: '#2a2a2a',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  languageBadge: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  englishBadge: {
    backgroundColor: '#E3F2FD',
    color: '#1976D2',
  },
  tagalogBadge: {
    backgroundColor: '#FFF3E0',
    color: '#F57C00',
  },
  dateText: {
    fontSize: 12,
    color: '#666',
  },
  textContent: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 12,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  modalContentDark: {
    backgroundColor: '#2a2a2a',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  textInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 120,
    color: '#333',
    marginBottom: 16,
  },
  textInputDark: {
    backgroundColor: '#1a1a1a',
    color: '#fff',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#f5f5f5',
  },
  cancelBtnText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: '#34C759',
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TranscribeScreen;
