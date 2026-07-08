import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule, BookOpen, Edit3, Plus, Search, Trash2 } from 'lucide-angular';
import { DashboardDataService } from '../dashboard-data.service';
import { formatRelativeTime } from '../../../core/utils/time.utils';
import type { MyBlog } from '../dashboard.models';

@Component({
  selector: 'app-dashboard-myblogs',
  standalone: true,
  imports: [LucideAngularModule, FormsModule, DatePipe],
  templateUrl: './myblogs.component.html'
})
export class MyBlogsComponent implements OnInit {
  private dashboardData = inject(DashboardDataService);

  ngOnInit() {
    this.dashboardData.loadMyBlogs();
  }
  private router = inject(Router);

  readonly BookOpenIcon = BookOpen;
  readonly EditIcon = Edit3;
  readonly PlusIcon = Plus;
  readonly SearchIcon = Search;
  readonly TrashIcon = Trash2;

  readonly myBlogs = this.dashboardData.myBlogs;
  readonly formatRelativeTime = formatRelativeTime;
  readonly totalBlogs = computed(() => this.myBlogs().length);
  readonly publishedBlogs = computed(() => this.myBlogs().filter(blog => blog.status === 'Published').length);
  readonly draftBlogs = computed(() => 0);

  readonly editModalOpen = signal(false);
  readonly editingBlog = signal<MyBlog | null>(null);
  readonly editTitle = signal('');
  readonly editExcerpt = signal('');
  readonly editContent = signal('');
  readonly deleteConfirmId = signal<string | null>(null);

  // Local form-bound values for reliable two-way binding in template
  editTitleValue = '';
  editExcerptValue = '';
  editContentValue = '';

  requestNewBlog() {
    this.dashboardData.clearDraft();
    this.router.navigate(['/dashboard/create']);
  }

  editBlog(blog: MyBlog) {
    this.editingBlog.set(blog);
    this.editTitle.set(blog.title);
    this.editExcerpt.set(blog.excerpt);
    this.editContent.set(blog.content || '');

    // also populate local form values for [(ngModel)] binding
    this.editTitleValue = blog.title;
    this.editExcerptValue = blog.excerpt;
    this.editContentValue = blog.content || '';
    this.editModalOpen.set(true);
  }

  saveEdit() {
    const blog = this.editingBlog();
    if (!blog) return;

    this.dashboardData.updateBlog({
      ...blog,
      title: (this.editTitleValue || this.editTitle()).trim(),
      excerpt: (this.editExcerptValue || this.editExcerpt()).trim(),
      content: (this.editContentValue || this.editContent()).trim(),
      updated: blog.updated
    });
    this.closeEditModal();
  }

  closeEditModal() {
    this.editModalOpen.set(false);
    this.editingBlog.set(null);
    this.editTitleValue = '';
    this.editExcerptValue = '';
    this.editContentValue = '';
  }

  deleteBlog(blogId: string) {
    this.deleteConfirmId.set(blogId);
  }

  confirmDelete() {
    const id = this.deleteConfirmId();
    if (id) this.dashboardData.deleteBlog(id);
    this.deleteConfirmId.set(null);
  }

  cancelDelete() {
    this.deleteConfirmId.set(null);
  }
}
