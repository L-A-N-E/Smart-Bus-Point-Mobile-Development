import * as Speech from 'expo-speech';

import { getLanguage } from '../i18n';

const LOCALE_BY_LANGUAGE: Record<string, string> = { pt: 'pt-BR', en: 'en-US', es: 'es-ES' };

export function speak(text: string) {
  Speech.stop();
  Speech.speak(text, { language: LOCALE_BY_LANGUAGE[getLanguage()] ?? 'pt-BR' });
}

export function stopSpeaking() {
  Speech.stop();
}

export function isSpeaking(): Promise<boolean> {
  return Speech.isSpeakingAsync();
}
