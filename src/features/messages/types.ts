export interface Attachment {
  id: string;
  available: boolean;
}
export interface MessageView {
  id: string;
  sequence: number;
  body: string;
  sender: "you" | "client" | "worker";
  at: string;
  deleted: boolean;
  assets: Attachment[];
}
export interface MessagePage {
  messages: MessageView[];
  hasMore: boolean;
  next: number;
}
export interface ThreadView {
  tombstones: string[];
  removedCursor: number;
  id: string;
  jobId: string;
  title: string;
  town: string;
  client: boolean;
  canRead: boolean;
  canSend: boolean;
  blocked: boolean;
  ownBlocked: boolean;
  reported: boolean;
  closed: boolean;
  bookingId: string | null;
  page: MessagePage;
}
