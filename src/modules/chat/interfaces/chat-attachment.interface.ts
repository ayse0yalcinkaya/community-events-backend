export interface ChatAttachmentMetadata {
  fileId: string;
  name: string;
  mimeType: string;
  size?: number;
  url: string;
  provider: 's3';
  meta?:
    | {
        type?: string;
        durationMs?: number;
        codec?: string;
        waveform?: number[];
        bitrate?: number;
        category?: string | null;
      }
    | undefined;
}

export interface ChatMessageMetadata {
  clientMessageId?: string;
  forwarded?: boolean;
  quotedMessage?: {
    id: string;
    content: string | null;
    senderID: string;
    senderType: string;
  };
  voice?: {
    durationMs?: number;
    codec?: string;
    waveform?: number[];
    bitrate?: number;
  };
}
