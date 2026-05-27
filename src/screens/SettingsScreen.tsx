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
  Switch,
  TextInput,
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
  const ff = {fontFamily: settings.fontFamily}; // shorthand for convenience

  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showFontModal, setShowFontModal] = useState(false);

  const [customSensitivityInput, setCustomSensitivityInput] = useState(
    String(settings.speakerSensitivityCustom ?? 0.30)
  );

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

  const handleLanguage = () => {
    Alert.alert(
      'EchoLink Language Details',
      'This app supports English, Tagalog, and mixed language (Taglish).\n\n' +
        'Note: Accuracy may vary based on audio quality and speech clarity.',
      [{text: 'OK'}],
    );
  };

  const currentFontLabel =
    FONT_OPTIONS.find(f => f.value === settings.fontFamily)?.label ?? 'Default';

  return (
    <ScrollView style={[styles.container, isDarkMode && styles.containerDark]}>
      {/* Display Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, isDarkMode && styles.textDark, ff]}>
          Display
        </Text>

        <TouchableOpacity
          style={[styles.settingItem, isDarkMode && styles.settingItemDark]}
          onPress={() => setShowFontModal(true)}>
          <View style={styles.settingLeft}>
            <Text
              style={[
                styles.settingLabel,
                isDarkMode && styles.settingLabelDark,
                ff,
              ]}>
              Font Style
            </Text>
            <Text
              style={[
                styles.settingSubtext,
                isDarkMode && styles.subtextDark,
                ff,
              ]}>
              {currentFontLabel}
            </Text>
          </View>
          <Icon
            name="chevron-forward"
            size={18}
            color={isDarkMode ? '#666' : '#bbb'}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.settingItem, isDarkMode && styles.settingItemDark]}
          onPress={() => setShowThemeModal(true)}>
          <View style={styles.settingLeft}>
            <Text
              style={[
                styles.settingLabel,
                isDarkMode && styles.settingLabelDark,
                ff,
              ]}>
              Theme
            </Text>
            <Text
              style={[
                styles.settingSubtext,
                isDarkMode && styles.subtextDark,
                ff,
              ]}>
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
        <Text style={[styles.sectionTitle, isDarkMode && styles.textDark, ff]}>
          Audio & Language
        </Text>

        {/* <View
          style={[styles.settingItem, isDarkMode && styles.settingItemDark]}>
          <View style={styles.settingLeft}>
            <Text
              style={[
                styles.settingLabel,
                isDarkMode && styles.settingLabelDark,
                ff,
              ]}>
              Auto-start Recording
            </Text>
            <Text
              style={[
                styles.settingSubtext,
                isDarkMode && styles.subtextDark,
                ff,
              ]}>
              Start listening when app opens
            </Text>
          </View>
          <Switch
            value={settings.autoStartRecording}
            onValueChange={value => updateSettings({autoStartRecording: value})}
            trackColor={{false: '#767577', true: '#34C759'}}
          />
        </View> */}

        <View
          style={[styles.settingItem, isDarkMode && styles.settingItemDark]}>
          <View style={styles.settingLeft}>
            <Text
              style={[
                styles.settingLabel,
                isDarkMode && styles.settingLabelDark,
                ff,
              ]}>
              Detect only one speaker
            </Text>
            <Text
              style={[
                styles.settingSubtext,
                isDarkMode && styles.subtextDark,
                ff,
              ]}>
              Turn off for multi-speaker transcription
            </Text>
          </View>
          <Switch
            value={settings.singleSpeakerMode}
            onValueChange={value => updateSettings({singleSpeakerMode: value})}
            trackColor={{false: '#767577', true: '#34C759'}}
          />
        </View>

        {/* Speaker Sensitivity — only shown when multi-speaker mode is on */}
        {!settings.singleSpeakerMode && (
          <View style={[styles.settingItem, isDarkMode && styles.settingItemDark, {flexDirection: 'column', alignItems: 'flex-start', gap: 10}]}>
            <View>
              <Text style={[styles.settingLabel, isDarkMode && styles.settingLabelDark, ff]}>
                Speaker Sensitivity
              </Text>
              <Text style={[styles.settingSubtext, isDarkMode && styles.subtextDark, ff]}>
                How different voices need to be to count as a new speaker
              </Text>
            </View>

            {/* Preset buttons */}
            <View style={{flexDirection: 'row', gap: 8, flexWrap: 'wrap'}}>
              {([
                { key: 'low',    label: 'Low',    desc: '45% — very different voices' },
                { key: 'medium', label: 'Medium', desc: '30% — default' },
                { key: 'high',   label: 'High',   desc: '18% — similar voices' },
                { key: 'custom', label: 'Custom', desc: 'Set your own value' },
              ] as const).map(option => (
                <TouchableOpacity
                  key={option.key}
                  onPress={() => updateSettings({speakerSensitivity: option.key})}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    borderRadius: 8,
                    backgroundColor:
                      settings.speakerSensitivity === option.key
                        ? '#34C759'
                        : isDarkMode ? '#444' : '#e0e0e0',
                  }}>
                  <Text style={{
                    fontSize: 13,
                    fontFamily: settings.fontFamily,
                    fontWeight: settings.speakerSensitivity === option.key ? '700' : '400',
                    color: settings.speakerSensitivity === option.key
                      ? '#fff'
                      : isDarkMode ? '#ccc' : '#444',
                  }}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Description of selected preset */}
            {settings.speakerSensitivity !== 'custom' && (
              <Text style={[styles.settingSubtext, isDarkMode && styles.subtextDark, ff]}>
                {settings.speakerSensitivity === 'low'
                  ? '45% difference needed — best for very different voice types (male vs female)'
                  : settings.speakerSensitivity === 'high'
                  ? '18% difference needed — detects similar voices, may over-split one speaker'
                  : '30% difference needed — balanced default for most conversations'}
              </Text>
            )}

            {/* Custom value input */}
            {settings.speakerSensitivity === 'custom' && (
              <View style={{width: '100%', gap: 6}}>
                <Text style={[styles.settingSubtext, isDarkMode && styles.subtextDark, ff]}>
                  Enter a value between 0.05 and 0.60
                </Text>
                <Text style={[styles.settingSubtext, isDarkMode && styles.subtextDark, ff, {fontStyle: 'italic'}]}>
                  Lower = more sensitive (detects similar voices){'\n'}
                  Higher = less sensitive (only very different voices)
                </Text>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4}}>
                  <TextInput
                    value={customSensitivityInput}
                    onChangeText={setCustomSensitivityInput}
                    keyboardType="numeric"
                    placeholder="0.30"
                    placeholderTextColor={isDarkMode ? '#666' : '#aaa'}
                    style={{
                      borderWidth: 1,
                      borderColor: isDarkMode ? '#555' : '#ccc',
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      color: isDarkMode ? '#fff' : '#333',
                      fontFamily: settings.fontFamily,
                      fontSize: 15,
                      width: 100,
                      backgroundColor: isDarkMode ? '#333' : '#f9f9f9',
                    }}
                  />
                  <TouchableOpacity
                    onPress={() => {
                      const parsed = parseFloat(customSensitivityInput);
                      if (!isNaN(parsed) && parsed >= 0.05 && parsed <= 0.60) {
                        updateSettings({speakerSensitivityCustom: parsed});
                      } else {
                        // Reset to last valid value
                        setCustomSensitivityInput(String(settings.speakerSensitivityCustom ?? 0.30));
                      }
                    }}
                    style={{
                      backgroundColor: '#007AFF',
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 8,
                    }}>
                    <Text style={{color: '#fff', fontFamily: settings.fontFamily, fontSize: 14}}>
                      Apply
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.settingSubtext, isDarkMode && styles.subtextDark, ff]}>
                  Current: {settings.speakerSensitivityCustom?.toFixed(2) ?? '0.30'}
                  {' '}({((settings.speakerSensitivityCustom ?? 0.30) * 100).toFixed(0)}% difference threshold)
                </Text>
              </View>
            )}
          </View>
        )}

        <TouchableOpacity
          style={[styles.settingItem, isDarkMode && styles.settingItemDark]}
          onPress={handleLanguage}>
          <View style={styles.settingLeft}>
            <Text
              style={[
                styles.settingLabel,
                isDarkMode && styles.settingLabelDark,
                ff,
              ]}>
              Language
            </Text>
            {/* <Text
              style={[
                styles.settingSubtext,
                isDarkMode && styles.subtextDark,
                ff,
              ]}>
              {settings.language === 'en' ? 'English' : 'Tagalog'}
            </Text> */}
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
                ff,
              ]}>
              Word List
            </Text>
            <Text
              style={[
                styles.settingSubtext,
                isDarkMode && styles.subtextDark,
                ff,
              ]}>
              Manage Taglish correction words
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Events Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, isDarkMode && styles.textDark, ff]}>
          Events
        </Text>

        <View
          style={[styles.settingItem, isDarkMode && styles.settingItemDark]}>
          <View style={styles.settingLeft}>
            <Text
              style={[
                styles.settingLabel,
                isDarkMode && styles.settingLabelDark,
                ff,
              ]}>
              Vibrate on speech
            </Text>
            <Text
              style={[
                styles.settingSubtext,
                isDarkMode && styles.subtextDark,
                ff,
              ]}>
              Phone vibrate when someone starts speaking after the pause of at
              least 10 minutes
            </Text>
          </View>
          <Switch
            value={settings.vibrateOnSpeech}
            onValueChange={value => updateSettings({vibrateOnSpeech: value})}
            trackColor={{false: '#767577', true: '#34C759'}}
          />
        </View>

        <View
          style={[styles.settingItem, isDarkMode && styles.settingItemDark]}>
          <View style={styles.settingLeft}>
            <Text
              style={[
                styles.settingLabel,
                isDarkMode && styles.settingLabelDark,
                ff,
              ]}>
              Noise Reduction
            </Text>
          </View>
          <Switch
            value={settings.noiseReduction}
            onValueChange={value => updateSettings({noiseReduction: value})}
            trackColor={{false: '#767577', true: '#34C759'}}
          />
        </View>
      </View>

      {/* Support Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, isDarkMode && styles.textDark, ff]}>
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
                ff,
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
                ff,
              ]}>
              Open Source Licenses
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, isDarkMode && styles.textDark, ff]}>
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
                ff,
              ]}>
              About EchoLink
            </Text>
            <Text
              style={[
                styles.settingSubtext,
                isDarkMode && styles.subtextDark,
                ff,
              ]}>
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
            <Text
              style={[styles.modalTitle, isDarkMode && styles.textDark, ff]}>
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
                    <View style={styles.fontOptionHeader}>
                      <Text
                        style={[
                          styles.fontOptionLabel,
                          isDarkMode && styles.textDark,
                          ff,
                        ]}>
                        {font.label}
                      </Text>
                      {isSelected && (
                        <Icon name="checkmark" size={18} color="#007AFF" />
                      )}
                    </View>
                    {/* Preview renders in its OWN font, not ff */}
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
              <Text style={[styles.closeBtnText, ff]}>Close</Text>
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
            <Text
              style={[styles.modalTitle, isDarkMode && styles.textDark, ff]}>
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
                  style={[
                    styles.optionText,
                    isDarkMode && styles.textDark,
                    ff,
                  ]}>
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
              <Text style={[styles.closeBtnText, ff]}>Close</Text>
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
            <Text
              style={[styles.modalTitle, isDarkMode && styles.textDark, ff]}>
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
                  style={[
                    styles.optionText,
                    isDarkMode && styles.textDark,
                    ff,
                  ]}>
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
              <Text style={[styles.closeBtnText, ff]}>Close</Text>
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
