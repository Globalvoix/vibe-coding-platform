"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useUIStore } from '@/lib/ui-store';
import { CREDITS_UPDATED_EVENT } from '@/lib/credits-events';
import { cn } from '@/lib/utils';
import { Menu } from 'lucide-react';
import { ThinksoftLogo } from '@/components/icons/thinksoft';
import Link from 'next/link';
import { useAuth, useClerk } from '@clerk/nextjs';
import { SignInButton, SignUpButton } from '@clerk/nextjs';
import { UserButtonWrapper } from './user-button-wrapper';
import { usePathname } from 'next/navigation';

const AnimatedNavLink = ({ href, children, onClick }: { href: string; children: React.ReactNode; onClick?: (e: React.MouseEvent) => void }) => {
  const defaultTextColor = 'text-gray-600';
  const hoverTextColor = 'text-gray-900';
  const textSizeClass = 'text-sm';

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`group relative inline-block overflow-hidden h-5 flex items-center ${textSizeClass}`}
    >
      <div className="flex flex-col transition-transform duration-400 ease-out transform group-hover:-translate-y-1/2">
        <span className={defaultTextColor}>{children}</span>
        <span className={hoverTextColor}>{children}</span>
      </div>
    </Link>
  );
};

type NavbarVariant = 'default' | 'home';

export function Navbar({ variant = 'default', theme = 'dark' }: { variant?: NavbarVariant, theme?: 'light' | 'dark' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [headerShapeClass, setHeaderShapeClass] = useState('rounded-full');
  const shapeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toggleSidebar } = useUIStore();
  const { isSignedIn } = useAuth();
  const { signIn } = useSignIn();
  const pathname = usePathname();
  const isProjectsPage = pathname === '/projects';
  const [planId, setPlanId] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleProjectsClick = (e: React.MouseEvent) => {
    if (!isSignedIn) {
      e.preventDefault();
      if (signIn) {
        signIn.create({
          strategy: 'oauth_google',
        }).catch(() => {
          if (signIn) {
            signIn.create({
              strategy: 'email_code',
            });
          }
        });
      }
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (shapeTimeoutRef.current) {
      clearTimeout(shapeTimeoutRef.current);
    }

    if (isOpen) {
      setHeaderShapeClass('rounded-xl');
    } else {
      shapeTimeoutRef.current = setTimeout(() => {
        setHeaderShapeClass('rounded-full');
      }, 300);
    }

    return () => {
      if (shapeTimeoutRef.current) {
        clearTimeout(shapeTimeoutRef.current);
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isSignedIn) {
      setPlanId(null);
      setSubscriptionStatus(null);
      setCreditBalance(null);
      return;
    }

    let cancelled = false;

    const hasCheckoutSuccess =
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('checkout') === 'success';

    const maxAttempts = hasCheckoutSuccess ? 8 : 1;
    let attempts = 0;

    async function loadSubscriptionAndCredits() {
      try {
        const [subscriptionResponse, creditsResponse] = await Promise.all([
          fetch('/api/user/subscription'),
          fetch('/api/user/credits'),
        ]);

        if (!subscriptionResponse.ok || !creditsResponse.ok || cancelled) return;

        const subscriptionData = await subscriptionResponse.json();
        const creditsData = await creditsResponse.json();

        setPlanId(subscriptionData.subscription?.plan_id ?? null);
        setSubscriptionStatus(subscriptionData.subscription?.status ?? null);
        setCreditBalance(typeof creditsData.credits === 'number' ? creditsData.credits : null);

        const isPro =
          subscriptionData.subscription?.plan_id === 'pro' &&
          subscriptionData.subscription?.status === 'active';
        attempts += 1;
        if (!isPro && attempts < maxAttempts) {
          setTimeout(loadSubscriptionAndCredits, 2000);
        }
      } catch (error) {
        console.error('Failed to load subscription or credits', error);
      }
    }

    loadSubscriptionAndCredits();

    window.addEventListener(CREDITS_UPDATED_EVENT, loadSubscriptionAndCredits);

    return () => {
      cancelled = true;
      window.removeEventListener(CREDITS_UPDATED_EVENT, loadSubscriptionAndCredits);
    };
  }, [isSignedIn]);

  const navLinksData =
    variant === 'home'
      ? [
          { label: 'Home', href: '/' },
          { label: 'Pricing', href: '/pricing' },
          { label: 'Projects', href: '/projects' },
        ]
      : [
          { label: 'Home', href: '/' },
          { label: 'Pricing', href: '/pricing' },
        ];

  const isProActive =
    planId === 'pro' && (subscriptionStatus === 'active' || !subscriptionStatus);

  const hasCredits = typeof creditBalance === 'number' && creditBalance > 0;

  const authElement = isSignedIn ? (
    <div className="flex items-center gap-2">
      <UserButtonWrapper afterSignOutUrl="/" />
      {variant === 'default' && isProActive && (
        <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded-full bg-blue-600/10 text-blue-700 border border-blue-500/40">
          Pro
        </span>
      )}
      {variant === 'default' && hasCredits && (
        <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded-full bg-green-600/10 text-green-700 border border-green-500/40">
          {creditBalance} credits
        </span>
      )}
    </div>
  ) : variant === 'home' ? (
    <SignInButton mode="modal">
      <button className="inline-flex items-center justify-center rounded-md bg-white px-5 py-2 text-sm font-medium text-gray-900 shadow-sm hover:bg-white transition-colors">
        Sign in / Sign up
      </button>
    </SignInButton>
  ) : (
    <>
      <SignInButton mode="modal">
        <button className="px-4 py-2 sm:px-3 text-xs sm:text-sm border border-gray-300 bg-white text-gray-700 rounded-full hover:border-gray-400 hover:bg-gray-50 transition-colors duration-200 w-full sm:w-auto">
          LogIn
        </button>
      </SignInButton>

      <SignUpButton mode="modal">
        <div className="relative group w-full sm:w-auto">
          <div className="absolute inset-0 -m-2 rounded-full hidden sm:block bg-blue-500 opacity-20 filter blur-lg pointer-events-none transition-all duration-300 ease-out group-hover:opacity-30 group-hover:blur-xl group-hover:-m-3"></div>
          <button className="relative z-10 px-4 py-2 sm:px-3 text-xs sm:text-sm font-semibold text-white bg-gradient-to-br from-blue-600 to-blue-700 rounded-full hover:from-blue-700 hover:to-blue-800 transition-all duration-200 w-full sm:w-auto">
            Signup
          </button>
        </div>
      </SignUpButton>
    </>
  );

  const headerClassName =
    variant === 'home'
      ? cn(
          'fixed top-4 left-1/2 -translate-x-1/2 z-20 transition-all duration-300 ease-in-out',
          isScrolled
            ? 'w-auto px-6 py-2 rounded-full bg-black shadow-lg border border-white/10'
            : 'w-[calc(100%-2rem)] max-w-6xl px-6 py-2'
        )
      : `fixed top-6 left-1/2 transform -translate-x-1/2 z-20 flex flex-col items-center pl-6 pr-6 py-3 backdrop-blur-sm ${headerShapeClass} border border-gray-300 bg-white/90 w-[calc(100%-2rem)] sm:w-auto transition-[border-radius] duration-0 ease-in-out`

  const isLight = theme === 'light';
  const isCurrentlyLight = isLight && !isScrolled;

  return (
    <header className={headerClassName}>
      {variant === 'home' ? (
        <>
          <div className={cn("flex items-center justify-between w-full", isScrolled ? "gap-8" : "gap-6")}>
          <div className="flex items-center gap-3">
            {!isProjectsPage && (
              <button
                onClick={toggleSidebar}
                className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  isScrolled ? "hover:bg-white/10" : isCurrentlyLight ? "hover:bg-gray-100" : "hover:bg-white/10"
                )}
                title="Toggle app menu"
                aria-label="Toggle app menu"
              >
                <Menu className={cn("w-5 h-5", isScrolled ? "text-white" : isCurrentlyLight ? "text-gray-900" : "text-white")} />
              </button>
            )}
            {!isProjectsPage && (
              <Link href="/" className={cn("flex items-center gap-2 shrink-0", isScrolled ? "text-white" : isCurrentlyLight ? "text-gray-900" : "text-white")}>
                <ThinksoftLogo className="h-6 w-auto" />
              </Link>
            )}
          </div>

          {!isProjectsPage && (
            <nav className="hidden sm:flex items-center mx-4">
              <div className={cn(
                "flex items-center gap-6 rounded-md px-6 py-2.5 backdrop-blur-sm transition-all duration-300",
                isScrolled ? "bg-transparent px-0 py-0" : isCurrentlyLight ? "bg-gray-100" : "bg-white/10"
              )}>
                {navLinksData.map((link) => (
                  link.label === 'Projects' ? (
                    <button
                      key={link.href}
                      onClick={handleProjectsClick}
                      className={cn(
                        "text-sm font-medium transition-colors whitespace-nowrap cursor-pointer",
                        isScrolled ? "text-white/80 hover:text-white" : isCurrentlyLight ? "text-gray-600 hover:text-gray-900" : "text-white/80 hover:text-white"
                      )}
                    >
                      {link.label}
                    </button>
                  ) : (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        "text-sm font-medium transition-colors whitespace-nowrap",
                        isScrolled ? "text-white/80 hover:text-white" : isCurrentlyLight ? "text-gray-600 hover:text-gray-900" : "text-white/80 hover:text-white"
                      )}
                    >
                      {link.label}
                    </Link>
                  )
                ))}
              </div>
            </nav>
          )}

          {!isProjectsPage && (
            <div className="flex items-center gap-2 shrink-0">
              {isSignedIn ? (
                <div className="flex items-center gap-2">
        <UserButtonWrapper afterSignOutUrl="/" />
                </div>
              ) : (
                <SignInButton mode="modal">
                  <button className={cn(
                    "inline-flex items-center justify-center rounded-md px-5 py-2 text-sm font-medium shadow-sm transition-colors whitespace-nowrap",
                    isScrolled
                      ? "bg-white text-black hover:bg-gray-100"
                      : isCurrentlyLight
                      ? "bg-gray-900 text-white hover:bg-gray-800"
                      : "bg-white text-gray-900 hover:bg-gray-50"
                  )}>
                    Sign in / Sign up
                  </button>
                </SignInButton>
              )}
            </div>
          )}

          {!isProjectsPage && (
            <button
              className="sm:hidden flex items-center justify-center w-8 h-8 transition-colors shrink-0"
              onClick={toggleMenu}
              aria-label={isOpen ? 'Close Menu' : 'Open Menu'}
            >
              {isOpen ? (
                <svg
                  className={cn("w-6 h-6", isScrolled ? "text-white" : isCurrentlyLight ? "text-gray-900" : "text-white")}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  ></path>
                </svg>
              ) : (
                <svg
                  className={cn("w-6 h-6", isScrolled ? "text-white" : isCurrentlyLight ? "text-gray-900" : "text-white")}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  ></path>
                </svg>
              )}
            </button>
          )}
        </div>

        {!isProjectsPage && (
          <div
            className={`sm:hidden flex flex-col items-center w-full transition-all ease-in-out duration-300 overflow-hidden ${
              isOpen
                ? 'max-h-[1000px] opacity-100 pt-4'
                : 'max-h-0 opacity-0 pt-0 pointer-events-none'
            }`}
          >
            <nav className="flex flex-col items-center space-y-4 text-base w-full">
              {navLinksData.map((link) => (
                link.label === 'Projects' ? (
                  <button
                    key={link.href}
                    onClick={handleProjectsClick}
                    className={cn(
                      "font-medium transition-colors w-full text-center cursor-pointer",
                      isScrolled ? "text-white hover:text-white/80" : isCurrentlyLight ? "text-gray-900 hover:text-gray-700" : "text-white hover:text-white/80"
                    )}
                  >
                    {link.label}
                  </button>
                ) : (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "font-medium transition-colors w-full text-center",
                      isScrolled ? "text-white hover:text-white/80" : isCurrentlyLight ? "text-gray-900 hover:text-gray-700" : "text-white hover:text-white/80"
                    )}
                  >
                    {link.label}
                  </Link>
                )
              ))}
            </nav>
          </div>
        )}
        </>
      ) : (
        <>
          <div className="flex items-center justify-between w-full gap-x-6 sm:gap-x-8">
            <div className="flex items-center gap-2">
              <button
                onClick={toggleSidebar}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                title="Toggle app menu"
                aria-label="Toggle app menu"
              >
                <Menu className="w-5 h-5 text-gray-700" />
              </button>
            </div>

            <nav className="hidden sm:flex items-center space-x-4 sm:space-x-6 text-sm">
              {navLinksData.map((link) => (
                link.label === 'Projects' ? (
                  <button
                    key={link.href}
                    onClick={handleProjectsClick}
                    className="group relative inline-block overflow-hidden h-5 flex items-center text-sm cursor-pointer"
                  >
                    <div className="flex flex-col transition-transform duration-400 ease-out transform group-hover:-translate-y-1/2">
                      <span className="text-gray-600">{link.label}</span>
                      <span className="text-gray-900">{link.label}</span>
                    </div>
                  </button>
                ) : (
                  <AnimatedNavLink key={link.href} href={link.href}>
                    {link.label}
                  </AnimatedNavLink>
                )
              ))}
            </nav>

            <div className="hidden sm:flex items-center gap-2 sm:gap-3">{authElement}</div>

            <button
              className="sm:hidden flex items-center justify-center w-8 h-8 text-gray-700 focus:outline-none"
              onClick={toggleMenu}
              aria-label={isOpen ? 'Close Menu' : 'Open Menu'}
            >
              {isOpen ? (
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  ></path>
                </svg>
              ) : (
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  ></path>
                </svg>
              )}
            </button>
          </div>

          <div
            className={`sm:hidden flex flex-col items-center w-full transition-all ease-in-out duration-300 overflow-hidden ${
              isOpen
                ? 'max-h-[1000px] opacity-100 pt-4'
                : 'max-h-0 opacity-0 pt-0 pointer-events-none'
            }`}
          >
            <nav className="flex flex-col items-center space-y-4 text-base w-full">
              {navLinksData.map((link) => (
                link.label === 'Projects' ? (
                  <button
                    key={link.href}
                    onClick={handleProjectsClick}
                    className="text-gray-700 hover:text-gray-900 transition-colors w-full text-center cursor-pointer"
                  >
                    {link.label}
                  </button>
                ) : (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-gray-700 hover:text-gray-900 transition-colors w-full text-center"
                  >
                    {link.label}
                  </Link>
                )
              ))}
            </nav>
            <div className="flex flex-col items-center space-y-4 mt-4 w-full">{authElement}</div>
          </div>
        </>
      )}
    </header>
  );
}
