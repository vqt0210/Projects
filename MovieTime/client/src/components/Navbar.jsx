// src/components/Navbar.jsx
import { useState, useRef, useEffect } from "react"
import { NavLink, Link } from "react-router-dom"
import { assets } from "../assets/assets"
import {
  MenuIcon,
  SearchIcon,
  XIcon,
  Home,
  Film,
  MapPin,
  Calendar,
} from "lucide-react"
import UserSection from "./UserSection"
import { useAppContext } from "../context/AppContext"

const navItems = [
  { to: "/", label: "Home", Icon: Home },
  { to: "/movies", label: "Movies", Icon: Film },
  { to: "/theaters", label: "Theaters", Icon: MapPin },
  { to: "/releases", label: "Releases", Icon: Calendar },
]

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const { favoriteMovies } = useAppContext()
  const containerRef = useRef(null)
  const toggleRef = useRef(null)
  const mobileRef = useRef(null)

  // Close menu and restore focus to toggle (a11y)
  const closeMenu = () => {
    setIsOpen(false)
    // restore focus to toggle so keyboard/screenreader users keep context
    toggleRef.current?.focus()
  }

  // Attach pointerdown handler only while open
  useEffect(() => {
    if (!isOpen) return

    const handler = (e) => {
      if (!containerRef.current) return

      // Shadow DOM friendly path or fallback to target
      const path = typeof e.composedPath === "function" ? e.composedPath() : [e.target]

      // If click is inside the navbar container (or on the toggle button), do nothing
      if (
      path.includes(containerRef.current) ||
      (toggleRef.current && path.includes(toggleRef.current)) ||
      (mobileRef.current && path.includes(mobileRef.current)) ||
      containerRef.current.contains(e.target) ||
      (mobileRef.current && mobileRef.current.contains(e.target))
    ) {
      return
    }

      // otherwise close
      closeMenu()
    }

    document.addEventListener("pointerdown", handler, { passive: true })
    return () => document.removeEventListener("pointerdown", handler)
  }, [isOpen])

  const navDesktopClass = ({ isActive }) =>
    `relative inline-flex items-center justify-center px-6 py-2 text-sm rounded-full transition duration-200 ${
      isActive ? "text-primary bg-white/6 font-semibold shadow-sm scale-105" : "text-gray-300 hover:text-white hover:scale-105"
    }`

  const navMobileClass = ({ isActive }) =>
    `flex items-center gap-3 px-6 py-3 rounded-md transition text-lg ${
      isActive ? "text-primary bg-white/6" : "text-gray-200 hover:text-white hover:bg-white/5"
    }`

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
            setIsOpen(false)
            window.scrollTo({ top: 0, behavior: "smooth" })
          }}
        >
          <img src={assets.title} alt="Site title" className="w-36 h-auto" />
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-4">
          <div className="inline-flex items-center gap-4 bg-black/30 backdrop-blur-md rounded-full px-2 py-1 border border-white/10">
            {navItems.map(({ to, label, Icon }) => (
              <NavLink key={to} to={to} end={to === "/"} className={navDesktopClass}>
                <Icon className="w-4 h-4 opacity-90 mr-1" />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-4">
          <SearchIcon className="hidden md:block w-5 h-5 text-gray-300 cursor-pointer" />
          <UserSection />

          {/* Mobile toggle */}
          <button
            ref={toggleRef}
            aria-label="Toggle menu"
            aria-expanded={isOpen}
            onClick={() => setIsOpen((v) => !v)}
          >
            {isOpen ? <XIcon className="w-6 h-6" /> : <MenuIcon className="w-7 h-7 cursor-pointer" />}
          </button>
        </div>
      </div>

      {/* Mobile menu: lazy mounted only when open */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          {/* Backdrop */}
          <div  className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeMenu} />

          {/* Menu content */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div ref={mobileRef} className="mobile-menu flex flex-col items-center gap-4 w-full px-6">
              {navItems.map(({ to, label, Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/"}
                  onClick={() => {
                    closeMenu()
                    window.scrollTo({ top: 0, behavior: "smooth" })
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
                    closeMenu()
                    window.scrollTo({ top: 0, behavior: "smooth" })
                  }}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-6 py-3 rounded-md transition ${
                      isActive ? "text-primary bg-white/6" : "text-gray-200 hover:text-white hover:bg-white/5"
                    }`
                  }
                >
                  ❤️ Favorites
                </NavLink>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
