export type DashboardView = 'home' | 'create' | 'myblogs';

export interface FeedPost {
  id: string;
  author: string;
  handle: string;
  avatar: string;
  title: string;
  subtitle: string;
  image: string;
  excerpt: string;
  readTime: string;
  likes: string;
  hasLiked?: boolean;
  comments: number;
  saved: boolean;
  views: number;
  created_at?: string;
  updated_at?: string;
  is_edited?: boolean;
}

export interface MyBlog {
  id: string;
  title: string;
  status: 'Published' | 'Draft';
  updated: string;
  views: string;
  excerpt: string;
  content: string;
  image: string;
}
