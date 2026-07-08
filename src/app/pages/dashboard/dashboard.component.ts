import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { LucideAngularModule, BookOpen, Home, LifeBuoy, LogOut, PenLine, Search, Settings, Users } from 'lucide-angular';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, LucideAngularModule],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent {
  private authService = inject(AuthService);

  readonly BookOpenIcon = BookOpen;
  readonly HomeIcon = Home;
  readonly LifeBuoyIcon = LifeBuoy;
  readonly LogOutIcon = LogOut;
  readonly PenLineIcon = PenLine;
  readonly SearchIcon = Search;
  readonly SettingsIcon = Settings;
  readonly UsersIcon = Users;

  userEmail = computed(() => this.authService.currentUser()?.email ?? '');
  userName = computed(() => {
    const user = this.authService.currentUser();
    return user?.user_metadata?.['full_name'] ??
      user?.user_metadata?.['name'] ??
      user?.email?.split('@')[0] ??
      'Writer';
  });
  userInitial = computed(() => this.userName().trim().charAt(0).toUpperCase() || 'W');

  async logout() {
    await this.authService.signOut();
  }
}
