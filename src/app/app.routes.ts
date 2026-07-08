import { Routes } from '@angular/router';
import { LandingPageComponent } from './pages/landing-page/landing-page.component';
import { LoginComponent } from './pages/login/login.component';
import { SignupComponent } from './pages/signup/signup.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { HomeComponent } from './pages/dashboard/home/home.component';
import { CreateComponent } from './pages/dashboard/create/create.component';
import { MyBlogsComponent } from './pages/dashboard/myblogs/myblogs.component';
import { PostDetail } from './pages/dashboard/post-detail/post-detail';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', component: LandingPageComponent },
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'signup', component: SignupComponent, canActivate: [guestGuard] },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { path: 'home', component: HomeComponent },
      { path: 'create', component: CreateComponent },
      { path: 'myblogs', component: MyBlogsComponent },
      { path: 'post/:id', component: PostDetail }
    ]
  },
  { path: '**', redirectTo: '' }
];
