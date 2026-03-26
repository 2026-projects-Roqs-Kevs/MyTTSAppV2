import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useSettings} from '../context/SettingsContext';
import taglishCorrectionService from '../services/taglishCorrectionService';

const CustomWordRow = React.memo(
  ({
    item,
    isDarkMode,
    onRemove,
  }: {
    item: string;
    isDarkMode: boolean;
    onRemove: (word: string) => void;
  }) => (
    <View style={[styles.wordRow, isDarkMode && styles.wordRowDark]}>
      <Text style={[styles.wordText, isDarkMode && styles.textDark]}>
        {item}
      </Text>
      <TouchableOpacity onPress={() => onRemove(item)} style={styles.removeBtn}>
        <Icon name="trash-outline" size={18} color="#FF3B30" />
      </TouchableOpacity>
    </View>
  ),
);

const BaseWordRow = React.memo(
  ({item, isDarkMode}: {item: string; isDarkMode: boolean}) => (
    <View style={[styles.wordRow, isDarkMode && styles.wordRowDark]}>
      <Text style={[styles.wordText, isDarkMode && styles.textDark]}>
        {item}
      </Text>
      <View style={styles.baseBadge}>
        <Text style={styles.baseBadgeText}>built-in</Text>
      </View>
    </View>
  ),
);

const WordListScreen = () => {
  const {effectiveTheme} = useSettings();
  const isDarkMode = effectiveTheme === 'dark';

  const [customWords, setCustomWords] = useState<string[]>([]);
  const [baseWords, setBaseWords] = useState<string[]>([]);
  const [newWord, setNewWord] = useState('');
  const [activeTab, setActiveTab] = useState<'custom' | 'base'>('custom');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadWords();
  }, []);

  const loadWords = useCallback(() => {
    setCustomWords(taglishCorrectionService.getCustomWords());
    setBaseWords(taglishCorrectionService.getBaseDictionary());
  }, []);

  const handleAddWord = async () => {
    const word = newWord.trim().toLowerCase();
    if (!word) return;

    if (taglishCorrectionService.isInBaseDictionary(word)) {
      Alert.alert(
        'Already exists',
        `"${word}" is already in the base dictionary.`,
      );
      setNewWord('');
      return;
    }

    if (customWords.includes(word)) {
      Alert.alert('Already exists', `"${word}" is already in your word list.`);
      setNewWord('');
      return;
    }

    try {
      await taglishCorrectionService.addCustomWord(word);
      setNewWord('');
      loadWords();
    } catch (error) {
      Alert.alert('Error', 'Failed to add word.');
    }
  };

  const handleRemoveWord = useCallback((word: string) => {
    Alert.alert('Remove word', `Remove "${word}" from your custom word list?`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await taglishCorrectionService.removeCustomWord(word);
            loadWords();
          } catch (error) {
            Alert.alert('Error', 'Failed to remove word.');
          }
        },
      },
    ]);
  }, []);

  const filteredCustomWords = customWords.filter(w =>
    w.includes(searchQuery.toLowerCase()),
  );

  const filteredBaseWords = baseWords.filter(w =>
    w.includes(searchQuery.toLowerCase()),
  );

  const keyExtractor = useCallback((item: string) => item, []);

  const renderCustomWord = useCallback(
    ({item}: {item: string}) => (
      <CustomWordRow
        item={item}
        isDarkMode={isDarkMode}
        onRemove={handleRemoveWord}
      />
    ),
    [isDarkMode, handleRemoveWord],
  );

  const renderBaseWord = useCallback(
    ({item}: {item: string}) => (
      <BaseWordRow item={item} isDarkMode={isDarkMode} />
    ),
    [isDarkMode],
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, isDarkMode && styles.containerDark]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Add word input */}
      <View style={[styles.addRow, isDarkMode && styles.addRowDark]}>
        <TextInput
          style={[styles.input, isDarkMode && styles.inputDark]}
          value={newWord}
          onChangeText={setNewWord}
          placeholder="Add new English word..."
          placeholderTextColor={isDarkMode ? '#555' : '#bbb'}
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={handleAddWord}
          returnKeyType="done"
        />
        <TouchableOpacity
          style={[styles.addBtn, !newWord.trim() && styles.addBtnDisabled]}
          onPress={handleAddWord}
          disabled={!newWord.trim()}>
          <Icon name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={[styles.searchRow, isDarkMode && styles.searchRowDark]}>
        <Icon
          name="search-outline"
          size={16}
          color={isDarkMode ? '#666' : '#999'}
          style={styles.searchIcon}
        />
        <TextInput
          style={[styles.searchInput, isDarkMode && styles.textDark]}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search words..."
          placeholderTextColor={isDarkMode ? '#555' : '#bbb'}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon
              name="close-circle"
              size={16}
              color={isDarkMode ? '#666' : '#999'}
            />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'custom' && styles.tabActive]}
          onPress={() => setActiveTab('custom')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'custom' && styles.tabTextActive,
              isDarkMode && styles.textDark,
            ]}>
            My Words ({filteredCustomWords.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'base' && styles.tabActive]}
          onPress={() => setActiveTab('base')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'base' && styles.tabTextActive,
              isDarkMode && styles.textDark,
            ]}>
            Built-in ({filteredBaseWords.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Word list */}
      {activeTab === 'custom' ? (
        filteredCustomWords.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon
              name="book-outline"
              size={48}
              color={isDarkMode ? '#444' : '#ddd'}
            />
            <Text style={[styles.emptyText, isDarkMode && styles.subtextDark]}>
              {searchQuery
                ? 'No words match your search'
                : 'No custom words yet.\nAdd English words above to improve\nTaglish transcription accuracy.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredCustomWords}
            keyExtractor={keyExtractor}
            renderItem={renderCustomWord}
            style={styles.list}
            keyboardShouldPersistTaps="handled"
            getItemLayout={(_data, index) => ({
              length: 56, // approximate height of each wordRow
              offset: 56 * index,
              index,
            })}
          />
        )
      ) : (
        <FlatList
          data={filteredBaseWords}
          keyExtractor={keyExtractor}
          renderItem={renderBaseWord}
          style={styles.list}
          keyboardShouldPersistTaps="handled"
          getItemLayout={(_data, index) => ({
            length: 56, // approximate height of each wordRow
            offset: 56 * index,
            index,
          })}
        />
      )}
    </KeyboardAvoidingView>
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
  textDark: {
    color: '#fff',
  },
  subtextDark: {
    color: '#555',
  },

  // Add row
  addRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  addRowDark: {
    backgroundColor: '#2a2a2a',
    borderBottomColor: '#333',
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#333',
  },
  inputDark: {
    backgroundColor: '#1a1a1a',
    color: '#fff',
  },
  addBtn: {
    backgroundColor: '#34C759',
    borderRadius: 8,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnDisabled: {
    backgroundColor: '#999',
  },

  // Search
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  searchRowDark: {
    backgroundColor: '#2a2a2a',
    borderColor: '#333',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    padding: 0,
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginBottom: 8,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  tabActive: {
    backgroundColor: '#007AFF22',
  },
  tabText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#007AFF',
    fontWeight: '700',
  },

  // Word rows
  list: {
    flex: 1,
    paddingHorizontal: 12,
  },
  wordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 8,
    marginBottom: 6,
  },
  wordRowDark: {
    backgroundColor: '#2a2a2a',
  },
  wordText: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  removeBtn: {
    padding: 4,
  },
  baseBadge: {
    backgroundColor: '#007AFF22',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  baseBadgeText: {
    fontSize: 11,
    color: '#007AFF',
    fontWeight: '600',
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default WordListScreen;
