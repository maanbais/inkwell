import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Image, PenLine, Plus, Search, Send } from 'lucide-angular';
import { DashboardDataService } from '../dashboard-data.service';
import { PostService } from '../../../core/services/post.service';
import { FeedStateService } from '../../../core/services/feed-state.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-dashboard-create',
  standalone: true,
  imports: [FormsModule, LucideAngularModule],
  templateUrl: './create.component.html'
})
export class CreateComponent {
  private dashboardData = inject(DashboardDataService);
  private router = inject(Router);
  private feedState = inject(FeedStateService);

  readonly ImageIcon = Image;
  readonly PenLineIcon = PenLine;
  readonly PlusIcon = Plus;
  readonly SearchIcon = Search;
  readonly SendIcon = Send;

  readonly draftTitle = signal('');
  readonly draftSubtitle = signal('');
  readonly draftCategory = signal('');
  readonly draftBody = signal('');
  readonly coverImageData = signal<string | null>(null);
  readonly coverImageName = signal('');
  readonly uploadError = signal<string | null>(null);
  private coverFile: File | null = null;
  private postService = inject(PostService);
  private auth = inject(AuthService);

  constructor() {
    const draft = this.dashboardData.draftBlog();
    if (draft) {
      this.draftTitle.set(draft.title);
      this.draftSubtitle.set(draft.excerpt);
      this.draftCategory.set('Published post');
      this.draftBody.set('');
    }
  }

  onCoverSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.coverFile = file;
    this.coverImageName.set(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      this.coverImageData.set(typeof reader.result === 'string' ? reader.result : null);
    };
    reader.readAsDataURL(file);
  }

  postBlog() {
    const title = this.draftTitle().trim();
    if (!title) return;

    // If we have a cover file, upload it first
    const createFlow = async () => {
      let publicUrl: string | undefined;
      if (this.coverFile) {
        const res = await this.postService.uploadCover(this.coverFile);
        if (res.error) {
          console.error('Cover upload failed', res.error);
          this.uploadError.set(res.error.message || 'Cover upload failed.');
          return;
        } else {
          publicUrl = res.publicUrl;
        }
      }

      this.uploadError.set(null);
      const user = this.auth.currentUser();
      const authorId = user?.id;

      console.log('[CreateComponent] Current user:', user?.id, user?.email);

      if (!authorId) {
        console.warn('[CreateComponent] No authorId — falling back to local add');
        // fallback to local add
        this.dashboardData.addBlog(title, this.draftSubtitle().trim());
        this.clearDraft();
        // take user to home so they can see their new post in the feed
        this.router.navigate(['/dashboard/home']);
        return;
      }

      const slug = this.createSlug(title);
      console.log('[CreateComponent] Generated slug:', slug);

      const { data, error } = await this.postService.createPost({
        title,
        slug,
        subtitle: this.draftSubtitle().trim(),
        excerpt: this.draftSubtitle().trim(),
        content: this.draftBody().trim(),
        imagePath: publicUrl,
        author_id: authorId
      });

      if (error) {
        console.error('[CreateComponent] Create post failed:', error);
        this.uploadError.set(error.message || 'Failed to create post.');
        // fallback to local add
        this.dashboardData.addBlog(title, this.draftSubtitle().trim());
      } else if (data) {
        console.log('[CreateComponent] Post created successfully:', data);
        this.feedState.prependPost(data);
      }

      this.clearDraft();
      // show newly-created post in the main feed
      this.router.navigate(['/dashboard/home']);
    };

    void createFlow();
  }

  private clearDraft() {
    this.draftTitle.set('');
    this.draftSubtitle.set('');
    this.draftCategory.set('');
    this.draftBody.set('');
    this.coverImageData.set(null);
    this.coverImageName.set('');
    this.uploadError.set(null);
    this.dashboardData.clearDraft();
  }

  private createSlug(text: string) {
    const normalized = text
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    return normalized || `${Date.now()}`;
  }
}
