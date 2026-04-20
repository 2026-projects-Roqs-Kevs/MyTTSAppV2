import React, {useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import {useSettings} from '../context/SettingsContext';

// ─── Section Data ─────────────────────────────────────────────────────────────

const MODULES = [
  {
    icon: 'mic-circle-outline',
    title: 'Vosk Speech Recognition',
    color: '#34C759',
    description:
      'An open-source, offline-capable speech recognition toolkit. EchoLink uses Vosk to convert spoken audio into text entirely on-device — no internet connection required. Vosk supports multiple languages and delivers fast, low-latency transcription through its lightweight acoustic models.',
  },
  {
    icon: 'git-branch-outline',
    title: 'Hidden Markov Model (HMM)',
    color: '#007AFF',
    description:
      'A statistical model used at the core of Vosk\'s acoustic engine. An HMM represents speech as a sequence of hidden states (such as phonemes) with observable outputs (acoustic features). At each time step, the model estimates which phoneme is most likely being spoken based on audio signals. HMMs capture the temporal nature of speech by modeling how sounds transition from one to the next.',
  },
  {
    icon: 'analytics-outline',
    title: 'Viterbi Algorithm',
    color: '#FF9500',
    description:
      'A dynamic programming algorithm used to decode the most likely sequence of hidden states (phonemes/words) in an HMM given a sequence of observations. Instead of evaluating every possible path through the model — which would be computationally infeasible — Viterbi efficiently finds the optimal transcription path by pruning unlikely branches at each step. This is what turns raw audio probabilities into coherent words.',
  },
  {
    icon: 'language-outline',
    title: 'Taglish Correction Service',
    color: '#FF3B30',
    description:
      'A custom language detection and correction layer built for EchoLink. It analyzes partial and final transcription results to detect whether the speaker has switched between Tagalog and English. When a language switch is detected, the service dynamically swaps the active Vosk model to improve accuracy — enabling real-time Taglish (mixed Tagalog-English) transcription.',
  },
  {
    icon: 'people-outline',
    title: 'Speaker Detection Service',
    color: '#AF52DE',
    description:
      'A pitch-based heuristic service that tracks changes in speaker identity. By analyzing the fundamental frequency (pitch) of each speaker segment, it detects when a new person has started speaking. In multi-speaker mode, this labels transcript segments per detected speaker. In single-speaker mode, it filters out audio that doesn\'t match the reference speaker\'s pitch profile.',
  },
  {
    icon: 'pulse-outline',
    title: 'WaveformView & Amplitude Hook',
    color: '#5AC8FA',
    description:
      'A real-time audio visualization component that renders animated waveform bars driven by the microphone\'s amplitude levels. The useAmplitude hook samples the device\'s audio input and passes normalized volume data to the waveform renderer, giving users live visual feedback during transcription.',
  },
  {
    icon: 'settings-outline',
    title: 'Settings & Persistence (AsyncStorage)',
    color: '#FFCC00',
    description:
      'Application preferences — including theme, language, text size, noise reduction, and auto-start — are persisted locally using React Native AsyncStorage. Settings are loaded on startup and propagated throughout the app via a React Context provider (SettingsContext), ensuring a consistent experience across sessions.',
  },
  {
    icon: 'moon-outline',
    title: 'KeepAwake',
    color: '#30D158',
    description:
      'A utility module (react-native-keep-awake) that prevents the device screen from dimming or locking while EchoLink is actively transcribing. This ensures long-running sessions — such as lectures or meetings — are never interrupted by automatic screen-off behavior.',
  },
];

const TECH_STACK = [
  {label: 'React Native', version: '0.73+'},
  {label: 'Vosk Offline STT', version: 'v0.3'},
  {label: 'TypeScript', version: '5.x'},
  {label: 'React Navigation', version: 'v6'},
  {label: 'AsyncStorage', version: '1.x'},
  {label: 'react-native-vector-icons', version: '10.x'},
];

// ─── ModuleCard ───────────────────────────────────────────────────────────────

interface ModuleCardProps {
  icon: string;
  title: string;
  color: string;
  description: string;
  isDark: boolean;
  delay: number;
}

const ModuleCard: React.FC<ModuleCardProps> = ({icon, title, color, description, isDark, delay}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {toValue: 1, duration: 350, delay, useNativeDriver: true}),
      Animated.timing(translateY, {toValue: 0, duration: 350, delay, useNativeDriver: true}),
    ]).start();
  }, []);

  return (
    <Animated.View style={{opacity, transform: [{translateY}]}}>
      <View style={[cardStyles.card, isDark && cardStyles.cardDark]}>
        <View style={[cardStyles.iconWrap, {backgroundColor: color + '22'}]}>
          <Icon name={icon} size={26} color={color} />
        </View>
        <View style={{flex: 1, gap: 4}}>
          <Text style={[cardStyles.cardTitle, {color}]}>{title}</Text>
          <Text style={[cardStyles.cardDesc, isDark && cardStyles.cardDescDark]}>
            {description}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
};

// ─── AboutScreen ──────────────────────────────────────────────────────────────

const AboutScreen = () => {
  const navigation = useNavigation();
  const {effectiveTheme} = useSettings();
  const isDark = effectiveTheme === 'dark';

  const heroOpacity = useRef(new Animated.Value(0)).current;
  const heroScale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroOpacity, {toValue: 1, duration: 500, useNativeDriver: true}),
      Animated.spring(heroScale, {toValue: 1, friction: 7, useNativeDriver: true}),
    ]).start();
  }, []);

  return (
    <ScrollView
      style={[styles.container, isDark && styles.containerDark]}
      contentContainerStyle={styles.content}>

      {/* Header */}
      <View style={[styles.header, isDark && styles.headerDark]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}>
          <Icon name="chevron-back" size={24} color={isDark ? '#fff' : '#333'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDark && styles.textWhite]}>About</Text>
        <View style={{width: 36}} />
      </View>

      {/* Hero */}
      <Animated.View style={[styles.hero, {opacity: heroOpacity, transform: [{scale: heroScale}]}]}>
        <View style={[styles.logoWrap, isDark && styles.logoWrapDark]}>
          <Image
            source={require('../../assets/bglogo.png')}
            style={styles.logo}
          />
        </View>
        <Text style={[styles.appName, isDark && styles.textWhite]}>EchoLink</Text>
        <Text style={[styles.tagline, isDark && styles.taglineDark]}>
          Offline · Multilingual · Real-Time Transcription
        </Text>
        <View style={styles.badgeRow}>
          <View style={styles.badge}><Text style={styles.badgeText}>v1.0.0</Text></View>
          <View style={[styles.badge, {backgroundColor: '#007AFF22'}]}>
            <Text style={[styles.badgeText, {color: '#007AFF'}]}>React Native</Text>
          </View>
          <View style={[styles.badge, {backgroundColor: '#FF950022'}]}>
            <Text style={[styles.badgeText, {color: '#FF9500'}]}>Tagalog + English</Text>
          </View>
        </View>
      </Animated.View>

      {/* Description */}
      <View style={[styles.descCard, isDark && styles.descCardDark]}>
        <Text style={[styles.descText, isDark && styles.descTextDark]}>
          EchoLink is a fully offline, real-time speech-to-text application designed for
          Filipino users. It supports seamless Taglish (Tagalog + English) transcription,
          dynamic speaker detection, and session analytics — all without sending any audio
          to the cloud.
        </Text>
      </View>

      {/* Modules Section */}
      <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
        Modules & Technologies
      </Text>

      {MODULES.map((mod, i) => (
        <ModuleCard
          key={mod.title}
          {...mod}
          isDark={isDark}
          delay={i * 60}
        />
      ))}

      {/* Tech Stack */}
      <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark, {marginTop: 28}]}>
        Tech Stack
      </Text>
      <View style={[styles.stackGrid, isDark && styles.stackGridDark]}>
        {TECH_STACK.map(item => (
          <View key={item.label} style={[styles.stackItem, isDark && styles.stackItemDark]}>
            <Text style={[styles.stackLabel, isDark && styles.textWhite]}>{item.label}</Text>
            <Text style={[styles.stackVersion, isDark && styles.stackVersionDark]}>{item.version}</Text>
          </View>
        ))}
      </View>

      {/* HMM + Viterbi Deep Dive */}
      <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark, {marginTop: 28}]}>
        How Speech Recognition Works
      </Text>
      <View style={[styles.deepDive, isDark && styles.deepDiveDark]}>
        <Text style={[styles.deepDiveTitle, isDark && styles.textWhite]}>
          Audio → Features → HMM → Viterbi → Words
        </Text>

        {[
          {step: '1', label: 'Audio Capture', desc: 'The microphone captures raw PCM audio frames, which are windowed and transformed into Mel-Frequency Cepstral Coefficients (MFCCs) — a compact representation of the audio spectrum.'},
          {step: '2', label: 'Acoustic Model (HMM)', desc: 'Each phoneme in the vocabulary is modeled as a Hidden Markov Model with emission probabilities (how likely is this MFCC given phoneme X?) and transition probabilities (how likely is phoneme X followed by Y?).'},
          {step: '3', label: 'Viterbi Decoding', desc: 'Given the sequence of MFCC vectors, the Viterbi algorithm efficiently finds the path through the HMM state space that maximizes the joint probability of observations — yielding the most likely sequence of phonemes.'},
          {step: '4', label: 'Language Model', desc: 'A n-gram language model scores word sequences by their statistical likelihood in the target language, allowing the decoder to prefer "I am going" over "eye ham go-ing" even if acoustic scores are similar.'},
          {step: '5', label: 'Final Transcript', desc: 'The best-scoring word sequence is returned as the transcription result and displayed to the user in real time.'},
        ].map(item => (
          <View key={item.step} style={styles.stepRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepNum}>{item.step}</Text>
            </View>
            <View style={{flex: 1, gap: 2}}>
              <Text style={[styles.stepLabel, isDark && styles.textWhite]}>{item.label}</Text>
              <Text style={[styles.stepDesc, isDark && styles.stepDescDark]}>{item.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, isDark && styles.footerTextDark]}>
          Built with ❤️ for the Filipino community
        </Text>
        <Text style={[styles.footerSub, isDark && styles.footerTextDark]}>
          © 2026 EchoLink. All rights reserved.
        </Text>
      </View>
    </ScrollView>
  );
};

// ─── Card Styles ──────────────────────────────────────────────────────────────

const cardStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardDark: {backgroundColor: '#2a2a2a'},
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  cardDesc: {
    fontSize: 13,
    color: '#555',
    lineHeight: 19,
  },
  cardDescDark: {color: '#aaa'},
});

// ─── Screen Styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f5f5f5'},
  containerDark: {backgroundColor: '#1a1a1a'},
  content: {paddingBottom: 40},

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fcf7f7',
    borderBottomWidth: 1,
    borderBottomColor: '#ebebeb',
  },
  headerDark: {backgroundColor: '#252525', borderBottomColor: '#333'},
  backBtn: {padding: 4},
  headerTitle: {fontSize: 17, fontWeight: '700', color: '#1a1a1a'},
  textWhite: {color: '#fff'},

  hero: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    gap: 8,
  },
  logoWrap: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#34C759',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 4,
  },
  logoWrapDark: {backgroundColor: '#2a2a2a'},
  logo: {width: 56, height: 56, resizeMode: 'contain'},
  appName: {fontSize: 26, fontWeight: '800', color: '#1a1a1a', letterSpacing: -0.5},
  tagline: {fontSize: 13, color: '#777', textAlign: 'center'},
  taglineDark: {color: '#888'},
  badgeRow: {flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap', justifyContent: 'center'},
  badge: {
    backgroundColor: '#34C75922',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {fontSize: 11, fontWeight: '700', color: '#34C759'},

  descCard: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  descCardDark: {backgroundColor: '#2a2a2a'},
  descText: {fontSize: 14, lineHeight: 22, color: '#444'},
  descTextDark: {color: '#bbb'},

  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#056530',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginHorizontal: 16,
    marginBottom: 10,
  },
  sectionTitleDark: {color: '#3FD8A3'},

  stackGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 16,
    gap: 8,
  },
  stackGridDark: {},
  stackItem: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: '45%',
    flex: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  stackItemDark: {backgroundColor: '#2a2a2a'},
  stackLabel: {fontSize: 13, fontWeight: '600', color: '#222'},
  stackVersion: {fontSize: 11, color: '#999', marginTop: 2},
  stackVersionDark: {color: '#666'},

  deepDive: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  deepDiveDark: {backgroundColor: '#2a2a2a'},
  deepDiveTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    letterSpacing: 0.3,
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  stepRow: {flexDirection: 'row', gap: 12, alignItems: 'flex-start'},
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  stepNum: {fontSize: 12, fontWeight: '800', color: '#fff'},
  stepLabel: {fontSize: 13, fontWeight: '700', color: '#222'},
  stepDesc: {fontSize: 12, color: '#666', lineHeight: 18},
  stepDescDark: {color: '#999'},

  footer: {alignItems: 'center', paddingVertical: 28, gap: 4},
  footerText: {fontSize: 13, color: '#555', fontWeight: '500'},
  footerSub: {fontSize: 11, color: '#aaa'},
  footerTextDark: {color: '#666'},
});

export default AboutScreen;
