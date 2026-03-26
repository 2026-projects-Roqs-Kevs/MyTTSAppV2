import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  Switch,
  Linking,
  Modal,
  Alert,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import {useSettings} from '../context/SettingsContext';
import Slider from '@react-native-community/slider';

const SettingsScreen = () => {
  const {settings, updateSettings, effectiveTheme} = useSettings();
  const isDarkMode = effectiveTheme === 'dark';
  const navigation = useNavigation();

  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showTextSizeModal, setShowTextSizeModal] = useState(false);

  const handleSendFeedback = () => {
    Linking.openURL('mailto:support@echolink.com?subject=EchoLinK Feedback');
  };

  const handleOpenLicenses = () => {
    Alert.alert(
      'Open Source Licenses',
      'React Native - MIT License\nVosk Speech Recognition - Apache 2.0\nreact-native-tts - MIT License\n@react-native-async-storage/async-storage - MIT License\nreact-native-vector-icons - MIT License\n@react-navigation - MIT License',
      [{text: 'OK'}],
    );
  };

  return (
    <ScrollView style={[styles.container, isDarkMode && styles.containerDark]}>
      {/* Display Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>
          Display
        </Text>

        <TouchableOpacity
          style={[styles.settingItem, isDarkMode && styles.settingItemDark]}
          onPress={() => setShowTextSizeModal(true)}>
          <View style={styles.settingLeft}>
            <Text style={[styles.settingLabel, isDarkMode && styles.textDark]}>
              Text Size
            </Text>
            <Text
              style={[styles.settingSubtext, isDarkMode && styles.subtextDark]}>
              Current: {settings.textSize} (default: 16)
            </Text>
          </View>
          <Icon name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.settingItem, isDarkMode && styles.settingItemDark]}
          onPress={() => setShowThemeModal(true)}>
          <View style={styles.settingLeft}>
            <Text style={[styles.settingLabel, isDarkMode && styles.textDark]}>
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
          <Icon name="chevron-forward" size={20} color="#999" />
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
            <Text style={[styles.settingLabel, isDarkMode && styles.textDark]}>
              Auto-start Recording
            </Text>
            <Text
              style={[styles.settingSubtext, isDarkMode && styles.subtextDark]}>
              Start listening when app opens
            </Text>
          </View>
          <Switch
            value={settings.autoStartRecording}
            onValueChange={value => updateSettings({autoStartRecording: value})}
            trackColor={{false: '#767577', true: '#34C759'}}
          />
        </View>

        <TouchableOpacity
          style={[styles.settingItem, isDarkMode && styles.settingItemDark]}
          onPress={() => setShowLanguageModal(true)}>
          <View style={styles.settingLeft}>
            <Text style={[styles.settingLabel, isDarkMode && styles.textDark]}>
              Language
            </Text>
            <Text
              style={[styles.settingSubtext, isDarkMode && styles.subtextDark]}>
              {settings.language === 'en' ? 'English 🇺🇸' : 'Tagalog 🇵🇭'}
            </Text>
          </View>
          <Icon name="chevron-forward" size={20} color="#999" />
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
            <Text style={[styles.settingLabel, isDarkMode && styles.textDark]}>
              Vibrate on speech
            </Text>
            <Text
              style={[styles.settingSubtext, isDarkMode && styles.subtextDark]}>
              After 5 minutes of silence
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
            <Text style={[styles.settingLabel, isDarkMode && styles.textDark]}>
              Detect only one speaker
            </Text>
            <Text
              style={[styles.settingSubtext, isDarkMode && styles.subtextDark]}>
              Turn off for multi-speaker transcription
            </Text>
          </View>
          <Switch
            value={settings.singleSpeakerMode}
            onValueChange={value => updateSettings({singleSpeakerMode: value})}
            trackColor={{false: '#767577', true: '#34C759'}}
          />
        </View>
      </View>

      {/* Saved Transcriptions */}
      {/* <View style={styles.section}>
        <TouchableOpacity
          style={[styles.settingItem, isDarkMode && styles.settingItemDark]}
          onPress={() => navigation.navigate('Transcriptions' as never)}>
          <View style={styles.settingLeft}>
            <Icon
              name="document-text-outline"
              size={24}
              color="#007AFF"
              style={styles.settingIcon}
            />
            <Text style={[styles.settingLabel, isDarkMode && styles.textDark]}>
              Saved Transcriptions
            </Text>
          </View>
          <Icon name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
      </View> */}
      {/* Tools & Diagnostics Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>
          Tools & Diagnostics
        </Text>

        {/* ── WER Metrics ── */}
        <TouchableOpacity
          style={[styles.settingItem, isDarkMode && styles.settingItemDark]}
          onPress={() => navigation.navigate('WERMetrics' as never)}>
          <View style={styles.settingLeft}>
            <View>
              <Icon
                name="analytics-outline"
                size={22}
                color="#007AFF"
                style={styles.settingIcon}
              />
              <View>
                <Text
                  style={[styles.settingLabel, isDarkMode && styles.textDark]}>
                  WER Metrics
                </Text>
                <Text
                  style={[
                    styles.settingSubtext,
                    isDarkMode && styles.subtextDark,
                  ]}>
                  Test speech recognition accuracy
                </Text>
              </View>
            </View>
          </View>
          <Icon name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.settingItem, isDarkMode && styles.settingItemDark]}
          onPress={() => navigation.navigate('WordList' as never)}>
          <View style={styles.settingLeft}>
            <View>
              <Icon
                name="book-outline"
                size={22}
                color="#007AFF"
                style={styles.settingIcon}
              />
              <View>
                <Text
                  style={[styles.settingLabel, isDarkMode && styles.textDark]}>
                  Word List
                </Text>
                <Text
                  style={[
                    styles.settingSubtext,
                    isDarkMode && styles.subtextDark,
                  ]}>
                  Manage Taglish correction words
                </Text>
              </View>
            </View>
          </View>
          <Icon name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>
          About
        </Text>

        <TouchableOpacity
          style={[styles.settingItem, isDarkMode && styles.settingItemDark]}
          onPress={handleSendFeedback}>
          <View style={styles.settingLeft}>
            <Text style={[styles.settingLabel, isDarkMode && styles.textDark]}>
              Send Feedback
            </Text>
          </View>
          <Icon name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.settingItem, isDarkMode && styles.settingItemDark]}
          onPress={handleOpenLicenses}>
          <View style={styles.settingLeft}>
            <Text style={[styles.settingLabel, isDarkMode && styles.textDark]}>
              Open Source Licenses
            </Text>
          </View>
          <Icon name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
      </View>

      {/* Text Size Modal */}
      <Modal visible={showTextSizeModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              isDarkMode && styles.modalContentDark,
            ]}>
            <Text style={[styles.modalTitle, isDarkMode && styles.textDark]}>
              Text Size
            </Text>

            <Text
              style={[
                styles.previewText,
                isDarkMode && styles.textDark,
                {fontSize: settings.textSize},
              ]}>
              This is sample text
            </Text>

            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={[styles.sizeBtn]}
                onPress={() =>
                  updateSettings({
                    textSize: Math.max(12, settings.textSize - 1),
                  })
                }>
                <Icon name="remove" size={24} color="#007AFF" />
              </TouchableOpacity>

              <Text style={[styles.sizeDisplay, isDarkMode && styles.textDark]}>
                {settings.textSize}
              </Text>

              <TouchableOpacity
                style={[styles.sizeBtn]}
                onPress={() =>
                  updateSettings({
                    textSize: Math.min(24, settings.textSize + 1),
                  })
                }>
                <Icon name="add" size={24} color="#007AFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.resetBtn]}
                onPress={() => updateSettings({textSize: 16})}>
                <Text style={styles.resetBtnText}>Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.doneBtn]}
                onPress={() => setShowTextSizeModal(false)}>
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Theme Modal */}
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

            {['light', 'system', 'dark'].map(theme => (
              <TouchableOpacity
                key={theme}
                style={[
                  styles.optionItem,
                  settings.theme === theme && styles.optionItemSelected,
                ]}
                onPress={() => {
                  updateSettings({theme: theme as 'light' | 'system' | 'dark'});
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
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#c5b9b9',
                padding: 10,
                marginVertical: 10,
                borderRadius: 5,
              }}
              onPress={() => setShowThemeModal(false)}>
              <View>
                <Text style={{color: '#3a3737', fontWeight: 'bold'}}>
                  Close
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Language Modal */}
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

            {[
              {key: 'en', label: 'English 🇺🇸'},
              {key: 'tl', label: 'Tagalog 🇵🇭'},
            ].map(lang => (
              <TouchableOpacity
                key={lang.key}
                style={[
                  styles.optionItem,
                  settings.language === lang.key && styles.optionItemSelected,
                ]}
                onPress={() => {
                  updateSettings({language: lang.key as 'en' | 'tl'});
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
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#c5b9b9',
                padding: 10,
                marginVertical: 10,
                borderRadius: 5,
              }}
              onPress={() => setShowLanguageModal(false)}>
              <View>
                <Text style={{color: '#3a3737', fontWeight: 'bold'}}>
                  Close
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
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
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    paddingHorizontal: 20,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  textDark: {
    color: '#fff',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingItemDark: {
    backgroundColor: '#2a2a2a',
    borderBottomColor: '#444',
  },
  settingLeft: {
    flex: 1,
  },
  settingIcon: {
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
  },
  settingSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 2,
  },
  subtextDark: {
    color: '#666',
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
    marginBottom: 20,
    color: '#333',
  },
  previewText: {
    textAlign: 'center',
    marginVertical: 20,
    color: '#333',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sliderLabel: {
    fontSize: 14,
    color: '#666',
  },
  slider: {
    flex: 1,
    marginHorizontal: 10,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    padding: 20,
    marginVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  resetBtn: {
    backgroundColor: '#f5f5f5',
  },
  resetBtnText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  doneBtn: {
    backgroundColor: '#007AFF',
  },
  doneBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelBtn: {
    backgroundColor: '#ff2222',
  },
  cancelBtnText: {
    color: '#353030',
    fontSize: 16,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  optionItemSelected: {
    backgroundColor: '#5a677288',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  inputLabel: {
    fontSize: 16,
    color: '#333',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    width: 60,
    textAlign: 'center',
    color: '#333',
  },
  textInputDark: {
    borderColor: '#666',
    color: '#fff',
    backgroundColor: '#1a1a1a',
  },
  buttonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 30,
    marginBottom: 20,
  },
  sizeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sizeDisplay: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    minWidth: 60,
    textAlign: 'center',
  },
});

export default SettingsScreen;
