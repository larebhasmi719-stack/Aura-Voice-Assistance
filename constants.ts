import { AppLink } from './types';

// Map of recognizable app names to their deep links
export const SUPPORTED_APPS: Record<string, AppLink> = {
  instagram: {
    name: 'Instagram',
    scheme: 'instagram://',
    fallback: 'https://www.instagram.com'
  },
  whatsapp: {
    name: 'WhatsApp',
    scheme: 'whatsapp://',
    fallback: 'https://web.whatsapp.com'
  },
  youtube: {
    name: 'YouTube',
    scheme: 'vnd.youtube://', // Android specific scheme often works better
    fallback: 'https://www.youtube.com'
  },
  spotify: {
    name: 'Spotify',
    scheme: 'spotify://',
    fallback: 'https://open.spotify.com'
  },
  twitter: {
    name: 'Twitter (X)',
    scheme: 'twitter://',
    fallback: 'https://twitter.com'
  },
  x: {
    name: 'Twitter (X)',
    scheme: 'twitter://',
    fallback: 'https://twitter.com'
  },
  maps: {
    name: 'Google Maps',
    scheme: 'geo:0,0?q=',
    fallback: 'https://maps.google.com'
  },
  camera: {
    name: 'Camera',
    scheme: 'camera:', // Generic intent, support varies
    fallback: ''
  }
};

export const MODEL_NAME = 'gemini-2.5-flash-native-audio-preview-09-2025';
