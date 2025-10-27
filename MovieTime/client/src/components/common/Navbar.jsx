import { useState, useRef, useEffect } from "react";
import { NavLink, Link } from "react-router-dom";
import { assets } from "@/assets/assets";
import {
  MenuIcon,
  SearchIcon,
  XIcon,
  Home,
  Film,
  Calendar,
  Star,
  HeartIcon,
  Sparkles,
} from "lucide-react";
import UserSection from "@/components/user/UserSection";
import { useAppContext } from "@/context/AppContext";
import SearchPanel from "@/components/user/SearchPanel";


const navItems = [
  { to: "/", label: "Home", Icon: Home },
  { to: "/movies", label: "Movies", Icon: Film },
  { to: "/top-rated", label: "Top Rated", Icon: Star },
  { to: "/upcoming", label: "Upcoming", Icon: Calendar },
  { to: "/recommend", label: "AI Suggestion", Icon: Sparkles },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  const { favoriteMovies } = useAppContext();
  const containerRef = useRef(null);
  const toggleRef = useRef(null);
  const mobileRef = useRef(null);

  // update isMobile on resize
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    onResize();
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Close menu and restore focus to toggle (a11y)
  const closeMenu = () => {
    setIsOpen(false);
    toggleRef.current?.focus();
  };
  const [isSearchOpen, setSearchOpen] = useState(false);

  // Attach pointerdown handler only while open
  useEffect(() => {
    if (!isOpen) return;

    const handler = (e) => {
      if (!containerRef.current) return;

      // Shadow DOM friendly path or fallback to target
      const path =
        typeof e.composedPath === "function" ? e.composedPath() : [e.target];

      // If click is inside the navbar container (or on the toggle button), do nothing
      if (
        path.includes(containerRef.current) ||
        (toggleRef.current && path.includes(toggleRef.current)) ||
        (mobileRef.current && path.includes(mobileRef.current)) ||
        containerRef.current.contains(e.target) ||
        (mobileRef.current && mobileRef.current.contains(e.target))
      ) {
        return;
      }

      // otherwise close
      closeMenu();
    };

    document.addEventListener("pointerdown", handler, { passive: true });
    return () => document.removeEventListener("pointerdown", handler);
  }, [isOpen]);

  const navDesktopClass = ({ isActive }) =>
    `relative inline-flex items-center justify-center px-6 py-2 text-sm rounded-full transition duration-200 ${
      isActive
        ? "text-primary bg-white/6 font-semibold shadow-sm scale-105"
        : "text-gray-300 hover:text-white hover:scale-105"
    }`;

  const navMobileClass = ({ isActive }) =>
    `flex items-center gap-3 px-6 py-3 rounded-md transition text-lg ${
      isActive
        ? "text-primary bg-white/6"
        : "text-gray-200 hover:text-white hover:bg-white/5"
    }`;

  return (
    <nav aria-label="Main navigation" className="absolute inset-x-0 top-0 z-50">
      <div
        ref={containerRef}
        className="max-w-[1400px] mx-auto flex items-center justify-between px-6 md:px-16 lg:px-36 py-4"
      >
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-3"
          onClick={() => {
            setIsOpen(false);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <img src={assets.title} alt="Site title" className="h-auto w-36" />
        </Link>

        {/* Desktop links */}
        <div className="items-center hidden gap-4 md:flex">
          <div className="inline-flex items-center gap-4 px-2 py-1 border rounded-full bg-black/30 backdrop-blur-md border-white/10">
            {navItems.map(({ to, label, Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={navDesktopClass}
              >
                <Icon className="w-4 h-4 mr-1 opacity-90" />
                <span>{label}</span>
              </NavLink>
            ))}
            {favoriteMovies?.length > 0 && (
              <NavLink to="/favorite" className={navDesktopClass}>
                <HeartIcon className="w-4 h-4 mr-1 opacity-90" />
                <span>Favorites</span>
              </NavLink>
            )}
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-4">
          <SearchIcon
            className="hidden w-5 h-5 text-gray-300 transition cursor-pointer md:block hover:text-white"
            onClick={() => setSearchOpen(true)}
          />
          <UserSection />

          {/* Mobile toggle - VISIBLE ONLY ON MOBILE (md:hidden) */}
          <button
            ref={toggleRef}
            aria-label="Toggle menu"
            aria-expanded={isOpen}
            className="inline-flex items-center justify-center p-2 text-gray-200 rounded-md md:hidden bg-white/5"
            onClick={() => setIsOpen((v) => !v)}
          >
            {isOpen ? (
              <XIcon className="w-6 h-6" />
            ) : (
              <MenuIcon className="w-7 h-7" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu: lazy mounted only when open AND on mobile view */}
      {isOpen && isMobile && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeMenu}
          />

          {/* Menu content */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              ref={mobileRef}
              className="flex flex-col items-center w-full gap-4 px-6 mobile-menu"
            >
              {navItems.map(({ to, label, Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/"}
                  onClick={() => {
                    closeMenu();
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className={navMobileClass}
                >
                  <Icon className="w-5 h-5" />
                  <span>{label}</span>
                </NavLink>
              ))}

              {favoriteMovies?.length > 0 && (
                <NavLink
                  to="/favorite"
                  onClick={() => {
                    closeMenu();
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-6 py-3 rounded-md transition ${
                      isActive
                        ? "text-primary bg-white/6"
                        : "text-gray-200 hover:text-white hover:bg-white/5"
                    }`
                  }
                >
                  <HeartIcon />
                  Favorites
                </NavLink>
              )}
            </div>
          </div>
        </div>
      )}
      <SearchPanel isOpen={isSearchOpen} onClose={() => setSearchOpen(false)} />
    </nav>
  );
}
