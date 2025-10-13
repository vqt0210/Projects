import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

const DateSelect = ({ dateTime, id, onExpired }) => {
  const navigate = useNavigate()
  const [selected, setSelected] = useState(null)

  const now = new Date()
  const availableDates = Object.keys(dateTime).filter(date => new Date(date) >= now)
  const isExpired = availableDates.length === 0

  // Thông báo cho MovieDetails nếu hết suất chiếu
  useEffect(() => {
    if (onExpired) onExpired(isExpired)
  }, [isExpired, onExpired])


  const onBookHandler = () => {
    if (!selected) return toast('Please select a date')
    navigate(`/movies/${id}/${selected}`)
    scrollTo(0, 0)
  }

  if (isExpired) {
    return (
      <div className="p-8 bg-primary/10 border border-primary/20 rounded-lg text-center">
        <p className="text-gray-400 font-medium text-lg">No Showtime Available</p>
      </div>
    )
  }

  return (
    <div className='pt-20'>
      <div className='p-8 bg-primary/10 border border-primary/20 rounded-lg'>
        <p className='text-xl font-semibold mb-4'>Choose Date</p>
        <div className='flex items-center gap-6'>
          <div className='overflow-x-auto w-[500px] mx-10 scrollbar-thin pb-2'>
            <div className='flex gap-3 min-w-max'>
              {availableDates.map((date) => (
                <button
                  key={date}
                  onClick={() => setSelected(date)}
                  className={`min-w-[64px] flex flex-col items-center border rounded p-2 ${
                    selected === date
                      ? 'bg-primary text-white border-black'
                      : 'border-primary/60'
                  }`}
                >
                  <span>{new Date(date).getDate()}</span>
                  <span>{new Date(date).toLocaleString('en-US', { month: 'short' })}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={onBookHandler}
            className="whitespace-nowrap bg-primary text-white px-6 py-3 rounded hover:bg-primary/90 transition-all cursor-pointer shrink-0"
          >
            Book Now
          </button>
        </div>
      </div>
    </div>
  )
}

export default DateSelect
