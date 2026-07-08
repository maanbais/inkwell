import { Injectable, signal, inject } from '@angular/core';
import type { MyBlog } from './dashboard.models';
import { PostService } from '../../core/services/post.service';
import { AuthService } from '../../core/services/auth.service';
import { FeedStateService } from '../../core/services/feed-state.service';

@Injectable({
  providedIn: 'root'
})
export class DashboardDataService {
  private postService = inject(PostService);
  private auth = inject(AuthService);
  private feedState = inject(FeedStateService);

  myBlogs = signal<MyBlog[]>([]);
  loading = signal(false);
  draftBlog = signal<MyBlog | null>(null);

  constructor() {
    this.loadMyBlogs();
  }

  async loadMyBlogs() {
    const user = this.auth.currentUser();
    if (!user?.id) return;
    
    this.loading.set(true);
    const { data, error } = await this.postService.getUserPosts(user.id);
    
    if (!error && data) {
      const mappedBlogs: MyBlog[] = data.map((blog: any) => ({
        id: blog.id,
        title: blog.title,
        status: blog.status === 'published' ? 'Published' : 'Draft',
        updated: blog.updated_at || blog.created_at,
        views: blog.views?.toString() || '0',
        excerpt: blog.excerpt || blog.subtitle || '',
        content: blog.content || '',
        image: blog.cover_image || 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80'
      }));
      this.myBlogs.set(mappedBlogs);
    }
    this.loading.set(false);
  }

  // Fallback used during create if network fails
  addBlog(title: string, excerpt: string) {
    const nextBlog: MyBlog = {
      id: Date.now().toString(),
      title,
      status: 'Published',
      updated: new Date().toISOString(),
      views: '0',
      excerpt: excerpt || 'No subtitle added yet.',
      content: '',
      image: `https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80`
    };

    this.myBlogs.update(blogs => [nextBlog, ...blogs]);
    this.draftBlog.set(null);
  }

  async updateBlog(updated: MyBlog) {
    const now = new Date().toISOString();
    const patchedBlog = { ...updated, updated: now };

    // 1. Optimistic update — My Blogs UI
    this.myBlogs.update(blogs => blogs.map(blog => blog.id === updated.id ? patchedBlog : blog));
    this.draftBlog.set(null);

    // 2. Patch the home feed signal instantly for current user
    this.feedState.feedPosts.update(posts =>
      posts.map(p => p.id === updated.id
        ? { ...p, title: updated.title, excerpt: updated.excerpt, is_edited: true, updated_at: now }
        : p
      )
    );

    // 3. Persist to DB
    await this.postService.updatePost(updated.id, {
      title: updated.title,
      excerpt: updated.excerpt,
      content: updated.content
    });
  }

  async deleteBlog(blogId: string) {
    // 1. Optimistic update — My Blogs UI
    this.myBlogs.update(blogs => blogs.filter(blog => blog.id !== blogId));

    // 2. Remove from home feed signal instantly
    this.feedState.feedPosts.update(posts => posts.filter(p => p.id !== blogId));

    // 3. Persist to DB
    await this.postService.deletePost(blogId);
  }

  startEdit(blog: MyBlog) {
    this.draftBlog.set(blog);
  }

  clearDraft() {
    this.draftBlog.set(null);
  }
}
