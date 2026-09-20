import React, { useState } from 'react';
import {
  Database,
  FileSpreadsheet,
  FlaskConical,
  Layers,
  Bookmark,
  LogIn,
  LogOut,
  User as UserIcon,
  Cloud,
  Triangle,
  BookOpen,
  Share2,
  MessageSquarePlus,
  Smartphone,
  ShieldCheck,
} from 'lucide-react';
import { ROCKS_DATASET } from '../data/rocksDataset';
import { MINERALS_DATASET } from '../data/mineralsDataset';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from './ThemeToggle';

export type ActiveTab = 'single' | 'batch' | 'tas' | 'ternary' | 'dataset' | 'collection';

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  batchCount?: number;
  collectionCount?: number;
  onOpenDocumentation?: (tab?: 'manual' | 'glossary' | 'cite') => void;
  onOpenShare?: () => void;
  onOpenFeedback?: () => void;
  onOpenPrivacy?: () => void;
  onOpenMobileApp?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  batchCount = 0,
  collectionCount = 0,
  onOpenDocumentation,
  onOpenShare,
  onOpenFeedback,
  onOpenPrivacy,
  onOpenMobileApp,
}) => {
  const { user, signIn, signOut, loading, cloudEnabled } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const navItems = [
    {
      id: 'single' as ActiveTab,
      label: 'Single Sample',
      shortLabel: 'Sample',
      icon: <FlaskConical className="w-3.5 h-3.5" />,
    },
    {
      id: 'batch' as ActiveTab,
      label: 'Bulk CSV',
      shortLabel: 'Bulk CSV',
      icon: <FileSpreadsheet className="w-3.5 h-3.5" />,
      badge: batchCount > 0 ? batchCount : undefined,
      badgeColor: 'bg-cyan-600 text-cyan-100',
    },
    {
      id: 'tas' as ActiveTab,
      label: 'TAS Diagram',
      shortLabel: 'TAS',
      icon: <Layers className="w-3.5 h-3.5" />,
    },
    {
      id: 'ternary' as ActiveTab,
      label: 'Ternary Systems',
      shortLabel: 'Ternary',
      icon: <Triangle className="w-3.5 h-3.5" />,
    },
    {
      id: 'dataset' as ActiveTab,
      label: 'Reference Library',
      shortLabel: 'Library',
      icon: <Database className="w-3.5 h-3.5" />,
    },
    {
      id: 'collection' as ActiveTab,
      label: 'My Collection',
      shortLabel: 'Saved',
      icon: <Bookmark className="w-3.5 h-3.5" />,
      badge: collectionCount > 0 ? collectionCount : undefined,
      badgeColor: 'bg-amber-600 text-white',
    },
  ];

  return (
    <header className="w-full bg-stone-900 border-b border-stone-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Main Header Bar */}
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-4 overflow-hidden">
          {/* Logo & Title */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-white shadow-md ring-1 ring-amber-500/30 shrink-0">
              <FlaskConical className="w-4 h-4 sm:w-5 sm:h-5 text-amber-100" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="text-sm sm:text-base font-bold text-stone-100 tracking-tight whitespace-nowrap">
                  RockMin ID
                </h1>
                <span className="hidden md:inline-block px-1.5 py-0.5 text-[9px] sm:text-[10px] font-semibold tracking-wider uppercase bg-amber-950/80 text-amber-300 rounded border border-amber-800/60">
                  GEOROC / EPMA
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-stone-400 font-normal hidden sm:block truncate">
                Mineral &amp; Rock Geochemical Classifier
              </p>
            </div>
          </div>

          {/* Desktop Navigation Tabs (Hidden on mobile) */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5 overflow-x-auto py-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={`nav-${item.id}`}
                  id={`nav-tab-${item.id}`}
                  onClick={() => onTabChange(item.id)}
                  className={`flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-lg text-xs xl:text-sm font-medium transition-all shrink-0 ${
                    isActive
                      ? 'bg-amber-600/20 text-amber-300 border border-amber-600/40 shadow-sm'
                      : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60 border border-transparent'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span
                      className={`ml-1 px-1.5 py-0.2 text-[10px] rounded-full font-mono font-bold ${
                        item.badgeColor || 'bg-stone-800 text-stone-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right-Side Actions: Share, Feedback, APK, Documentation, Theme Toggle, & User Auth */}
          {/* CRITICAL: Always immediately visible on mobile without horizontal scroll! */}
          <div className="shrink-0 flex items-center gap-1 sm:gap-1.5">
            {/* Share App / Specimen Button */}
            <button
              id="btn-nav-share"
              onClick={onOpenShare}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-750 text-stone-200 hover:text-amber-300 border border-stone-700 text-xs font-medium transition-colors shadow-sm"
              title="Share RockMin ID with colleagues or field team"
            >
              <Share2 className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">Share</span>
            </button>

            {/* Feedback & Suggestion System */}
            <button
              id="btn-nav-feedback"
              onClick={onOpenFeedback}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-750 text-stone-200 hover:text-amber-300 border border-stone-700 text-xs font-medium transition-colors shadow-sm"
              title="Submit feedback, bug reports, or rock/mineral suggestions"
            >
              <MessageSquarePlus className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">Feedback</span>
            </button>

            {/* APK / Mobile Install Package */}
            <button
              id="btn-nav-apk"
              onClick={onOpenMobileApp}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-750 text-stone-200 hover:text-emerald-300 border border-stone-700 text-xs font-medium transition-colors shadow-sm"
              title="Package APK for Android / Install PWA / Play Store"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden xl:inline">APK &amp; App</span>
            </button>

            {/* Documentation & Glossary Button */}
            <button
              id="btn-documentation-modal"
              onClick={() => onOpenDocumentation?.('manual')}
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-750 text-stone-200 hover:text-amber-300 border border-stone-700 text-xs font-medium transition-colors shadow-sm"
              title="Open Petrological Glossary & User Manual (Downloadable PDF)"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Manual</span>
            </button>

            {/* Theme Toggle (Dark / Light Switch) */}
            <ThemeToggle />

            <div className="h-5 w-px bg-stone-800 hidden sm:block" />

            {/* Auth / Profile */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 transition-colors"
                  title={`Logged in as ${user.email}`}
                >
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      referrerPolicy="no-referrer"
                      className="w-5 h-5 sm:w-6 sm:h-6 rounded-full ring-1 ring-amber-500"
                    />
                  ) : (
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-amber-600 flex items-center justify-center text-white text-[11px] font-bold">
                      {(user.displayName || user.email || 'G')[0].toUpperCase()}
                    </div>
                  )}
                  <span className="hidden md:inline text-xs font-medium text-stone-200 truncate max-w-[100px]">
                    {user.displayName || user.email?.split('@')[0]}
                  </span>
                  <Cloud className="w-3 h-3 text-emerald-400" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-stone-900 border border-stone-800 rounded-xl shadow-xl py-2 z-50 animate-fadeIn">
                    <div className="px-3 py-2 border-b border-stone-800">
                      <p className="text-xs font-semibold text-stone-200 truncate">
                        {user.displayName || 'Geochemist'}
                      </p>
                      <p className="text-[10px] text-stone-400 truncate">{user.email}</p>
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-400">
                        <Cloud className="w-3 h-3" />
                        <span>Cloud Database Active</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onTabChange('collection');
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-stone-300 hover:bg-stone-800 flex items-center gap-2"
                    >
                      <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                      <span>View Saved Specimens</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenShare?.();
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-stone-300 hover:bg-stone-800 flex items-center gap-2"
                    >
                      <Share2 className="w-3.5 h-3.5 text-amber-400" />
                      <span>Share Platform</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenFeedback?.();
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-stone-300 hover:bg-stone-800 flex items-center gap-2"
                    >
                      <MessageSquarePlus className="w-3.5 h-3.5 text-amber-400" />
                      <span>Feedback &amp; Suggestions</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenPrivacy?.();
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-stone-300 hover:bg-stone-800 flex items-center gap-2"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Privacy Policy</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenMobileApp?.();
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-stone-300 hover:bg-stone-800 flex items-center gap-2"
                    >
                      <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                      <span>APK &amp; Mobile Setup</span>
                    </button>

                    <div className="my-1 border-t border-stone-800" />

                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        signOut();
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-rose-300 hover:bg-stone-800 flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : cloudEnabled ? (
              <button
                onClick={() => signIn()}
                disabled={loading}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white border border-stone-700 transition-colors shadow-sm shrink-0"
                title="Sign in with Google to enable cloud sync of your specimen collection"
              >
                <LogIn className="w-3.5 h-3.5 text-amber-400" />
                <span>Sign In</span>
              </button>
            ) : (
              /* No Firebase project configured for this deployment. Offering a
                 sign-in button that can only fail is worse than saying so:
                 every specimen is still saved locally in the browser. */
              <span
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-stone-900 text-stone-500 border border-stone-800 shrink-0 cursor-default"
                title="Cloud sync is not configured for this deployment. Your specimen collection is saved locally in this browser and all analysis features work normally."
              >
                <LogIn className="w-3.5 h-3.5 text-stone-600" />
                <span className="hidden sm:inline">Local Mode</span>
              </span>
            )}
          </div>
        </div>

        {/* Mobile / Medium-screen Navigation Tab Bar */}
        {/* Dedicated second row on screens below lg: smoothly scrollable, never pushes Auth/Theme offscreen! */}
        <div className="lg:hidden border-t border-stone-800/80 py-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <nav className="flex items-center gap-1.5 min-w-max px-0.5">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={`mobile-nav-${item.id}`}
                  onClick={() => onTabChange(item.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all shrink-0 ${
                    isActive
                      ? 'bg-amber-600/20 text-amber-300 border border-amber-600/40 shadow-sm font-semibold'
                      : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60 border border-transparent'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span
                      className={`ml-1 px-1.5 py-0.2 text-[9px] rounded-full font-mono font-bold ${
                        item.badgeColor || 'bg-stone-800 text-stone-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            <button
              onClick={onOpenShare}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-stone-850 hover:bg-stone-800 text-stone-300 border border-stone-800 shadow-sm shrink-0"
              title="Share RockMin ID"
            >
              <Share2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Share</span>
            </button>

            <button
              onClick={onOpenFeedback}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-stone-850 hover:bg-stone-800 text-stone-300 border border-stone-800 shadow-sm shrink-0"
              title="Feedback & Suggestions"
            >
              <MessageSquarePlus className="w-3.5 h-3.5 text-amber-400" />
              <span>Feedback</span>
            </button>

            <button
              onClick={onOpenMobileApp}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-stone-850 hover:bg-stone-800 text-emerald-400 border border-stone-800 shadow-sm shrink-0"
              title="Download Android APK / App"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>APK App</span>
            </button>

            <button
              onClick={() => onOpenDocumentation?.('manual')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-stone-850 hover:bg-stone-800 text-amber-300 border border-amber-900/40 shadow-sm shrink-0"
              title="Open Petrological Glossary & User Manual"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Manual</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
