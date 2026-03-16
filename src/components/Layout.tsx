import { ReactNode, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Bell,
  Search,
  Tractor,
  Home,
  Briefcase,
  FileText,
  Settings,
  LogOut,
  Menu,
  Sun,
  Users,
  Calendar,
  Shield
} from "lucide-react";
import { cn } from "../lib/utils";
import { useState } from "react";
import NotificationsDropdown from "./NotificationsDropdown";
import CreateJobModal from "./CreateJobModal";
import GlobalCreateClientModal from "./GlobalCreateClientModal";

export default function Layout({ children, onLogout, userRole = 'profesional' }: { children: ReactNode, onLogout?: () => void, userRole?: 'profesional' | 'client' | 'admin' }) {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  const getInitialProfile = () => {
    const saved = localStorage.getItem("userProfile");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          name: parsed.displayName || parsed.name || "Usuario",
          email: parsed.email || "",
          avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(parsed.displayName || parsed.name || 'U')}&background=059669&color=fff&size=256`
        };
      } catch (e) { /* fall through */ }
    }
    return { name: "Usuario", email: "", avatarUrl: `https://ui-avatars.com/api/?name=U&background=059669&color=fff&size=256` };
  };

  const [userProfile, setUserProfile] = useState(getInitialProfile);

  useEffect(() => {
    const loadProfile = () => {
      const saved = localStorage.getItem("userProfile");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setUserProfile({
            name: parsed.displayName || parsed.name || "Usuario",
            email: parsed.email || "",
            avatarUrl: parsed.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(parsed.displayName || parsed.name || 'U')}&background=059669&color=fff&size=256`
          });
        } catch (e) {
          console.error("Error parsing user profile", e);
        }
      }
    };

    loadProfile();
    window.addEventListener("storage", loadProfile);
    // Custom event for same-tab updates
    window.addEventListener("profile-updated", loadProfile);

    return () => {
      window.removeEventListener("storage", loadProfile);
      window.removeEventListener("profile-updated", loadProfile);
    };
  }, [location.pathname]);

  // Close notifications when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const navItems = [
    { path: "/dashboard", label: "Inicio", icon: Home },
    //{ path: "/calendar", label: "Calendario", icon: Calendar },
    { path: "/jobs", label: "Trabajos", icon: Briefcase },
    //{ path: "/reports", label: "Reportes", icon: FileText },
  ];

  if (userRole === 'profesional') {
    navItems.push(
      { path: "/clients", label: "Clientes", icon: Users },
      { path: "/stations", label: "Estaciones", icon: Sun }
    );
  } else if (userRole === 'client') {
    navItems.push(
      { path: "/profesionales", label: "Profesionales", icon: Users }
    );
  } else if (userRole === 'admin') {
    navItems.push(
      { path: "/clients", label: "Clientes", icon: Users },
      { path: "/profesionales", label: "Profesionales", icon: Users },
      { path: "/stations", label: "Estaciones", icon: Sun }
    );
  }

  // Always append DB Test at the very end
  navItems.push({ path: "/db-test", label: "DB Test", icon: Shield });

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans text-slate-900">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 transform bg-white border-r border-slate-200 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo Section */}
          <Link to="/dashboard" className="flex h-24 items-center gap-4 border-b border-slate-100 px-8 transition-opacity hover:opacity-80">
            <div className="relative flex h-12 w-12 items-center justify-center">
              <svg viewBox="0 0 100 100" className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                <clipPath id="logo-clip-desktop">
                  <circle cx="50" cy="50" r="50" />
                </clipPath>
                <g clipPath="url(#logo-clip-desktop)">
                  <rect x="0" y="0" width="100" height="100" fill="#0A6C35" />
                  <path d="M 0 0 L 100 0 L 100 50 Q 45 25 0 45 Z" fill="#005A9C" />
                  <path d="M -5 45 Q 45 25 105 45" stroke="white" strokeWidth="6" fill="none" />
                  <path d="M -5 68 Q 50 45 105 72" stroke="white" strokeWidth="6" fill="none" />
                  <path d="M -5 92 Q 55 68 105 100" stroke="white" strokeWidth="6" fill="none" />
                </g>
              </svg>
            </div>
            <div className="flex flex-col justify-center">
              <h1 className="font-display text-xl font-bold tracking-tight text-slate-900 leading-none">
                TradeAgro
              </h1>
              <span className="mt-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Admin Panel
              </span>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="flex-1 space-y-1.5 px-4 py-4">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={cn(
                  "group flex items-center gap-3.5 rounded-xl px-4 py-3.5 text-sm font-semibold transition-all duration-200",
                  isActive(item.path)
                    ? "bg-emerald-50 text-emerald-700 shadow-sm ring-1 ring-emerald-100"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <item.icon
                  className={cn(
                    "h-5 w-5 transition-colors",
                    isActive(item.path)
                      ? "text-emerald-600"
                      : "text-slate-400 group-hover:text-slate-600"
                  )}
                />
                {item.label}
              </Link>
            ))}
          </nav>

          {/* User Profile */}
          <div className="border-t border-slate-100 p-6">
            <Link to="/profile" className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-3 transition-colors hover:bg-slate-100">
              <div className="h-10 w-10 overflow-hidden rounded-full border-2 border-white shadow-sm">
                <img
                  src={userProfile.avatarUrl}
                  alt={userProfile.name}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-bold text-slate-900">
                  {userProfile.name}
                </p>
                <p className="truncate text-xs font-medium text-slate-500">
                  {userProfile.email}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onLogout?.();
                }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-slate-600 hover:shadow-sm"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur-md lg:h-20 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>
            <Link to="/dashboard" className="flex items-center gap-2 lg:hidden transition-opacity hover:opacity-80">
              <div className="relative flex h-8 w-8 items-center justify-center">
                <svg viewBox="0 0 100 100" className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <clipPath id="logo-clip-mobile">
                    <circle cx="50" cy="50" r="50" />
                  </clipPath>
                  <g clipPath="url(#logo-clip-mobile)">
                    <rect x="0" y="0" width="100" height="100" fill="#0A6C35" />
                    <path d="M 0 0 L 100 0 L 100 50 Q 45 25 0 45 Z" fill="#005A9C" />
                    <path d="M -5 45 Q 45 25 105 45" stroke="white" strokeWidth="6" fill="none" />
                    <path d="M -5 68 Q 50 45 105 72" stroke="white" strokeWidth="6" fill="none" />
                    <path d="M -5 92 Q 55 68 105 100" stroke="white" strokeWidth="6" fill="none" />
                  </g>
                </svg>
              </div>
              <span className="font-display text-lg font-bold text-slate-900">
                TradeAgro
              </span>
            </Link>
            <h2 className="hidden text-xl font-bold text-slate-800 lg:block">
              {navItems.find((i) => isActive(i.path))?.label || "Inicio"}
            </h2>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* TODO: Implementar notificaciones */}
            {/* <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className={cn(
                  "relative rounded-xl p-2 transition-colors lg:p-2.5",
                  isNotificationsOpen ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                )}
              >
                <Bell className="h-5 w-5" />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-red-500 lg:right-2.5 lg:top-2.5"></span>
              </button>

              <NotificationsDropdown
                isOpen={isNotificationsOpen}
                onClose={() => setIsNotificationsOpen(false)}
              />
            </div> */}

            <Link to="/profile" className="hidden rounded-xl bg-slate-100 p-2.5 text-slate-500 transition-colors hover:bg-slate-200 sm:block">
              <Settings className="h-5 w-5" />
            </Link>

            <Link to="/profile" className="h-8 w-8 overflow-hidden rounded-full border border-slate-200 sm:hidden">
              <img
                src={userProfile.avatarUrl}
                alt={userProfile.name}
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50/50 p-4 lg:p-8">
          {children}
        </main>
      </div>

      {/* Global Modals */}
      <CreateJobModal />
      <GlobalCreateClientModal />
    </div>
  );
}
