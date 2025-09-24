import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { assets } from '../assets/assets'
import { MenuIcon, SearchIcon, XIcon } from 'lucide-react'
import UserSection from './UserSection'
import { useAppContext } from '../context/AppContext'

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false)

  const openMenu = useCallback(() => setIsOpen(true), [])
  const closeMenu = useCallback(() => setIsOpen(false), [])

  const { favoriteMovies} = useAppContext()

  return (
    <div className='fixed top-0 left-0 z-50 w-full flex items-center justify-between px-6 md:px-16 lg:px-36 py-5'>
      {/* Logo */}
      <Link to='/' className='max-md:flex-1'>
        <img src={assets.title} alt="title" className='w-36 h-auto' />
      </Link>

      {/* Menu (mobile menu is controlled by isOpen) */}
      <div
        className={`max-md:absolute max-md:top-0 max-md:left-0 max-md:font-medium max-md:text-lg 
        z-50 flex flex-col md:flex-row items-center max-md:justify-center gap-8 min-md:px-8 py-3 
        max-md:h-screen min-md:rounded-full backdrop-blur bg-black/70 md:bg-white/10 
        md:border border-gray-300/20 overflow-hidden transition-[width] duration-300 
        ${isOpen ? 'max-md:w-full' : 'max-md:w-0'}`}
      >
        {/* XIcon chỉ được mount khi menu mở */}
        {isOpen && (
          <>
            {console.log('🎯 XIcon render')}
            <XIcon
              className='md:hidden absolute top-6 right-6 w-6 h-6 cursor-pointer'
              onClick={closeMenu}
            />
          </>
        )}

        {/* Links (vẫn còn trong DOM; tuỳ bạn có muốn mount/unmount links theo isOpen hay không) */}
        <Link onClick={() => { scrollTo(0, 0); closeMenu(); }} to='/'>Home</Link>
        <Link onClick={() => { scrollTo(0, 0); closeMenu(); }} to='/movies'>Movies</Link>
        <Link onClick={() => { scrollTo(0, 0); closeMenu(); }} to='/'>Theaters</Link>
        <Link onClick={() => { scrollTo(0, 0); closeMenu(); }} to='/'>Releases</Link>
        {favoriteMovies?.length > 0 && (<Link onClick={() => { scrollTo(0, 0); closeMenu(); }} to='/favorite'>Favorites</Link>
)}
      </div>

      {/* Right Section */}
      <div className='flex items-center gap-8'>
        <SearchIcon className='max-md:hidden w-6 h-10 cursor-pointer' />
        <UserSection />
      </div>

      {/* MenuIcon chỉ được mount khi menu đóng */}
      {!isOpen && (() => {
        console.log('🎯 MenuIcon render')
        return (
          <MenuIcon
            className='max-md:ml-4 md:hidden w-8 h-8 cursor-pointer'
            onClick={openMenu}
          />
        )
      })()}
    </div>
  )
}

export default Navbar
