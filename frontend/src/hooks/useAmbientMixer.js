import { useEffect, useRef } from 'react';

const soundProfiles = {
  Rain: ['bandpass', 1800, 0.8],
  Cafe: ['bandpass', 700, 0.45],
  'Lo-fi': ['lowpass', 340, 0.3],
  'White noise': ['highpass', 120, 0.55],
};

export default function useAmbientMixer() {
  const contextRef = useRef(null);
  const nodesRef = useRef({});
  const setVolume = (name, value) => {
    const level = Number(value);
    if (!contextRef.current && level > 0) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) contextRef.current = new AudioContext();
    }
    const context = contextRef.current;
    if (!context) return;
    if (context.state === 'suspended') context.resume();
    if (!nodesRef.current[name] && level > 0) {
      const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
      const source = context.createBufferSource();
      const filter = context.createBiquadFilter();
      const gain = context.createGain();
      const [type, frequency, q] = soundProfiles[name];
      source.buffer = buffer; source.loop = true; filter.type = type; filter.frequency.value = frequency; filter.Q.value = q; gain.gain.value = 0;
      source.connect(filter).connect(gain).connect(context.destination); source.start();
      nodesRef.current[name] = { source, gain };
    }
    const node = nodesRef.current[name];
    if (node) node.gain.gain.setTargetAtTime(level / 100, context.currentTime, 0.06);
  };
  useEffect(() => () => { Object.values(nodesRef.current).forEach(({ source }) => source.stop()); contextRef.current?.close(); }, []);
  return setVolume;
}
