import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Modal,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import {useSettings} from '../context/SettingsContext';

const FONT_OPTIONS = [
  {label: 'Default', value: 'sans-serif'},
  {label: 'Light', value: 'sans-serif-light'},
  {label: 'Medium', value: 'sans-serif-medium'},
  {label: 'Condensed', value: 'sans-serif-condensed'},
  {label: 'Monospace', value: 'monospace'},
  {label: 'Serif', value: 'serif'},
  {label: 'Cursive', value: 'cursive'},
];

const PREVIEW_TEXT = 'This is a sample text';

const SettingsScreen = () => {
  const {settings, updateSettings, effectiveTheme} = useSettings();
  const isDarkMode = effectiveTheme === 'dark';
  const navigation = useNavigation();

  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showFontModal, setShowFontModal] = useState(false);

  const handleSendFeedback = () => {
    Linking.openURL(
      'mailto:echolink.email@gmail.com?subject=EchoLinK Feedback',
    );
  };

  const handleOpenLicenses = () => {
    Alert.alert(
      'Open Source Licenses',
      'React Native - MIT License\n\nVosk Speech Recognition - Apache 2.0\n\n@react-native-async-storage/async-storage - MIT License\n\nreact-native-vector-icons - MIT License\n\n@react-navigation - MIT License',
      [{text: 'OK'}],
    );
  };

  const currentFontLabel =
    FONT_OPTIONS.find(f => f.value === settings.fontFamily)?.label ?? 'Default';

  return (
    <ScrollView style={[styles.container, isDarkMode && styles.containerDark]}>
      {/* Display Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>
          Display
        </Text>

        {/* Font Style */}
        <TouchableOpacity
          style={[styles.settingItem, isDarkMode && styles.settingItemDark]}
          onPress={() => setShowFontModal(true)}>
          <View style={styles.settingLeft}>
            <Text
              style={[
                styles.settingLabel,
                isDarkMode && styles.settingLabelDark,
              ]}>
              Font Style
            </Text>
            <Text
              style={[styles.settingSubtext, isDarkMode && styles.subtextDark]}>
              {currentFontLabel}
            </Text>
          </View>
          <Icon
            name="chevron-forward"
            size={18}
            color={isDarkMode ? '#666' : '#bbb'}
          />
        </TouchableOpacity>

        {/* Theme */}
        <TouchableOpacity
          style={[styles.settingItem, isDarkMode && styles.settingItemDark]}
          onPress={() => setShowThemeModal(true)}>
          <View style={styles.settingLeft}>
            <Text
              style={[
                styles.settingLabel,
                isDarkMode && styles.settingLabelDark,
              ]}>
              Theme
            </Text>
            <Text
              style={[styles.settingSubtext, isDarkMode && styles.subtextDark]}>
              {settings.theme === 'light'
                ? 'Light'
                : settings.theme === 'dark'
                ? 'Dark'
                : 'System'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Audio & Language Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>
          Audio & Language
        </Text>

        <View
          style={[styles.settingItem, isDarkMode && styles.settingItemDark]}>
          <View style={styles.settingLeft}>
            <Text
              style={[
                styles.settingLabel,
                isDarkMode && styles.settingLabelDark,
              ]}>
              Auto-start Recording
            </Text>
            <Text
              style={[styles.settingSubtext, isDarkMode && styles.subtextDark]}>
              Start listening when app opens
            </Text>
          </View>
          <Icon
            name="chevron-forward"
            size={18}
            color={isDarkMode ? '#666' : '#bbb'}
          />
        </View>

        <View
          style={[styles.settingItem, isDarkMode && styles.settingItemDark]}>
          <View style={styles.settingLeft}>
            <Text
              style={[
                styles.settingLabel,
                isDarkMode && styles.settingLabelDark,
              ]}>
              Detect only one speaker
            </Text>
            <Text
              style={[styles.settingSubtext, isDarkMode && styles.subtextDark]}>
              Turn off for multi-speaker transcription
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.settingItem, isDarkMode && styles.settingItemDark]}
          onPress={() => setShowLanguageModal(true)}>
          <View style={styles.settingLeft}>
            <Text
              style={[
                styles.settingLabel,
                isDarkMode && styles.settingLabelDark,
              ]}>
              Language
            </Text>
            <Text
              style={[styles.settingSubtext, isDarkMode && styles.subtextDark]}>
              {settings.language === 'en' ? 'English' : 'Tagalog'}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.settingItem, isDarkMode && styles.settingItemDark]}
          onPress={() => navigation.navigate('WordList' as never)}>
          <View style={styles.settingLeft}>
            <Text
              style={[
                styles.settingLabel,
                isDarkMode && styles.settingLabelDark,
              ]}>
              Word List
            </Text>
            <Text
              style={[styles.settingSubtext, isDarkMode && styles.subtextDark]}>
              Manage Taglish correction words
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Events Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>
          Events
        </Text>

        <View
          style={[styles.settingItem, isDarkMode && styles.settingItemDark]}>
          <View style={styles.settingLeft}>
            <Text
              style={[
                styles.settingLabel,
                isDarkMode && styles.settingLabelDark,
              ]}>
              Vibrate on speech
            </Text>
            <Text
              style={[styles.settingSubtext, isDarkMode && styles.subtextDark]}>
              Phone vibrate when someone starts speaking after the pause of at
              least 10 minutes
            </Text>
          </View>
        </View>

        <View
          style={[styles.settingItem, isDarkMode && styles.settingItemDark]}>
          <View style={styles.settingLeft}>
            <Text
              style={[
                styles.settingLabel,
                isDarkMode && styles.settingLabelDark,
              ]}>
              Noise Reduction
            </Text>
          </View>
        </View>
      </View>

      {/* Support Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>
          Support
        </Text>

        <TouchableOpacity
          style={[styles.settingItem, isDarkMode && styles.settingItemDark]}
          onPress={handleSendFeedback}>
          <View style={styles.settingLeft}>
            <Text
              style={[
                styles.settingLabel,
                isDarkMode && styles.settingLabelDark,
              ]}>
              Send Feedback
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.settingItem, isDarkMode && styles.settingItemDark]}
          onPress={handleOpenLicenses}>
          <View style={styles.settingLeft}>
            <Text
              style={[
                styles.settingLabel,
                isDarkMode && styles.settingLabelDark,
              ]}>
              Open Source Licenses
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>
          About
        </Text>

        <TouchableOpacity
          style={[styles.settingItem, isDarkMode && styles.settingItemDark]}
          onPress={() => navigation.navigate('About' as never)}>
          <View style={styles.settingLeft}>
            <Text
              style={[
                styles.settingLabel,
                isDarkMode && styles.settingLabelDark,
              ]}>
              About EchoLink
            </Text>
            <Text
              style={[styles.settingSubtext, isDarkMode && styles.subtextDark]}>
              Version, modules & how it works
            </Text>
          </View>
          <Icon
            name="chevron-forward"
            size={18}
            color={isDarkMode ? '#666' : '#bbb'}
          />
        </TouchableOpacity>
      </View>

      <View style={{height: 32}} />

      {/* ── Font Style Modal ── */}
      <Modal visible={showFontModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              isDarkMode && styles.modalContentDark,
            ]}>
            <Text style={[styles.modalTitle, isDarkMode && styles.textDark]}>
              Font Style
            </Text>

            <ScrollView
              style={{maxHeight: 420}}
              showsVerticalScrollIndicator={false}>
              {FONT_OPTIONS.map(font => {
                const isSelected = settings.fontFamily === font.value;
                return (
                  <TouchableOpacity
                    key={font.value}
                    style={[
                      styles.fontOption,
                      isDarkMode && styles.fontOptionDark,
                      isSelected && styles.fontOptionSelected,
                    ]}
                    onPress={() => {
                      updateSettings({fontFamily: font.value});
                      setShowFontModal(false);
                    }}>
                    {/* Label row */}
                    <View style={styles.fontOptionHeader}>
                      <Text
                        style={[
                          styles.fontOptionLabel,
                          isDarkMode && styles.textDark,
                        ]}>
                        {font.label}
                      </Text>
                      {isSelected && (
                        <Icon name="checkmark" size={18} color="#007AFF" />
                      )}
                    </View>
                    {/* Preview */}
                    <Text
                      style={[
                        styles.fontOptionPreview,
                        {fontFamily: font.value},
                        isDarkMode && styles.subtextDark,
                      ]}>
                      {PREVIEW_TEXT}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setShowFontModal(false)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Theme Modal ── */}
      <Modal visible={showThemeModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              isDarkMode && styles.modalContentDark,
            ]}>
            <Text style={[styles.modalTitle, isDarkMode && styles.textDark]}>
              Theme
            </Text>
            {(['light', 'system', 'dark'] as const).map(theme => (
              <TouchableOpacity
                key={theme}
                style={[
                  styles.optionItem,
                  settings.theme === theme && styles.optionItemSelected,
                ]}
                onPress={() => {
                  updateSettings({theme});
                  setShowThemeModal(false);
                }}>
                <Text
                  style={[styles.optionText, isDarkMode && styles.textDark]}>
                  {theme === 'light'
                    ? 'Light'
                    : theme === 'dark'
                    ? 'Dark'
                    : 'System'}
                </Text>
                {settings.theme === theme && (
                  <Icon name="checkmark" size={24} color="#007AFF" />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setShowThemeModal(false)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Language Modal ── */}
      <Modal visible={showLanguageModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              isDarkMode && styles.modalContentDark,
            ]}>
            <Text style={[styles.modalTitle, isDarkMode && styles.textDark]}>
              Language
            </Text>
            {(
              [
                {key: 'en', label: 'English 🇺🇸'},
                {key: 'tl', label: 'Tagalog 🇵🇭'},
              ] as const
            ).map(lang => (
              <TouchableOpacity
                key={lang.key}
                style={[
                  styles.optionItem,
                  settings.language === lang.key && styles.optionItemSelected,
                ]}
                onPress={() => {
                  updateSettings({language: lang.key});
                  setShowLanguageModal(false);
                }}>
                <Text
                  style={[styles.optionText, isDarkMode && styles.textDark]}>
                  {lang.label}
                </Text>
                {settings.language === lang.key && (
                  <Icon name="checkmark" size={24} color="#007AFF" />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setShowLanguageModal(false)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f5f5f5'},
  containerDark: {backgroundColor: '#4F4F4F'},
  section: {marginTop: 20},
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#056530',
    paddingHorizontal: 20,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  textDark: {color: '#3FD8A3'},
  subtextDark: {color: '#c1b8b8'},
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
    padding: 16,
  },
  settingItemDark: {backgroundColor: 'transparent'},
  settingLeft: {flex: 1},
  settingLabel: {fontSize: 16, color: '#333'},
  settingLabelDark: {color: '#e0dcdc'},
  settingSubtext: {fontSize: 14, color: '#777575', marginTop: 2},
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
  modalContentDark: {backgroundColor: '#2a2a2a'},
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },

  // Font option card
  fontOption: {
    backgroundColor: '#f7f7f7',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  fontOptionDark: {backgroundColor: '#1a1a1a'},
  fontOptionSelected: {borderColor: '#007AFF'},
  fontOptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  fontOptionLabel: {fontSize: 13, fontWeight: '700', color: '#333'},
  fontOptionPreview: {fontSize: 15, color: '#555'},

  // Shared option item (theme/language)
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  optionItemSelected: {backgroundColor: '#5a677288'},
  optionText: {fontSize: 16, color: '#333'},

  // Close button
  closeBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#c5b9b9',
    padding: 12,
    marginTop: 12,
    borderRadius: 8,
  },
  closeBtnText: {color: '#3a3737', fontWeight: 'bold', fontSize: 15},
});

export default SettingsScreen;
