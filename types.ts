export interface AppLink {
  name: string;
  scheme: string; // e.g., 'instagram://'
  fallback: string; // e.g., 'https://instagram.com'
}

export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR'
}

export interface LogEntry {
  timestamp: number;
  message: string;
  type: 'info' | 'user' | 'aura' | 'action';
}

export interface SearchResult {
  title: string;
  uri: string;
}