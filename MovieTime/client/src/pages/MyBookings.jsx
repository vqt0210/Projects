import { useEffect, useState } from 'react'
import Loading from '../components/Loading'
import BlurCircle from '../components/BlurCircle'
import timeFormat from '../lib/TimeFormat'
import { dateFormat } from '../lib/dateFormat'
import { useAppContext } from '../context/AppContext'
import { Link } from 'react-router-dom'

const MyBookings = () => {
  const currency = import.meta.env.VITE_CURRENCY

  const {axios, getToken, user, image_base_url} = useAppContext()
  const [bookings, setBookings] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  

  const getMyBookings = async() => {
    try {
      const {data} = await axios.get('/api/user/bookings', {
        headers: { Authorization: `Bearer ${await getToken()}`}
      })

      if(data.success){
          setBookings(data.bookings)
      }
    } catch (error) {
      console.log(error)

    }
    setIsLoading(false)
  }

  useEffect(() => {
    if(user){
      getMyBookings()
    }
 
  }, [user])


  return !isLoading ? (
    <div className='relative px-6 md:px-16 lg:px-40 pt-30 md:pt-40 min-h-[80vh]'>
      <BlurCircle top="100px" left="100px" />
      <div>
        <BlurCircle bottom='0px' left="600px" />
      </div>
      <h1 className='text-lg font-semibold mb-4'>My Bookings</h1>

      {bookings.map((item, index) => {
  // 👉 TÍNH TOÁN Ở ĐÂY
  const amount = Number(item?.amount) || 0;
  const isPaid = !!item?.isPaid;

  // Tuỳ BE trả field nào, ưu tiên paymentLink rồi fallback sang payment
  const paymentUrl = item?.paymentLink ?? item?.payment ?? "";
  const hasLink = typeof paymentUrl === "string" && paymentUrl.length > 0;

  const canPay = amount > 0 && !isPaid && hasLink;

  const movie = item?.show?.movie;
  const poster = movie?.poster_path;
  const title = movie?.title || "Unknown Movie";
  const runtime = movie?.runtime;
  const showTime = item?.show?.showDateTime;

  const seats = Array.isArray(item?.bookedSeats) ? item.bookedSeats : [];

  return (
    <div
      key={item?._id || index}
      className='flex flex-col md:flex-row justify-between bg-primary/8 border border-primary/20 rounded-lg mt-4 p-2 max-w-3xl'
    >
      <div className='flex flex-col md:flex-row'>
        {poster ? (
          <img
            src={image_base_url + poster}
            alt={title}
            className='md:max-w-45 aspect-video h-auto object-cover object-bottom rounded'
          />
        ) : (
          <div className='md:max-w-45 aspect-video h-auto object-cover object-bottom rounded bg-gray-300' />
        )}

        <div className='flex flex-col p-4'>
          <p className='text-lg font-semibold'>{title}</p>
          <p className='text-gray-400 text-sm'>
            {runtime != null ? timeFormat(runtime) : 'N/A'}
          </p>
          <p className='text-gray-400 text-sm mt-auto'>
            {showTime ? dateFormat(showTime) : '—'}
          </p>
        </div>
      </div>

      <div className='flex flex-col md:items-end md:text-right justify-between p-4 mb-2'>
        <div className='flex items-center gap-4 mb-3'>
          <p className='text-2xl font-semibold leading-none'>
            {currency}{amount}
          </p>

          {canPay ? (
            // Nếu URL thanh toán là link ngoài (Stripe,...), dùng <a>.
            <a
              href={paymentUrl}
              target='_blank'
              rel='noreferrer'
              className='inline-flex items-center justify-center h-9 min-w-[110px] px-5
             rounded-full bg-primary text-sm font-medium leading-none
             text-center whitespace-nowrap'
            >
              Pay Now
            </a>
          ) : (
            <span className='min-w-[100px] px-4 py-1.5 text-sm rounded-full font-medium bg-green-500/20 text-green-300 text-center'>
              {amount === 0 ? 'Free Booking' : (isPaid ? 'Paid' : 'Pending')}
            </span>
          )}
        </div>

        <div className='text-sm'>
          <p><span className='text-gray-400'>Total Tickets: </span>{seats.length}</p>
          <p><span className='text-gray-400'>Seat Number: </span>{seats.join(', ')}</p>
        </div>
      </div>
    </div>
  );
})}

    </div>
  ) : <Loading />
}

export default MyBookings
