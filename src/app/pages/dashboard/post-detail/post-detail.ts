import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PostService } from '../../../core/services/post.service';
import { AuthService } from '../../../core/services/auth.service';
import { formatRelativeTime } from '../../../core/utils/time.utils';
import { LucideAngularModule, ArrowLeft } from 'lucide-angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-post-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  templateUrl: './post-detail.html',
  styleUrl: './post-detail.css'
})
export class PostDetail implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private postService = inject(PostService);
  private auth = inject(AuthService);

  readonly ArrowLeftIcon = ArrowLeft;
  readonly formatRelativeTime = formatRelativeTime;

  post = signal<any>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit() {
    document.body.style.overflow = 'hidden';
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadPost(id);
    } else {
      this.error.set('No post ID provided.');
      this.loading.set(false);
    }
  }

  ngOnDestroy() {
    document.body.style.overflow = '';
  }

  async loadPost(id: string) {
    this.loading.set(true);
    const { data, error } = await this.postService.getPost(id);
    
    if (error) {
      console.error('[PostDetail] Load post failed', error);
      this.error.set('Failed to load this post. It might have been deleted.');
    } else {
      this.post.set(data);
      // Fire and forget view increment, only if not the author
      const currentUser = this.auth.currentUser();
      if (!currentUser || currentUser.id !== data.author_id) {
        this.postService.incrementViewCount(id).catch(e => console.error(e));
      }
    }
    this.loading.set(false);
  }
}
