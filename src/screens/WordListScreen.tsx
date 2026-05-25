import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  createContext,
  useContext,
} from 'react';
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

const ROW_HEIGHT = 52;

// ── Row theme context ────────────────────────────────────────────────────────
// Rows read theme/font from context instead of props.
// This means renderItem never needs to change its reference when theme changes —
// only the context value updates, and only the rows that actually render re-paint.
type RowTheme = {isDarkMode: boolean; fontFamily: string};
const RowThemeContext = createContext<RowTheme>({
  isDarkMode: false,
  fontFamily: 'System',
});
// ────────────────────────────────────────────────────────────────────────────

const CustomWordRow = React.memo(
  ({item, onRemove}: {item: string; onRemove: (w: string) => void}) => {
    const {isDarkMode, fontFamily} = useContext(RowThemeContext);
    return (
      <View style={[styles.wordRow, isDarkMode && styles.wordRowDark]}>
        <Text
          style={[styles.wordText, isDarkMode && styles.textDark, {fontFamily}]}
          numberOfLines={1}>
          {item}
        </Text>
        <TouchableOpacity
          onPress={() => onRemove(item)}
          style={styles.removeBtn}
          hitSlop={8}>
          <Icon name="trash-outline" size={18} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    );
  },
);

const BaseWordRow = React.memo(({item}: {item: string}) => {
  const {isDarkMode, fontFamily} = useContext(RowThemeContext);
  return (
    <View style={[styles.wordRow, isDarkMode && styles.wordRowDark]}>
      <Text
        style={[styles.wordText, isDarkMode && styles.textDark, {fontFamily}]}
        numberOfLines={1}>
        {item}
      </Text>
      <View style={styles.baseBadge}>
        <Text style={[styles.baseBadgeText, {fontFamily}]}>built-in</Text>
      </View>
    </View>
  );
});

const WordListScreen = () => {
  const {effectiveTheme, settings} = useSettings();
  const isDarkMode = effectiveTheme === 'dark';

  const [customWords, setCustomWords] = useState<string[]>([]);
  const baseWords = useMemo(
    () => taglishCorrectionService.getBaseDictionary(),
    [],
  );

  const [newWord, setNewWord] = useState('');
  const [activeTab, setActiveTab] = useState<'custom' | 'base'>('custom');
  const [baseTabTouched, setBaseTabTouched] = useState(false);

  // ── Debounced search ──────────────────────────────────────────────────────
  const [rawSearch, setRawSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback((text: string) => {
    setRawSearch(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearchQuery(text), 150);
  }, []);

  const clearSearch = useCallback(() => {
    setRawSearch('');
    setSearchQuery('');
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    setCustomWords(taglishCorrectionService.getCustomWords());
  }, []);

  const filteredCustomWords = useMemo(() => {
    if (!searchQuery) return customWords;
    const q = searchQuery.toLowerCase();
    return customWords.filter(w => w.includes(q));
  }, [customWords, searchQuery]);

  const filteredBaseWords = useMemo(() => {
    if (!searchQuery) return baseWords;
    const q = searchQuery.toLowerCase();
    return baseWords.filter(w => w.includes(q));
  }, [baseWords, searchQuery]);

  const handleAddWord = useCallback(async () => {
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
      setCustomWords(prev => [...prev, word].sort());
    } catch {
      Alert.alert('Error', 'Failed to add word.');
    }
  }, [newWord, customWords]);

  const handleRemoveWord = useCallback((word: string) => {
    Alert.alert('Remove word', `Remove "${word}" from your custom word list?`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await taglishCorrectionService.removeCustomWord(word);
            setCustomWords(prev => prev.filter(w => w !== word));
          } catch {
            Alert.alert('Error', 'Failed to remove word.');
          }
        },
      },
    ]);
  }, []);

  const keyExtractor = useCallback((item: string) => item, []);

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: ROW_HEIGHT + 6,
      offset: (ROW_HEIGHT + 6) * index,
      index,
    }),
    [],
  );

  // ── renderItem functions have NO deps — they never change reference ───────
  const renderCustomWord = useCallback(
    ({item}: {item: string}) => (
      <CustomWordRow item={item} onRemove={handleRemoveWord} />
    ),
    [handleRemoveWord], // only changes if handleRemoveWord changes (it doesn't)
  );

  const renderBaseWord = useCallback(
    ({item}: {item: string}) => <BaseWordRow item={item} />,
    [], // truly stable — never changes
  );
  // ─────────────────────────────────────────────────────────────────────────

  const ListEmptyCustom = useMemo(
    () => (
      <View style={styles.emptyContainer}>
        <Icon
          name="book-outline"
          size={48}
          color={isDarkMode ? '#444' : '#ddd'}
        />
        <Text
          style={[
            styles.emptyText,
            isDarkMode && styles.subtextDark,
            {fontFamily: settings.fontFamily},
          ]}>
          {searchQuery
            ? 'No words match your search'
            : 'No custom words yet.\nAdd English words above to improve\nTaglish transcription accuracy.'}
        </Text>
      </View>
    ),
    [isDarkMode, searchQuery, settings.fontFamily],
  );

  const handleBaseTabPress = useCallback(() => {
    setActiveTab('base');
    setBaseTabTouched(true);
  }, []);

  const handleCustomTabPress = useCallback(() => setActiveTab('custom'), []);

  // ── Stable context value — only recreated when theme/font actually changes ─
  const rowTheme = useMemo<RowTheme>(
    () => ({isDarkMode, fontFamily: settings.fontFamily}),
    [isDarkMode, settings.fontFamily],
  );
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <RowThemeContext.Provider value={rowTheme}>
      <KeyboardAvoidingView
        style={[styles.container, isDarkMode && styles.containerDark]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Add word input */}
        <View style={[styles.addRow, isDarkMode && styles.addRowDark]}>
          <TextInput
            style={[
              styles.input,
              isDarkMode && styles.inputDark,
              {fontFamily: settings.fontFamily},
            ]}
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
            style={[
              styles.searchInput,
              isDarkMode && styles.textDark,
              {fontFamily: settings.fontFamily},
            ]}
            value={rawSearch}
            onChangeText={handleSearchChange}
            placeholder="Search words..."
            placeholderTextColor={isDarkMode ? '#555' : '#bbb'}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {rawSearch ? (
            <TouchableOpacity onPress={clearSearch}>
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
            onPress={handleCustomTabPress}>
            <Text
              style={[
                styles.tabText,
                activeTab === 'custom' && styles.tabTextActive,
                isDarkMode && styles.textDark,
                {fontFamily: settings.fontFamily},
              ]}>
              My Words ({filteredCustomWords.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'base' && styles.tabActive]}
            onPress={handleBaseTabPress}>
            <Text
              style={[
                styles.tabText,
                activeTab === 'base' && styles.tabTextActive,
                isDarkMode && styles.textDark,
                {fontFamily: settings.fontFamily},
              ]}>
              Built-in ({filteredBaseWords.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Word lists */}
        <View style={styles.listContainer}>
          <View
            style={
              activeTab === 'custom' ? styles.listVisible : styles.listHidden
            }>
            <FlatList
              data={filteredCustomWords}
              keyExtractor={keyExtractor}
              renderItem={renderCustomWord}
              getItemLayout={getItemLayout}
              ListEmptyComponent={ListEmptyCustom}
              keyboardShouldPersistTaps="handled"
              windowSize={10}
              maxToRenderPerBatch={20}
              initialNumToRender={20}
              removeClippedSubviews={true}
            />
          </View>

          {(activeTab === 'base' || baseTabTouched) && (
            <View
              style={
                activeTab === 'base' ? styles.listVisible : styles.listHidden
              }>
              <FlatList
                data={filteredBaseWords}
                keyExtractor={keyExtractor}
                renderItem={renderBaseWord}
                getItemLayout={getItemLayout}
                keyboardShouldPersistTaps="handled"
                windowSize={10}
                maxToRenderPerBatch={20}
                initialNumToRender={20}
                removeClippedSubviews={true}
              />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </RowThemeContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f5f5f5'},
  containerDark: {backgroundColor: '#1a1a1a'},
  textDark: {color: '#fff'},
  subtextDark: {color: '#555'},

  addRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  addRowDark: {backgroundColor: '#2a2a2a', borderBottomColor: '#333'},
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#333',
  },
  inputDark: {backgroundColor: '#1a1a1a', color: '#fff'},
  addBtn: {
    backgroundColor: '#34C759',
    borderRadius: 8,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnDisabled: {backgroundColor: '#999'},

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
  searchRowDark: {backgroundColor: '#2a2a2a', borderColor: '#333'},
  searchIcon: {marginRight: 8},
  searchInput: {flex: 1, fontSize: 14, color: '#333', padding: 0},

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
  tabActive: {backgroundColor: '#007AFF22'},
  tabText: {fontSize: 14, color: '#999', fontWeight: '500'},
  tabTextActive: {color: '#007AFF', fontWeight: '700'},

  listContainer: {flex: 1, paddingHorizontal: 12},
  listVisible: {flex: 1},
  listHidden: {height: 0, overflow: 'hidden'},

  wordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    height: ROW_HEIGHT,
    borderRadius: 8,
    marginBottom: 6,
  },
  wordRowDark: {backgroundColor: '#2a2a2a'},
  wordText: {fontSize: 15, color: '#333', flex: 1},
  removeBtn: {padding: 4},
  baseBadge: {
    backgroundColor: '#007AFF22',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  baseBadgeText: {fontSize: 11, color: '#007AFF', fontWeight: '600'},

  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 40,
    paddingTop: 80,
  },
  emptyText: {fontSize: 14, color: '#999', textAlign: 'center', lineHeight: 22},
});

export default WordListScreen;
