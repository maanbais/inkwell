import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { LucideAngularModule, Bookmark, Flag, Heart, Link, MessageCircle, MoreHorizontal, Plus, Send, BookOpen } from 'lucide-angular';
import type { FeedPost } from '../dashboard.models';
import { FeedStateService } from '../../../core/services/feed-state.service';
import { formatRelativeTime } from '../../../core/utils/time.utils';
import { AuthService } from '../../../core/services/auth.service';
import { PostService } from '../../../core/services/post.service';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  templateUrl: './home.component.html'
})
export class HomeComponent implements OnInit {
  readonly BookmarkIcon = Bookmark;
  readonly FlagIcon = Flag;
  readonly HeartIcon = Heart;
  readonly LinkIcon = Link;
  readonly MessageCircleIcon = MessageCircle;
  readonly MoreIcon = MoreHorizontal;
  readonly PlusIcon = Plus;
  readonly SendIcon = Send;
  readonly BookOpenIcon = BookOpen;

  openPostMenuId = signal<string | null>(null);

  private feedState = inject(FeedStateService);
  private authService = inject(AuthService);
  private postService = inject(PostService);
  private router = inject(Router);

  readonly feedPosts = this.feedState.feedPosts;
  readonly loading = this.feedState.loading;
  readonly errorMessage = this.feedState.error;
  readonly formatRelativeTime = formatRelativeTime;

  ngOnInit() {
    void this.feedState.loadPosts();
  }


  togglePostMenu(postId: string) {
    this.openPostMenuId.update(current => current === postId ? null : postId);
  }

  closePostMenu() {
    this.openPostMenuId.set(null);
  }

  savePost(post: FeedPost) {
    post.saved = true;
    this.closePostMenu();
  }

  copyPostLink(post: FeedPost) {
    navigator.clipboard?.writeText(`${window.location.origin}/dashboard?post=${post.id}`);
    this.closePostMenu();
  }

  sharePost(post: FeedPost) {
    const postUrl = `${window.location.origin}/dashboard/post/${post.id}`;
    if (navigator.share) {
      navigator.share({ title: post.title, text: post.subtitle, url: postUrl });
    } else {
      navigator.clipboard?.writeText(postUrl);
    }
    this.closePostMenu();
  }

  async toggleLike(post: FeedPost) {
    const user = this.authService.currentUser();
    if (!user) return;
    
    // Optimistic update
    const wasLiked = post.hasLiked;
    const currentLikes = parseInt(post.likes, 10) || 0;
    
    post.hasLiked = !wasLiked;
    post.likes = (wasLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1).toString();
    
    // trigger change detection
    this.feedState.feedPosts.update(posts => [...posts]);

    const { error } = await this.postService.toggleLike(post.id, user.id);
    
    // Rollback on error
    if (error) {
       post.hasLiked = wasLiked;
       post.likes = currentLikes.toString();
       this.feedState.feedPosts.update(posts => [...posts]);
    }
  }

  commentOnPost(post: FeedPost) {
    this.router.navigate(['/dashboard/post', post.id]);
  }

  reportPost(post: FeedPost) {
    console.log('Report post', post.id);
    this.closePostMenu();
  }
}
