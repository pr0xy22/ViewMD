export interface DocumentSnapshot {
  path: string;
  name: string;
  content: string;
  error: string | null;
  modifiedAtMs: number | null;
}
