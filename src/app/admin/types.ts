/** 后台管理页共享数据类型（与 API 返回结构对应） */

export interface NoteTag {
  id: string;
  name: string;
}

export interface NoteItem {
  id: string;
  title: string;
  summary: string;
  status: string; // draft | published
  published_at: string | null;
  created_at: string;
  updated_at: string;
  tags: NoteTag[];
}

export interface WorkItem {
  id: string;
  title: string;
  subtitle: string;
  cover_url: string | null;
  external_url: string | null;
  tags: string[];
  created_at: string;
}

export interface WorkDetail extends WorkItem {
  content: string;
}

export interface ContactItem {
  label: string;
  value: string;
  icon: string;
}

export interface ProfileData {
  nickname: string;
  headline: string;
  bio: string;
  avatar_url: string | null;
  skills: string[];
  contact: ContactItem[];
}

export interface MessageItem {
  id: string;
  name: string;
  content: string;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
}
