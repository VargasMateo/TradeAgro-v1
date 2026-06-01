import { ReactNode, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import logoIso from "../assets/tradeagro-drawer.png";
import {
  Home,
  Menu,
  Users,
  UserCheck,
  Shield,
  ClipboardList,
  Sun
} from "lucide-react";
import { cn } from "../lib/utils";
import { useState } from "react";
import CreateWorkOrderModal from "./CreateWorkOrderModal";
import GlobalCreateClientModal from "./GlobalCreateClientModal";
import GlobalCreateProfesionalModal from "./GlobalCreateProfesionalModal";

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
          hasStations: !!parsed.hasStations,
          avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(parsed.displayName || parsed.name || 'U')}&background=059669&color=fff&size=256`
        };
      } catch (e) { /* fall through */ }
    }
    return { name: "Usuario", email: "", hasStations: false, avatarUrl: `https://ui-avatars.com/api/?name=U&background=059669&color=fff&size=256` };
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
            hasStations: !!parsed.hasStations,
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
    if (path === "/dashboard") {
      return location.pathname === "/dashboard" || location.pathname === "/";
    }
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  const navItems = [
    { path: "/dashboard", label: "Inicio", icon: Home },
    //{ path: "/calendar", label: "Calendario", icon: Calendar },
    { path: "/work-orders", label: "Órdenes", icon: ClipboardList },
    //{ path: "/reports", label: "Reportes", icon: FileText },
  ];

  if (userRole === 'profesional') {
    navItems.push(
      { path: "/clients", label: "Clientes", icon: Users },
      { path: "/stations", label: "Est. Meteorológicas", icon: Sun }
    );
  } else if (userRole === 'client') {
    navItems.push(
      { path: "/profesionales", label: "Profesionales", icon: UserCheck }
    );
    if (userProfile.hasStations) {
      navItems.push(
        { path: "/stations", label: "Est. Meteorológicas", icon: Sun }
      );
    }
  } else if (userRole === 'admin') {
    navItems.push(
      { path: "/clients", label: "Clientes", icon: Users },
      { path: "/profesionales", label: "Profesionales", icon: UserCheck },
      { path: "/stations", label: "Est. Meteorológicas", icon: Sun },
      { path: "/db-test", label: "DB Test", icon: Shield },
    );
  }

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
          <Link to="/dashboard" className="flex h-24 items-center gap-3 border-b border-slate-100 px-8 transition-opacity hover:opacity-80 overflow-hidden">
            <img src={logoIso} alt="TradeAgro" className="h-10 w-auto object-contain shrink-0" />
            {userRole === 'admin' && (
              <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Admin
              </span>
            )}
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
            <Link
              to="/profile"
              onClick={() => setIsSidebarOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-2xl border p-3 transition-colors",
                isActive("/profile")
                  ? "border-emerald-100 bg-emerald-50 shadow-sm"
                  : "border-slate-100 bg-slate-50/50 hover:bg-slate-100"
              )}
            >
              <div className={cn(
                "h-10 w-10 overflow-hidden rounded-full border-2 shadow-sm",
                isActive("/profile") ? "border-emerald-200" : "border-white"
              )}>
                <img
                  src={userProfile.avatarUrl}
                  alt={userProfile.name}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className={cn(
                  "truncate text-sm font-bold",
                  isActive("/profile") ? "text-emerald-700" : "text-slate-900"
                )}>
                  {userProfile.name}
                </p>
                <p className={cn(
                  "truncate text-xs font-medium",
                  isActive("/profile") ? "text-emerald-600/80" : "text-slate-500"
                )}>
                  {userProfile.email}
                </p>
              </div>
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
              <img src={logoIso} alt="TradeAgro" className="h-8 w-auto object-contain" />
            </Link>
            <h2 className="hidden text-xl font-bold text-slate-800 lg:block">
              {(() => {
                if (location.pathname.startsWith("/work-orders/")) {
                  const subPath = location.pathname.substring("/work-orders/".length);
                  if (subPath && subPath !== "") {
                    return "Detalles de la orden";
                  }
                }
                
                const activeItem = navItems.find((i) => isActive(i.path));
                if (activeItem) return activeItem.label;
                
                if (location.pathname === "/profile") return "Mi Perfil";
                
                return "Inicio";
              })()}
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
      <CreateWorkOrderModal />
      <GlobalCreateClientModal />
      <GlobalCreateProfesionalModal />
    </div>
  );
}
