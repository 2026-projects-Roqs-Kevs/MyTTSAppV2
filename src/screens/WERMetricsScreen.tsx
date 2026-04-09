import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  PermissionsAndroid,
  PanResponder,
} from 'react-native';
import sttService from '../services/sttService';
import speakerDetectionService from '../services/speakerDetectionService';
import Icon from 'react-native-vector-icons/Ionicons';
import {useSettings} from '../context/SettingsContext';
import KeepAwake from 'react-native-keep-awake';

// ─── Metric Types ───────────────────────────────────────────────────────────

interface SessionMetrics {
  // 1. Estimated Accuracy (heuristic from word characteristics)
  estimatedAccuracy: number;
  // 2. Real-Time Factor = audio duration / processing time
  rtf: number;
  // 3. Processing Latency = ms from startListening → first result
  processingLatencyMs: number;
  // 4. Word Reliability Score = ratio of "reliable" words (len >= 3)
  wordReliabilityScore: number;
  // 5. Words Per Minute
  wpm: number;
  // 6. Audio Signal Quality = estimated from partial-to-final conversion rate
  signalQuality: number;
  // 7. System Throughput = words per second
  throughputWps: number;
  // 8. Vocal Clarity Index = % of partials that resolved to finals
  vocalClarityIndex: number;

  // Raw session data
  totalWords: number;
  sessionDurationSec: number;
  totalResults: number;
  totalPartials: number;
  resolvedPartials: number;
}

// ─── Metric Computation Helpers ─────────────────────────────────────────────

function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 0).length;
}

/**
 * Estimated Accuracy heuristic:
 * - Penalise very short words (<3 chars) — often misrecognised fillers
 * - Reward longer words that survived Vosk's beam search
 * - Base score 80%, up to 98%, down to 55%
 */
function estimateAccuracy(text: string): number {
  const words = text
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 0);
  if (words.length === 0) return 0;

  const avgLen = words.reduce((s, w) => s + w.length, 0) / words.length;
  const shortRatio = words.filter(w => w.length <= 2).length / words.length;

  // avgLen 5+ → accuracy bonus, short word ratio → penalty
  const base = 80;
  const lenBonus = Math.min((avgLen - 3) * 3, 15); // up to +15
  const shortPenalty = shortRatio * 25; // up to -25

  return Math.min(98, Math.max(55, base + lenBonus - shortPenalty));
}

/**
 * Word Reliability Score:
 * % of words with length >= 3 (single/double char outputs are often noise)
 */
function wordReliabilityScore(text: string): number {
  const words = text
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 0);
  if (words.length === 0) return 0;
  const reliable = words.filter(w => w.length >= 3).length;
  return (reliable / words.length) * 100;
}

function computeMetrics(data: {
  transcribedText: string;
  sessionStartMs: number;
  sessionEndMs: number;
  firstResultMs: number | null;
  totalPartials: number;
  resolvedPartials: number;
  totalResults: number;
}): SessionMetrics {
  const {
    transcribedText,
    sessionStartMs,
    sessionEndMs,
    firstResultMs,
    totalPartials,
    resolvedPartials,
    totalResults,
  } = data;

  const sessionDurationSec = Math.max(
    (sessionEndMs - sessionStartMs) / 1000,
    0.001,
  );
  const totalWords = countWords(transcribedText);

  // 1. Estimated Accuracy
  const estimatedAccuracy = estimateAccuracy(transcribedText);

  // 2. RTF — we estimate audio ≈ session duration; processing ≈ session duration
  //    RTF < 1.0 means faster than real-time (good), we normalise to a quality score
  //    Since we can't truly measure audio vs decode separately, we use result cadence:
  //    more results per second = faster processing = lower RTF
  const resultsPerSec = totalResults / sessionDurationSec;
  const rtf = resultsPerSec > 0 ? Math.min(1 / resultsPerSec, 5) : 1.0;

  // 3. Processing Latency
  const processingLatencyMs =
    firstResultMs !== null ? firstResultMs - sessionStartMs : 0;

  // 4. Word Reliability Score
  const reliability = wordReliabilityScore(transcribedText);

  // 5. WPM
  const wpm = totalWords / (sessionDurationSec / 60);

  // 6. Signal Quality — ratio of partials that resolved into final results
  //    High conversion = clear audio; lots of dropped partials = noise
  const vocalClarityIndex =
    totalPartials > 0 ? (resolvedPartials / totalPartials) * 100 : 100;

  // Signal quality also factors in WPM plausibility (human speech 80–180 wpm)
  const wpmScore = wpm > 0 ? Math.min(100, Math.max(0, 100 - Math.abs(wpm - 130) * 0.5)) : 50;
  const signalQuality = vocalClarityIndex * 0.7 + wpmScore * 0.3;

  // 7. System Throughput (words/sec)
  const throughputWps = totalWords / sessionDurationSec;

  return {
    estimatedAccuracy,
    rtf,
    processingLatencyMs,
    wordReliabilityScore: reliability,
    wpm,
    signalQuality,
    throughputWps,
    vocalClarityIndex,
    totalWords,
    sessionDurationSec,
    totalResults,
    totalPartials,
    resolvedPartials,
  };
}

// ─── Colour helpers ─────────────────────────────────────────────────────────

function scoreColor(value: number, goodHigh: boolean = true): string {
  const v = goodHigh ? value : 100 - value;
  if (v >= 75) return '#34C759';
  if (v >= 45) return '#FF9500';
  return '#FF3B30';
}

function rtfColor(rtf: number): string {
  if (rtf <= 0.5) return '#34C759';
  if (rtf <= 1.5) return '#FF9500';
  return '#FF3B30';
}

function latencyColor(ms: number): string {
  if (ms <= 600) return '#34C759';
  if (ms <= 1500) return '#FF9500';
  return '#FF3B30';
}

function wpmLabel(wpm: number): string {
  if (wpm < 20) return 'Very Slow';
  if (wpm < 80) return 'Slow';
  if (wpm < 160) return 'Normal';
  if (wpm < 220) return 'Fast';
  return 'Very Fast';
}

// ─── Component ─────────────────────────────────────────────────────────────

const WERMetricsScreen = () => {
  const {settings, effectiveTheme} = useSettings();
  const isDarkMode = effectiveTheme === 'dark';

  const [hasStartedOnce, setHasStartedOnce] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [partialText, setPartialText] = useState('');
  const [metrics, setMetrics] = useState<SessionMetrics | null>(null);

  // Session tracking refs
  const sessionStartRef = useRef<number>(0);
  const firstResultRef = useRef<number | null>(null);
  const totalPartialsRef = useRef(0);
  const resolvedPartialsRef = useRef(0);
  const totalResultsRef = useRef(0);
  const lastPartialRef = useRef('');

  const [topPanelFlex, setTopPanelFlex] = useState(1);
  const [bottomPanelFlex, setBottomPanelFlex] = useState(1);
  const containerHeight = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        const total = containerHeight.current;
        if (!total) return;
        const clamped = Math.min(
          Math.max(gestureState.moveY / total, 0.2),
          0.8,
        );
        setTopPanelFlex(clamped);
        setBottomPanelFlex(1 - clamped);
      },
    }),
  ).current;

  useEffect(() => {
    return () => {
      sttService.stopListening().catch(() => {});
    };
  }, []);

  const requestMicPermission = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message: 'Needed for speech recognition.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  };

  const handleStartListening = async () => {
    if (!sttService.getIsInitialized()) {
      Alert.alert(
        'Not Ready',
        'Speech recognition is still initializing. Please wait.',
      );
      return;
    }
    const hasPermission = await requestMicPermission();
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'Microphone permission is required.');
      return;
    }
    try {
      // Reset session tracking
      sessionStartRef.current = Date.now();
      firstResultRef.current = null;
      totalPartialsRef.current = 0;
      resolvedPartialsRef.current = 0;
      totalResultsRef.current = 0;
      lastPartialRef.current = '';

      setHasStartedOnce(true);
      setIsListening(true);
      setTranscribedText('');
      setPartialText('');
      setMetrics(null);
      speakerDetectionService.reset();

      await sttService.startListening(
        text => {
          // Final result received
          if (firstResultRef.current === null) {
            firstResultRef.current = Date.now();
          }
          totalResultsRef.current += 1;

          // If there was a pending partial, count it as resolved
          if (lastPartialRef.current.trim()) {
            resolvedPartialsRef.current += 1;
          }
          lastPartialRef.current = '';

          setTranscribedText(prev => (prev ? `${prev} ${text}` : text));
          setPartialText('');
        },
        text => {
          // Partial result received
          if (text && text !== lastPartialRef.current) {
            totalPartialsRef.current += 1;
            lastPartialRef.current = text;
          }
          setPartialText(text);
        },
        pitch => {
          speakerDetectionService.receivePitch(pitch);
        },
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to start listening.');
      setIsListening(false);
    }
  };

  const handleStopListening = async () => {
    try {
      await sttService.stopListening();
    } catch {}
    setIsListening(false);
    setPartialText('');
  };

  const handleCalculateMetrics = () => {
    if (!transcribedText.trim()) {
      Alert.alert('No Transcript', 'Record something first.');
      return;
    }
    const result = computeMetrics({
      transcribedText,
      sessionStartMs: sessionStartRef.current,
      sessionEndMs: Date.now(),
      firstResultMs: firstResultRef.current,
      totalPartials: totalPartialsRef.current,
      resolvedPartials: resolvedPartialsRef.current,
      totalResults: totalResultsRef.current,
    });
    setMetrics(result);
  };

  const handleClear = () => {
    setTranscribedText('');
    setPartialText('');
    setMetrics(null);
  };

  const handleReset = () => {
    setHasStartedOnce(false);
    setIsListening(false);
    setTranscribedText('');
    setPartialText('');
    setMetrics(null);
  };

  // ── IDLE SCREEN ─────────────────────────────────────────────────────────────
  if (!hasStartedOnce) {
    return (
      <View style={[styles.container, isDarkMode && styles.containerDark]}>
        <View style={styles.idleContainer}>
          <Icon name="analytics-outline" size={56} color="#007AFF" />
          <Text style={[styles.idleTitle, isDarkMode && styles.textDark]}>
            Speech Metrics
          </Text>
          <Text style={[styles.idleSub, isDarkMode && styles.subtextDark]}>
            Tap the mic to start recording.{'\n'}Metrics are computed from your
            session — no reference text needed.
          </Text>
          <TouchableOpacity
            onPress={handleStartListening}
            disabled={isInitializing}
            style={styles.micButton}>
            <Icon name="mic" size={64} color="#34C759" />
          </TouchableOpacity>
          <Text style={[styles.idleText, isDarkMode && styles.textDark]}>
            {isInitializing ? 'Initializing...' : 'Tap mic to start recording'}
          </Text>
        </View>
      </View>
    );
  }

  // ── ACTIVE SCREEN ───────────────────────────────────────────────────────────
  return (
    <View
      style={[styles.container, isDarkMode && styles.containerDark]}
      onLayout={e => {
        containerHeight.current = e.nativeEvent.layout.height;
      }}>
      {isListening && <KeepAwake />}

      <View style={styles.activeContainer}>
        {/* TOP PANEL — partial / listening */}
        <View style={{flex: topPanelFlex}}>
          <ScrollView
            style={[
              styles.textContainer,
              isDarkMode && styles.textContainerDark,
            ]}
            contentContainerStyle={styles.textContent}>
            <Text
              style={[
                styles.partialText,
                isDarkMode && styles.partialTextDark,
                {fontSize: settings.textSize - 2},
              ]}>
              {partialText || (isListening ? 'Listening...' : '...')}
            </Text>
          </ScrollView>
        </View>

        {/* DIVIDER */}
        <View {...panResponder.panHandlers} style={styles.divider}>
          <View style={{width: 100}} />
          <View
            style={{
              backgroundColor: isDarkMode ? '#756f6f' : '#ccc1c1',
              borderRadius: 5,
            }}>
            <Icon
              name="reorder-three-outline"
              size={34}
              color={isDarkMode ? '#aaa' : '#555'}
            />
          </View>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              isListening ? styles.stopButton : styles.startButton,
              isInitializing && styles.buttonDisabled,
            ]}
            onPress={isListening ? handleStopListening : handleStartListening}
            disabled={isInitializing}>
            <Icon
              name={isListening ? 'stop-circle-outline' : 'mic-outline'}
              size={22}
              color="#fff"
            />
            <Text style={styles.toggleButtonText}>
              {isInitializing
                ? 'Initializing...'
                : isListening
                ? 'Stop'
                : 'Start'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* BOTTOM PANEL — transcribed text */}
        <View style={{flex: bottomPanelFlex}}>
          <ScrollView
            style={[
              styles.textContainer,
              isDarkMode && styles.textContainerDark,
            ]}
            contentContainerStyle={styles.textContent}>
            <Text
              style={[
                styles.transcribedText,
                isDarkMode && styles.textDark,
                {fontSize: settings.textSize},
              ]}>
              {transcribedText || (
                <Text style={styles.placeholderText}>
                  Transcription appears here...
                </Text>
              )}
            </Text>
          </ScrollView>
        </View>

        {/* ACTION BUTTONS — only when stopped */}
        {!isListening && (
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={[styles.actionButton, {borderColor: '#007AFF'}]}
              onPress={handleCalculateMetrics}>
              <View style={styles.buttonContent}>
                <Icon name="stats-chart-outline" size={20} color="#007AFF" />
                <Text style={[styles.actionButtonText, {color: '#007AFF'}]}>
                  Analyze
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, {borderColor: '#FF3B30'}]}
              onPress={handleClear}>
              <View style={styles.buttonContent}>
                <Icon name="trash-outline" size={20} color="#FF3B30" />
                <Text style={[styles.actionButtonText, {color: '#FF3B30'}]}>
                  Clear
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, {borderColor: '#999'}]}
              onPress={handleReset}>
              <View style={styles.buttonContent}>
                <Icon name="refresh-outline" size={20} color="#999" />
                <Text style={[styles.actionButtonText, {color: '#999'}]}>
                  Reset
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* METRICS RESULTS CARD */}
        {metrics && (
          <ScrollView
            style={[styles.metricsCard, isDarkMode && styles.metricsCardDark]}
            nestedScrollEnabled>
            {/* Header */}
            <View style={styles.metricsHeader}>
              <Text
                style={[styles.metricsTitle, isDarkMode && styles.textDark]}>
                Session Report
              </Text>
              <Text
                style={[
                  styles.metricsMeta,
                  isDarkMode && styles.subtextDark,
                ]}>
                {metrics.totalWords} words ·{' '}
                {metrics.sessionDurationSec.toFixed(1)}s
              </Text>
            </View>

            {/* ── Row 1: Estimated Accuracy + Signal Quality ── */}
            <View style={styles.metricRow}>
              <MetricTile
                isDark={isDarkMode}
                icon="checkmark-circle-outline"
                label="Est. Accuracy"
                value={`${metrics.estimatedAccuracy.toFixed(1)}%`}
                sub="word pattern analysis"
                color={scoreColor(metrics.estimatedAccuracy)}
                progress={metrics.estimatedAccuracy / 100}
              />
              <MetricTile
                isDark={isDarkMode}
                icon="cellular-outline"
                label="Signal Quality"
                value={`${metrics.signalQuality.toFixed(1)}%`}
                sub="audio clarity estimate"
                color={scoreColor(metrics.signalQuality)}
                progress={metrics.signalQuality / 100}
              />
            </View>

            {/* ── Row 2: WPM + Vocal Clarity ── */}
            <View style={styles.metricRow}>
              <MetricTile
                isDark={isDarkMode}
                icon="speedometer-outline"
                label="Words / Min"
                value={metrics.wpm.toFixed(0)}
                sub={wpmLabel(metrics.wpm)}
                color={scoreColor(
                  Math.min(100, Math.max(0, 100 - Math.abs(metrics.wpm - 130))),
                )}
                progress={Math.min(metrics.wpm / 200, 1)}
              />
              <MetricTile
                isDark={isDarkMode}
                icon="mic-circle-outline"
                label="Vocal Clarity"
                value={`${metrics.vocalClarityIndex.toFixed(1)}%`}
                sub={`${metrics.resolvedPartials}/${metrics.totalPartials} partials resolved`}
                color={scoreColor(metrics.vocalClarityIndex)}
                progress={metrics.vocalClarityIndex / 100}
              />
            </View>

            {/* ── Row 3: RTF + Processing Latency ── */}
            <View style={styles.metricRow}>
              <MetricTile
                isDark={isDarkMode}
                icon="timer-outline"
                label="Real-Time Factor"
                value={metrics.rtf.toFixed(2) + 'x'}
                sub={metrics.rtf <= 1 ? 'faster than real-time' : 'slower than real-time'}
                color={rtfColor(metrics.rtf)}
                progress={Math.min(metrics.rtf / 3, 1)}
                progressInverted
              />
              <MetricTile
                isDark={isDarkMode}
                icon="flash-outline"
                label="1st Result Latency"
                value={
                  metrics.processingLatencyMs > 0
                    ? `${metrics.processingLatencyMs}ms`
                    : 'N/A'
                }
                sub="time to first result"
                color={latencyColor(metrics.processingLatencyMs)}
                progress={Math.min(metrics.processingLatencyMs / 2000, 1)}
                progressInverted
              />
            </View>

            {/* ── Row 4: Reliability + Throughput ── */}
            <View style={styles.metricRow}>
              <MetricTile
                isDark={isDarkMode}
                icon="shield-checkmark-outline"
                label="Word Reliability"
                value={`${metrics.wordReliabilityScore.toFixed(1)}%`}
                sub="words ≥3 chars (less noise)"
                color={scoreColor(metrics.wordReliabilityScore)}
                progress={metrics.wordReliabilityScore / 100}
              />
              <MetricTile
                isDark={isDarkMode}
                icon="rocket-outline"
                label="Throughput"
                value={`${metrics.throughputWps.toFixed(2)} w/s`}
                sub="words per second"
                color={
                  metrics.throughputWps >= 1 ? '#34C759' : metrics.throughputWps >= 0.5 ? '#FF9500' : '#FF3B30'
                }
                progress={Math.min(metrics.throughputWps / 4, 1)}
              />
            </View>

            {/* Legend note */}
            <Text style={[styles.legendNote, isDarkMode && styles.subtextDark]}>
              * Metrics estimated from session data — no reference text required
            </Text>
          </ScrollView>
        )}
      </View>
    </View>
  );
};

// ─── MetricTile sub-component ───────────────────────────────────────────────

interface MetricTileProps {
  isDark: boolean;
  icon: string;
  label: string;
  value: string;
  sub: string;
  color: string;
  progress: number;
  progressInverted?: boolean;
}

const MetricTile: React.FC<MetricTileProps> = ({
  isDark,
  icon,
  label,
  value,
  sub,
  color,
  progress,
  progressInverted = false,
}) => {
  const barColor = progressInverted
    ? progress > 0.67
      ? '#FF3B30'
      : progress > 0.33
      ? '#FF9500'
      : '#34C759'
    : color;

  return (
    <View style={[styles.metricTile, isDark && styles.metricTileDark]}>
      <View style={styles.metricTileHeader}>
        <Icon name={icon} size={18} color={color} />
        <Text style={[styles.metricTileLabel, isDark && styles.subtextDark]}>
          {label}
        </Text>
      </View>
      <Text style={[styles.metricTileValue, {color}]}>{value}</Text>
      <View style={[styles.progressBg, {backgroundColor: isDark ? '#444' : '#eee'}]}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${Math.min(Math.max(progress, 0), 1) * 100}%` as any,
              backgroundColor: barColor,
            },
          ]}
        />
      </View>
      <Text style={[styles.metricTileSub, isDark && styles.subtextDark]}>
        {sub}
      </Text>
    </View>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {flex: 1, padding: 20, backgroundColor: '#f5f5f5'},
  containerDark: {backgroundColor: '#1a1a1a'},
  textDark: {color: '#fff'},
  subtextDark: {color: '#888'},

  // Idle
  idleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 24,
  },
  idleTitle: {fontSize: 22, fontWeight: '800', color: '#333'},
  idleSub: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 21,
  },
  micButton: {
    padding: 24,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: '#34C759',
    marginTop: 8,
  },
  idleText: {fontSize: 16, color: '#333', fontWeight: '500'},

  // Active
  activeContainer: {flex: 1, paddingTop: 8},
  textContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  textContainerDark: {backgroundColor: '#2a2a2a', borderColor: '#444'},
  textContent: {padding: 16},
  partialText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 8,
  },
  partialTextDark: {color: '#827e7e'},
  transcribedText: {fontSize: 16, lineHeight: 24, color: '#333'},
  placeholderText: {color: '#bbb', fontStyle: 'italic'},

  divider: {
    alignItems: 'center',
    justifyContent: 'space-between',
    flexDirection: 'row',
    marginVertical: 8,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  toggleButtonText: {color: '#fff', fontWeight: '600', fontSize: 15},
  startButton: {backgroundColor: '#34C759'},
  stopButton: {backgroundColor: '#FF3B30'},
  buttonDisabled: {opacity: 0.5, backgroundColor: '#999'},

  actionButtonsRow: {flexDirection: 'row', paddingTop: 8, gap: 8},
  actionButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  actionButtonText: {fontSize: 13, fontWeight: '600'},

  // Metrics card
  metricsCard: {
    marginTop: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 14,
    maxHeight: 380,
  },
  metricsCardDark: {backgroundColor: '#2a2a2a', borderColor: '#444'},
  metricsHeader: {
    marginBottom: 12,
  },
  metricsTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#333',
    marginBottom: 2,
  },
  metricsMeta: {fontSize: 12, color: '#999'},

  metricRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  metricTile: {
    flex: 1,
    backgroundColor: '#f7f7f7',
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  metricTileDark: {backgroundColor: '#1a1a1a'},
  metricTileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  metricTileLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  metricTileValue: {fontSize: 22, fontWeight: '900', letterSpacing: -0.5},
  metricTileSub: {fontSize: 10, color: '#999', marginTop: 2},

  progressBg: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: {height: '100%', borderRadius: 3},

  legendNote: {
    fontSize: 10,
    color: '#bbb',
    textAlign: 'center',
    marginTop: 4,
    paddingBottom: 4,
    fontStyle: 'italic',
  },
});

export default WERMetricsScreen;