export interface MetaTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

export interface MetaUserPage {
  id: string;
  name: string;
  access_token: string;
  category: string;
  tasks: string[];
}

export interface MetaInstagramAccount {
  id: string;
  username: string;
  name?: string;
  profile_picture_url?: string;
  account_type: string;
  media_count?: number;
  followers_count?: number;
  follows_count?: number;
}

export interface MetaMediaContainer {
  id: string;
  status?: string;
  status_code?: string;
}

export interface MetaPublishResult {
  id: string;
  permalink?: string;
}

export interface MetaConversation {
  id: string;
  participants: {
    data: Array<{ id: string; username: string }>;
  };
  updated_time: string;
}

export interface MetaMessage {
  id: string;
  message: string;
  from: { id: string; username: string };
  to: { data: Array<{ id: string; username: string }> };
  created_time: string;
}

export interface MetaError {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

export interface MetaWebhookEntry {
  id: string;
  time: number;
  messaging?: Array<{
    sender: { id: string };
    recipient: { id: string };
    timestamp: number;
    message?: {
      mid: string;
      text?: string;
      attachments?: Array<{
        type: string;
        payload: { url: string };
      }>;
    };
  }>;
  changes?: Array<{
    field: string;
    value: Record<string, unknown>;
  }>;
}

export interface MetaWebhookPayload {
  object: string;
  entry: MetaWebhookEntry[];
}
