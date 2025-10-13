import { useUser } from "@clerk/clerk-react";
import { assets } from '@/assets/assets'
import { LayoutDashboardIcon, ListCollapseIcon, ListIcon, PlusSquareIcon, UsersIcon } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const AdminSideBar = () => {

  const { user, isLoaded } = useUser();

  const adminNavLinks = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboardIcon },
    { name: 'Add Shows', path: '/admin/add-shows', icon: PlusSquareIcon },
    { name: 'List Shows', path: '/admin/list-shows', icon: ListIcon },
    { name: 'List Bookings', path: '/admin/list-bookings', icon: ListCollapseIcon },
    { name: 'Users', path: '/admin/users', icon: UsersIcon },

  ]

  if (!isLoaded) {
    return (
      <div className="flex justify-center items-center h-full text-gray-400">
        Loading sidebar...
      </div>
    );
  }
   // Kiểm tra user có tồn tại
  if (!user) {
    return (
      <div className="flex justify-center items-center h-full text-red-400">
        User not found
      </div>
    );
  }

  return (
    <div className='h-[calc(100vh-64px)] md:flex flex flex-col items-center pt-8 max-w-13 md:max-w-60 w-full border-r border-gray-300/20 text-sm'>
      <img
        className="h-9 md:h-14 w-9 md:w-14 rounded-full mx-auto"
        src={user?.imageUrl || assets.profile_pic}
        alt="sidebar"
      />
      <p className='mt-2 text-base max-md:hidden'>{user.firstName} {user.lastName}</p>
      <div className='w-full'>
        {adminNavLinks.map(link => (
      <NavLink key={link.path} to={link.path} end
      >
        {({ isActive }) => (
          <div
            className={`relative flex items-center gap-2 w-full py-2.5 pl-4 md:pl-10 first:mt-6 ${isActive ? 'bg-primary/15 text-primary' : 'text-gray-400'}`}
          >
            <link.icon className="w-5 h-5" />
            <p className="hidden md:block">{link.name}</p>
            <span className={`absolute right-0 w-1.5 h-10 rounded-l ${isActive ? 'bg-primary' : ''}`} />
          </div>
        )}
      </NavLink>
        ))}


      </div>
    </div>
  )
}

export default AdminSideBar
