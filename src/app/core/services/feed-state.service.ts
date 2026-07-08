import { Injectable, inject, signal } from '@angular/core';
import { PostService } from './post.service';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';
import type { FeedPost } from '../../pages/dashboard/dashboard.models';

@Injectable({ providedIn: 'root' })
export class FeedStateService {
  private postService = inject(PostService);
  private authService = inject(AuthService);
  private supabaseService = inject(SupabaseService);

  readonly feedPosts = signal<FeedPost[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  async loadPosts(limit = 50) {
    this.loading.set(true);
    this.feedPosts.set([]); // Clear stale data so old timestamps don't flash
    this.error.set(null);

    const { data, error } = await this.postService.getPosts(limit);
    if (error) {
      console.error('FeedStateService loadPosts error', error);
      this.error.set('Failed to load feed. Please try again.');
      this.feedPosts.set([]);
    } else if (!data || (Array.isArray(data) && data.length === 0)) {
      this.feedPosts.set([]);
    } else {
      const user = this.authService.currentUser();
      let userLikedSet = new Set<string>();
      if (user) {
         const { data: likes } = await this.supabaseService.client.from('likes').select('post_id').eq('user_id', user.id);
         if (likes) {
           userLikedSet = new Set(likes.map((l: any) => l.post_id));
         }
      }

      this.feedPosts.set((data as any[]).map(row => this.mapPost(row, userLikedSet.has(row.id))));
    }

    this.loading.set(false);
  }

  prependPost(row: any) {
    const mapped = this.mapPost(row);
    this.feedPosts.update(posts => [mapped, ...posts]);
  }

  private mapPost(row: any, hasLiked = false): FeedPost {
    const author = row.author ?? {};
    const fullName = author.full_name || author.fullName || 'Unknown';
    const username = author.username || author.handle || '';
    const avatar = author.avatar_url || (fullName ? fullName.split(' ').map((s: string) => s[0]).slice(0, 2).join('').toUpperCase() : 'U');
    const createdAt = row.created_at || row.createdAt || null;
    const updatedAt = row.updated_at || row.updatedAt || null;

    // Mark as edited if updated_at is more than 60 seconds after created_at
    const isEdited = createdAt && updatedAt
      ? (new Date(updatedAt).getTime() - new Date(createdAt).getTime()) > 60_000
      : false;

    return {
      id: row.id,
      author: fullName,
      handle: username ? `@${username}` : '',
      avatar,
      title: row.title || '',
      subtitle: row.subtitle || '',
      // support multiple possible image fields returned by the API
      image: row.cover_image || row.image || row.imagePath || '',
      excerpt: row.excerpt || row.content?.slice(0, 180) || '',
      readTime: '',
      likes: (row.likes?.[0]?.count ?? row.likes?.count ?? 0).toString(),
      hasLiked,
      comments: row.comments?.[0]?.count ?? row.comments?.count ?? 0,
      saved: false,
      views: row.views || 0,
      created_at: createdAt,
      updated_at: updatedAt,
      is_edited: isEdited
    };
  }
}
