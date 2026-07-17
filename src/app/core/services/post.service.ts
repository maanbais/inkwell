import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import type { PostgrestError } from '@supabase/supabase-js';

export interface CreatePostInput {
  title: string;
  slug: string;
  subtitle?: string;
  excerpt?: string;
  content?: string;
  imagePath?: string; // public url or storage path
  author_id: string;
}

@Injectable({ providedIn: 'root' })
export class PostService {
  private supabase = inject(SupabaseService).client;

  // Upload cover image to the supplied Supabase bucket. Returns public URL on success.
  async uploadCover(file: File, bucket = 'covers'): Promise<{ publicUrl?: string; error?: any }> {
    try {
      const filePath = `${Date.now()}-${file.name}`;
      const { error: uploadErr } = await this.supabase.storage
        .from(bucket)
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadErr) {
        const message = uploadErr.message || 'Cover upload failed.';
        const trimmed = message.toLowerCase();
        const isBucketError = trimmed.includes('bucket not found');
        const isRlsError = trimmed.includes('row-level security');

        return {
          error: {
            message: isBucketError
              ? `Storage bucket '${bucket}' was not found. Please create a public Supabase bucket named '${bucket}', or update the upload bucket name in PostService.`
              : isRlsError
              ? `Supabase storage upload blocked by row-level security. Ensure the '${bucket}' bucket allows authenticated uploads or adjust your Supabase storage policies.`
              : message,
            status: uploadErr.status,
            bucket
          }
        };
      }

      const { data } = this.supabase.storage.from(bucket).getPublicUrl(filePath);
      return { publicUrl: data.publicUrl };
    } catch (err: any) {
      return {
        error: {
          message: err?.message || 'Cover upload failed due to an unexpected error.',
          bucket
        }
      };
    }
  }

  // Create a post row in 'blogs'
  async createPost(input: CreatePostInput) {
    // IMPORTANT: Supabase JS v2 derives a `columns` query parameter from the
    // object keys.  Any key whose value is `undefined` is silently dropped,
    // which means the corresponding column never reaches Postgres.  If that
    // column has a NOT NULL constraint (e.g. `slug`) the INSERT will fail with
    // a 400.  We therefore coalesce every optional field to `null` explicitly.
    const payload = {
      title: input.title,
      slug: input.slug,
      subtitle: input.subtitle ?? null,
      excerpt: input.excerpt ?? null,
      content: input.content ?? null,
      cover_image: input.imagePath || (input as any).cover_image || null,
      author_id: input.author_id,
      status: 'published' as const,
      published_at: new Date().toISOString()
    };

    console.log('[PostService] Payload before insert:', JSON.stringify(payload, null, 2));

    const { data, error } = await this.supabase
      .from('blogs')
      .insert([payload])
      .select('*, author:profiles(id, full_name, username, avatar_url)')
      .single();

    if (error) {
      console.error('[PostService] Supabase insert error:', JSON.stringify(error, null, 2));
    } else {
      console.log('[PostService] Supabase insert result:', JSON.stringify(data, null, 2));
    }

    return { data, error };
  }

  // Fetch recent posts and include profile information, plus counts
  async getPosts(limit = 50) {
    const { data, error } = await this.supabase
      .from('blogs')
      .select(`
        *,
        author:profiles(id, full_name, username, avatar_url),
        likes(count),
        comments(count)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    return { data, error };
  }

  // Fetch a single post by ID
  async getPost(id: string) {
    const { data, error } = await this.supabase
      .from('blogs')
      .select(`
        *,
        author:profiles(id, full_name, username, avatar_url),
        likes(count),
        comments(count)
      `)
      .eq('id', id)
      .single();

    return { data, error };
  }

  // Fetch posts for a specific user
  async getUserPosts(userId: string) {
    const { data, error } = await this.supabase
      .from('blogs')
      .select('*')
      .eq('author_id', userId)
      .order('created_at', { ascending: false });

    return { data, error };
  }

  // Update an existing post
  async updatePost(id: string, updates: Partial<CreatePostInput>) {
    const payload: any = { ...updates };
    if (updates.imagePath) {
      payload.cover_image = updates.imagePath;
      delete payload.imagePath;
    }
    payload.updated_at = new Date().toISOString();

    const { data, error } = await this.supabase
      .from('blogs')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  }

  // Delete a post and its cover image from storage
  async deletePost(id: string) {
    // 1. Fetch the post to get the cover_image URL
    const { data: post } = await this.supabase
      .from('blogs')
      .select('cover_image')
      .eq('id', id)
      .single();

    // 2. Delete the DB row
    const { error } = await this.supabase
      .from('blogs')
      .delete()
      .eq('id', id);

    // 3. Delete the image from storage if it exists
    if (!error && post?.cover_image) {
      try {
        // Extract the storage path from the public URL
        // URL format: .../storage/v1/object/public/<bucket>/<path>
        const url = post.cover_image as string;
        const marker = '/object/public/';
        const markerIdx = url.indexOf(marker);
        if (markerIdx !== -1) {
          const afterMarker = url.slice(markerIdx + marker.length);
          const slashIdx = afterMarker.indexOf('/');
          if (slashIdx !== -1) {
            const bucket = afterMarker.slice(0, slashIdx);
            const filePath = afterMarker.slice(slashIdx + 1);
            await this.supabase.storage.from(bucket).remove([filePath]);
          }
        }
      } catch (e) {
        console.warn('[PostService] Storage image cleanup failed:', e);
      }
    }

    return { error };
  }

  /**
   * Increment view count via Postgres RPC.
   * Deduplication is handled entirely at the database level using a
   * composite primary key on the `post_views` table (user_id + post_id),
   * ensuring one view per user across all sessions, tabs, and devices.
   */
  async incrementViewCount(id: string) {
    const { error } = await this.supabase.rpc('increment_view_count', { blog_id: id });
    return { error };
  }


  // Likes & Comments
  async hasUserLiked(postId: string, userId: string) {
    const { data, error } = await this.supabase
      .from('likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle();
      
    return { liked: !!data, error };
  }

  async toggleLike(postId: string, userId: string) {
    const { liked } = await this.hasUserLiked(postId, userId);
    
    if (liked) {
      const { error } = await this.supabase
        .from('likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);
      return { liked: false, error };
    } else {
      const { error } = await this.supabase
        .from('likes')
        .insert({ post_id: postId, user_id: userId });
      return { liked: true, error };
    }
  }

  async getComments(postId: string) {
    const { data, error } = await this.supabase
      .from('comments')
      .select('*, author:profiles(id, full_name, username, avatar_url)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
      
    return { data, error };
  }

  async addComment(postId: string, userId: string, content: string) {
    const { data, error } = await this.supabase
      .from('comments')
      .insert({ post_id: postId, user_id: userId, content })
      .select('*, author:profiles(id, full_name, username, avatar_url)')
      .single();
      
    return { data, error };
  }
}
