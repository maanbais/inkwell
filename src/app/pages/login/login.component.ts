import { Component, inject, signal } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, Loader2 } from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink, FormsModule, LucideAngularModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  readonly MailIcon = Mail;
  readonly LockIcon = Lock;
  readonly EyeIcon = Eye;
  readonly EyeOffIcon = EyeOff;
  readonly ArrowRightIcon = ArrowRight;
  readonly ArrowLeftIcon = ArrowLeft;
  readonly Loader2Icon = Loader2;

  showPassword = signal(false);
  email = signal('');
  password = signal('');
  errorMessage = signal('');
  isSubmitting = signal(false);

  togglePassword() {
    this.showPassword.update(v => !v);
  }

  async onSubmit(event: Event) {
    event.preventDefault();
    this.errorMessage.set('');
    this.isSubmitting.set(true);

    try {
      const result = await this.authService.signIn(this.email(), this.password());

      if (!result.success) {
        this.errorMessage.set(result.error ?? 'Login failed. Please try again.');
      } else {
        this.router.navigate(['/dashboard']);
      }
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
