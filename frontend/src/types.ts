export interface Campaign {
  id: number;
  name: string;
  description: string;
  created_at: string;
  summary?: string;
}

export interface Session {
  id: number;
  name: string;
  campaign_id: number;
  created_at: string;
  audio_file_paths: string;
  status: string;
  summary?: string;
  highlights?: string;
  low_points?: string;
  memorable_quotes?: string;
}

export interface Persona {
  id: number;
  name: string;
  role: string;
  description: string;
  voice_description?: string;
  campaign_id: number;
  session_id?: number;
  highlights?: string;
  low_points?: string;
  memorable_quotes?: string;
  summary?: string;
  player_name?: string;
  highlights_list?: Highlight[];
  quotes_list?: Quote[];
}

export interface Highlight {
  id: number;
  text: string;
  type: 'high' | 'low';
  session_id: number;
  persona_id?: number;
  campaign_id: number;
}

export interface Quote {
  id: number;
  text: string;
  speaker_name?: string;
  session_id: number;
  persona_id?: number;
  campaign_id: number;
}

export interface Moment {
  id: number;
  session_id: number;
  title: string;
  description: string;
  timestamp: string;
}
