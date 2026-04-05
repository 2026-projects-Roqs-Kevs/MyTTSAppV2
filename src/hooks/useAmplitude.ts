import {useEffect, useRef, useState} from 'react';
import {NativeModules, NativeEventEmitter} from 'react-native';

const {Vosk} = NativeModules;
const voskEmitter = new NativeEventEmitter(Vosk);

const useAmplitude = (isActive: boolean) => {
  const [amplitude, setAmplitude] = useState(0);
  const listenerRef = useRef<any>(null);

  useEffect(() => {
    if (!isActive) {
      // Stop monitoring and clean up
      listenerRef.current?.remove();
      listenerRef.current = null;
      Vosk.stopAmplitudeMonitoring().catch(() => {});
      setAmplitude(0);
      return;
    }

    // Start monitoring
    Vosk.startAmplitudeMonitoring()
      .then(() => {
        console.log('>>> Amplitude monitoring started');
      })
      .catch((e: any) => {
        console.error('>>> Failed to start amplitude monitoring:', e);
      });

    // Listen to amplitude events
    let lastUpdate = 0;
    listenerRef.current = voskEmitter.addListener(
    'onAmplitude',
    (data: string) => {
        const now = Date.now();
        if (now - lastUpdate < 80) return; // throttle to ~12fps
        lastUpdate = now;
        const value = parseFloat(data);
        if (!isNaN(value)) {
        setAmplitude(value);
        }
    },
    );

    return () => {
      listenerRef.current?.remove();
      listenerRef.current = null;
      Vosk.stopAmplitudeMonitoring().catch(() => {});
    };
  }, [isActive]);

  return amplitude;
};

export default useAmplitude;