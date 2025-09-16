import { useState } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

const DateSelect = ({ dateTime, id }) => {
  const navigate = useNavigate()
  const [selected, setSelected] = useState(null)

  const onBookHandler = () => {
    if (!selected) return toast('Please select a date')
    navigate(`/movies/${id}/${selected}`); scrollTo(0,0)
  }

  return (
    <div id='dateSelect' className='pt-20'>
      <div className='p-8 bg-primary/10 border border-primary/20 rounded-lg'>
        <p className='text-xl font-semibold mb-4'>Choose Date</p>

        {/* Scrollable row */}
        <div className='flex items-center gap-6'>
        <div className='overflow-x-auto w-[500px] mx-10 scrollbar-thin pb-2'>
          <div className='flex gap-3 min-w-max'>
            {Object.keys(dateTime).map((date) => (
              <button
                key={date}
                onClick={() => setSelected(date)}
                className={`min-w-[64px] flex flex-col items-center border rounded p-2 ${
                  selected === date ? 'bg-primary text-white border-black' : 'border-primary/60'
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
