import { Component, AfterViewInit, Inject, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { 
  LucideAngularModule, 
  Menu, X, BookOpen, PenTool, Users, Search, 
  MessageCircle, Heart, Bookmark, LayoutDashboard, 
  Settings, UserCircle, ArrowRight, ChevronRight,
  Clock
} from 'lucide-angular';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

interface BlogPost {
  id: number;
  title: string;
  excerpt: string;
  category: string;
  author: {
    name: string;
    avatar: string;
  };
  readingTime: string;
  coverImage: string;
}

interface Feature {
  title: string;
  description: string;
  icon: any;
}

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.css'
})
export class LandingPageComponent implements AfterViewInit {
  isMenuOpen = signal(false);
  private platformId = inject(PLATFORM_ID);

  readonly PenTool = PenTool;
  readonly ArrowRightIcon = ArrowRight;
  readonly Search = Search;
  readonly ClockIcon = Clock;
  readonly MenuIcon = Menu;
  readonly XIcon = X;
  readonly Bookmark = Bookmark;

  readonly categories = [
    'Technology', 'Design', 'Culture', 'Programming', 'Science', 'Self Improvement', 'Productivity', 'Writing'
  ];

  readonly featuredBlogs: BlogPost[] = [
    {
      id: 1,
      title: 'The Future of Web Development: What to Expect in 2026',
      excerpt: 'Explore the newest features, including signal-based reactivity and improved hydration architectures.',
      category: 'Programming',
      author: {
        name: 'Alex Johnson',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=150&auto=format&fit=crop'
      },
      readingTime: '5 min read',
      coverImage: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=800&auto=format&fit=crop'
    },
    {
      id: 2,
      title: 'Building Scalable User Interfaces',
      excerpt: 'Learn how to create beautiful, accessible, and highly customizable user interfaces effortlessly without technical debt.',
      category: 'Design',
      author: {
        name: 'Sarah Williams',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=150&auto=format&fit=crop'
      },
      readingTime: '7 min read',
      coverImage: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=800&auto=format&fit=crop'
    },
    {
      id: 3,
      title: 'Mastering Minimalist Typography',
      excerpt: 'Bring your websites to life with fluid typography, grid systems, and proper visual hierarchy.',
      category: 'Design',
      author: {
        name: 'David Chen',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop'
      },
      readingTime: '6 min read',
      coverImage: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=800&auto=format&fit=crop'
    }
  ];

  readonly whyChooseFeatures: Feature[] = [
    {
      title: 'Distraction-free Editor',
      description: 'Focus on your content with our intuitive editor.',
      icon: PenTool
    },
    {
      title: 'High-quality Network',
      description: 'Connect with a curated community of professional readers.',
      icon: Users
    },
    {
      title: 'Seamless Discovery',
      description: 'Your articles reach the right audience instantly.',
      icon: Search
    }
  ];

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      gsap.registerPlugin(ScrollTrigger);
    }
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => {
        this.initAnimations();
      }, 100);
    }
  }

  toggleMenu() {
    this.isMenuOpen.update(v => !v);
  }

  private initAnimations() {
    // Navbar scroll effect
    ScrollTrigger.create({
      start: 'top -50',
      end: 99999,
      toggleClass: {className: 'scrolled-nav', targets: '.navbar'}
    });

    // Hero Section
    gsap.fromTo('.hero-text', 
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, stagger: 0.15, ease: 'power3.out' }
    );

    gsap.fromTo('.hero-visual',
      { opacity: 0, scale: 0.95 },
      { opacity: 1, scale: 1, duration: 1, delay: 0.3, ease: 'power3.out' }
    );

    // Scroll Reveals
    const revealElements = document.querySelectorAll('.gsap-reveal');
    revealElements.forEach((el) => {
      gsap.fromTo(el,
        { opacity: 0, y: 20 },
        {
          scrollTrigger: {
            trigger: el,
            start: 'top 90%',
          },
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: 'power2.out'
        }
      );
    });

    const pills = document.querySelectorAll('.gsap-pill');
    if (pills.length > 0) {
      gsap.fromTo(pills,
        { opacity: 0, scale: 0.9 },
        {
          scrollTrigger: {
            trigger: pills[0],
            start: 'top 90%',
          },
          opacity: 1,
          scale: 1,
          duration: 0.4,
          stagger: 0.05,
          ease: 'back.out(1.2)'
        }
      );
    }
  }
}
