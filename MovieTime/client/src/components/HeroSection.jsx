import { assets } from '../assets/assets'
import {  ArrowRight, CalendarIcon, ClockIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const HeroSection = () => {

  const navigate = useNavigate() //Hàm chuyển trang
  return (
    <div className='flex flex-col items-start justify-center gap-4 px-6 md:px-16 lg:px-36 bg-[url("/assets/demonslayer.jpg")] bg-cover bg-center h-screen'>
      <img src={assets.demonIcon} alt="" className=' flex max-h-40 lg:h-50 mt-20' />

      <h1 style={{ fontFamily: 'BloodCrow' }} className='text-5xl md:text-[70px] md:leading-18 font bold max-w-xl '>Demon Slayer Infinity Castle</h1>

      <div className='flex items-center gap-4 text-gray-300'>
        <span>Action | Adventure | Animation</span>
        <div className='flex items-center gap-1'>
        <CalendarIcon className='w-4.5 h-4.5' /> 2018
        </div>
        <div className='flex items-center gap-1'>
        <ClockIcon className='w-4.5 h-4.5' /> 2h 35m
        </div>
      </div>
      <p className='max-w-md text-gray-300'>The epic first installment of a concluding trilogy, where Tanjiro and the Hashira are plunged into the perilous Infinity Castle to face Muzan and the Upper Moons in a battle that blends emotional depth with visual spectacle.</p>
      <button onClick={() => navigate('/movies')} className='flex items-center gap-1 px-6 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-full font-medium cursor-pointer'>
        Explore 
        <ArrowRight className='w-5 h-5'/>
      </button>
    </div>
  )
}

export default HeroSection
