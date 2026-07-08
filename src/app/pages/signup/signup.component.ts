import { Component, inject, signal } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Mail, Lock, Eye, EyeOff, User, ArrowRight, ArrowLeft, Loader2 } from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [RouterLink, FormsModule, LucideAngularModule],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css'
})
export class SignupComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  readonly MailIcon = Mail;
  readonly LockIcon = Lock;
  readonly EyeIcon = Eye;
  readonly EyeOffIcon = EyeOff;
  readonly UserIcon = User;
  readonly ArrowRightIcon = ArrowRight;
  readonly ArrowLeftIcon = ArrowLeft;
  readonly Loader2Icon = Loader2;

  showPassword = signal(false);
  name = signal('');
  email = signal('');
  password = signal('');
  errorMessage = signal('');
  successMessage = signal('');
  isSubmitting = signal(false);

  togglePassword() {
    this.showPassword.update(v => !v);
  }

  async onSubmit(event: Event) {
    event.preventDefault();
    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.password().length < 6) {
      this.errorMessage.set('Password must be at least 6 characters.');
      return;
    }

    this.isSubmitting.set(true);

    try {
      const result = await this.authService.signUp(
        this.email(),
        this.password(),
        this.name()
      );

      if (!result.success) {
        this.errorMessage.set(result.error ?? 'Signup failed. Please try again.');
        return;
      }

      if (result.needsEmailConfirmation) {
        this.successMessage.set('Account created. Please check your email to confirm your account before signing in.');
        this.password.set('');
        return;
      }

      this.router.navigate(['/dashboard']);
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
