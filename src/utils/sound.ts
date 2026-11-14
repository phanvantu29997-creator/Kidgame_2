let audioCtx: AudioContext | null = null;

type VoicePhraseKey = 'congrats' | 'wrong';

const voiceUrlCache = new Map<VoicePhraseKey, string>();
const voiceLoadPromises = new Map<VoicePhraseKey, Promise<string | null>>();
let activeVoiceAudio: HTMLAudioElement | null = null;
let lastWrongSpokenAt = 0;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextClass) return null;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playTone(
  freq: number,
  startTimeOffset: number,
  duration: number,
  type: OscillatorType = 'sine',
  peakGain = 0.16,
) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime + startTimeOffset;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.exponentialRampToValueAtTime(peakGain, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + duration + 0.02);
}

async function fetchTeacherVoiceUrl(key: VoicePhraseKey): Promise<string | null> {
  const cached = voiceUrlCache.get(key);
  if (cached) return cached;

  const pending = voiceLoadPromises.get(key);
  if (pending) return pending;

  const promise = (async () => {
    try {
      const response = await fetch(`/api/tts?type=${key}`);
      if (!response.ok) return null;
      const blob = await response.blob();
      if (!blob || blob.size === 0) return null;
      const objectUrl = URL.createObjectURL(blob);
      voiceUrlCache.set(key, objectUrl);
      return objectUrl;
    } catch {
      return null;
    } finally {
      voiceLoadPromises.delete(key);
    }
  })();

  voiceLoadPromises.set(key, promise);
  return promise;
}

export function preloadTeacherVoices() {
  if (typeof window === 'undefined') return;
  void fetchTeacherVoiceUrl('congrats');
  void fetchTeacherVoiceUrl('wrong');
}

function speakWithBrowserFallback(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    utterance.pitch = 1.18;
    utterance.rate = 0.95;

    const voices = window.speechSynthesis.getVoices();
    const viFemale =
      voices.find(
        (v) =>
          v.lang.toLowerCase().startsWith('vi') &&
          /female|nữ|linh|mai|hoài|an|chi|google tiếng việt/i.test(v.name),
      ) || voices.find((v) => v.lang.toLowerCase().startsWith('vi'));

    if (viFemale) {
      utterance.voice = viFemale;
    }
    window.speechSynthesis.speak(utterance);
  } catch {
    // Ignore speech synthesis errors on restricted environments
  }
}

async function playTeacherVoice(key: VoicePhraseKey, fallbackText: string) {
  if (activeVoiceAudio) {
    activeVoiceAudio.pause();
    activeVoiceAudio.currentTime = 0;
    activeVoiceAudio = null;
  }

  const url = await fetchTeacherVoiceUrl(key);
  if (url) {
    try {
      const audio = new Audio(url);
      audio.volume = 1;
      activeVoiceAudio = audio;
      await audio.play();
      return;
    } catch {
      // Fallback to browser synthesis if playback is blocked or fails
    }
  }

  speakWithBrowserFallback(fallbackText);
}

export function playPickupSound(enabled: boolean) {
  if (!enabled) return;
  playTone(440, 0, 0.09, 'sine', 0.1);
}

export function playSnapSound(enabled: boolean) {
  if (!enabled) return;
  playTone(523.25, 0, 0.14, 'triangle', 0.16);
  playTone(659.25, 0.06, 0.18, 'triangle', 0.16);
}

export function playGentleMismatchSound(enabled: boolean) {
  if (!enabled) return;
  playTone(293.66, 0, 0.12, 'sine', 0.09);
  playTone(261.63, 0.08, 0.15, 'sine', 0.08);
}

export function playVictoryFanfare(enabled: boolean) {
  if (!enabled) return;
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((note, index) => {
    playTone(
      note,
      index * 0.11,
      index === notes.length - 1 ? 0.45 : 0.18,
      'triangle',
      0.18,
    );
  });
}

export function playCongratsVoice(enabled: boolean) {
  if (!enabled) return;
  playVictoryFanfare(true);
  window.setTimeout(() => {
    void playTeacherVoice('congrats', 'Chúc mừng bé!');
  }, 220);
}

export function playWrongPieceVoice(enabled: boolean) {
  if (!enabled) return;
  playGentleMismatchSound(true);
  const now = Date.now();
  if (now - lastWrongSpokenAt < 950) return;
  lastWrongSpokenAt = now;
  void playTeacherVoice('wrong', 'Chưa đúng rồi bé ơi!');
}
