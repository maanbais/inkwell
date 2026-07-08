# Inkwell - Project Walkthrough Guide ✒️

This guide explains the architecture, file organization, routing, state management, and database connections of **Inkwell** in simple, easy-to-understand language. It is designed to help you confidently present and explain your college project!

---

## 1. Project Overview
**Inkwell** is a modern, typography-focused blogging platform.
*   **Frontend**: Built with **Angular** (version 18+), a TypeScript-based framework developed by Google.
*   **Backend & Database**: Powered by **Supabase** (an open-source Firebase alternative), which provides a PostgreSQL database, user authentication (auth), and instant APIs.
*   **Hosting**: Deployed on **Vercel** with automatic build pipelines.

---

## 2. Directory Structure Walkthrough
Here is how the project files are organized:

```text
inkwell/
├── public/                 # Static assets (images, icons, etc.)
│   ├── download.png        # Transparent brand logo
│   ├── favicon.ico         # Website tab icon (multi-size)
│   └── favicon.png         # Website tab icon (PNG fallback)
├── src/                    # Source code of the application
│   ├── app/                # Main application folder
│   │   ├── core/           # Core features (services, guards, state)
│   │   │   ├── guards/     # Route protection (Auth checks)
│   │   │   └── services/   # Supabase, Auth, and Blog feed logic
│   │   ├── pages/          # Individual screen components
│   │   │   ├── landing-page/
│   │   │   ├── login/
│   │   │   ├── signup/
│   │   │   └── dashboard/  # Logged-in area (Home feed, create blog, etc.)
│   │   ├── app.routes.ts   # Defines URLs and navigation rules
│   │   └── app.ts          # Main entry component for Angular
│   ├── environments/       # Environment config (Supabase URLs/Keys)
│   ├── index.html          # Main HTML template wrapper
│   └── main.ts             # Bootstraps (starts) the Angular application
├── .npmrc                  # Handles dependency/peer resolution
├── package.json            # Lists dependencies and build scripts
├── set-env.js              # Generates environment files on Vercel
└── vercel.json             # Vercel deployment configuration
```

### Key Configuration Files:
*   **`package.json`**: The project manifest. It defines scripts like `build` (to build the app) and lists installed packages (like `@supabase/supabase-js` for database connection).
*   **`set-env.js`**: A script that reads system environment variables (like `SUPABASE_URL` and `SUPABASE_ANON_KEY`) and writes them into `src/environments/environment.ts` before the build starts.
*   **`.npmrc`**: Configures `legacy-peer-deps=true` so npm installs packages smoothly even if there are peer-dependency warning conflicts (e.g. `lucide-angular` needing an older Angular version).
*   **`vercel.json`**: Ensures that Vercel routes all website page requests (like `/login`, `/dashboard`) back to `index.html` so Angular's frontend router can handle them instead of throwing a 404 page error.

---

## 3. How Routing Works (Page Navigation)
Routing maps a URL (like `/login`) to a specific screen component. This is configured in `src/app/app.routes.ts`.

### The Route Map (`app.routes.ts`)
```typescript
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
```

### Nested (Child) Routes:
Inside the `/dashboard`, we have nested pages like `/dashboard/home` and `/dashboard/create`. The `DashboardComponent` acts as a shell with a sidebar, and a `<router-outlet>` tag acts as a placeholder where child components are rendered.

### Route Protection (Guards):
We protect routes using **Guards** (`canActivate` rules):
1.  **`authGuard`**: Protects the `/dashboard`. If the user is *not* logged in, it redirects them to `/login`.
2.  **`guestGuard`**: Protects `/login` and `/signup`. If a user is *already* logged in, there is no need to show the login page, so they are redirected to `/dashboard`.

---

## 4. How State is Managed (Angular Signals)
State management refers to how data is stored, shared, and updated across different parts of the application. Inkwell uses **Angular Signals** (introduced in modern Angular), which are reactive data stores.

Think of a Signal as a value container. When the value inside the container changes, any screen component displaying that value automatically updates instantly without requiring a page refresh.

### The Auth State (`auth.service.ts`)
```typescript
currentUser = signal<User | null>(null);
currentSession = signal<Session | null>(null);
isLoggedIn = computed(() => !!this.currentUser());
```
*   `currentUser`: Holds the logged-in user details.
*   `isLoggedIn`: A `computed` signal. It automatically changes to `true` or `false` based on whether `currentUser` is empty or not.

### The Feed State (`feed-state.service.ts`)
Tracks the posts shown on the dashboard:
```typescript
readonly feedPosts = signal<FeedPost[]>([]);
readonly loading = signal(false);
readonly error = signal<string | null>(null);
```
When `loadPosts()` is called:
1. It sets `loading` to `true` (triggering a skeleton/loading animation on the screen).
2. It fetches blogs from the database.
3. It updates `feedPosts` with the new blogs and sets `loading` to `false`. The screen instantly redraws to show the new posts!

---

## 5. How the Database (Supabase) is Connected
All database interactions are managed via the `SupabaseService` and specific feature services.

### 1. Initializing the Connection (`supabase.service.ts`)
The `SupabaseService` connects to your cloud database using the URL and Anon Key:
```typescript
this.supabase = createClient(
  environment.supabaseUrl,
  environment.supabaseAnonKey
);
```

### 2. Fetching Data (`post.service.ts`)
To get posts from the Postgres database, `PostService` uses Supabase's simple syntax:
```typescript
async getPosts(limit = 50) {
  return this.supabaseService.client
    .from('posts')
    .select(`
      id,
      title,
      subtitle,
      content,
      cover_image,
      created_at,
      author:profiles(full_name, username, avatar_url),
      likes(count),
      comments(count)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);
}
```
*   `.from('posts')`: Looks at the `posts` table in PostgreSQL.
*   `.select(...)`: Joins table data to fetch post details, the author's profile name, and counts of likes/comments.
*   `.order(...)`: Sorts the blogs so the newest ones appear first.

### 3. User Authentication (`auth.service.ts`)
When a user signs up or logs in:
```typescript
// SignUp
await this.supabaseService.client.auth.signUp({ email, password, options: { data: { full_name: fullName } } });

// SignIn
await this.supabaseService.client.auth.signInWithPassword({ email, password });
```
Supabase handles password hashing, session tokens, and security behind the scenes!

---

## Summary for Your Presentation:
> "Inkwell is a single-page application (SPA) built on Angular's standalone component architecture. It connects to a Supabase Postgres backend using the official Supabase JS SDK. Pages and subpages are managed by the Angular Router, which is protected by guards to verify sessions. UI state updates are fully reactive, using Angular Signals to drive instant component updates when database values change."
