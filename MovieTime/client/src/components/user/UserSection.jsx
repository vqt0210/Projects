import { useClerk, UserButton, useUser } from '@clerk/clerk-react'
import { TicketPlus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { memo } from 'react'

const UserSection = () => {
  const { user } = useUser()
  const { openSignIn } = useClerk()
  const navigate = useNavigate()


  if (!user) {
    return (
      <button
        onClick={openSignIn}
        className='px-4 py-1 sm:px-7 sm:py-2 bg-primary hover:bg-primary-dull transition rounded-full font-medium cursor-pointer'
      >
        Login
      </button>
    )
  }

  return (
    <UserButton>
      <UserButton.MenuItems>
        <UserButton.Action
          label="My Bookings"
          labelIcon={<TicketPlus width={15} />}
          onClick={() => navigate('/my-bookings')}
        />
      </UserButton.MenuItems>
    </UserButton>
  )
}

// memo để tránh render lại khi props không đổi
export default memo(UserSection)
