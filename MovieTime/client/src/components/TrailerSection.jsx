import { useState } from 'react'
import { dummyTrailers } from '../assets/assets';
import BlurCircle from './BlurCircle';
import { PlayCircleIcon } from 'lucide-react';
import { Film } from 'lucide-react'
const TrailerSection = () => {

  const [current, setCurrentTrailer] = useState(dummyTrailers[1])
  return (
    <div className='px-6 md:px-16 lg:px-24 xl:px-44 py-20 overflow-hidden'>
      <div className="max-w-[960px] mx-auto text-center">
      <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl backdrop-blur-sm bg-white/5">
        <Film className="w-6 h-6 text-primary" />
        <h3 className="text-lg md:text-2xl font-semibold text-gray-100">
          Trailers
        </h3>
      </div>

      {/* animated underline */}
      <div className="mt-3 h-0.5 w-full max-w-[220px] bg-gray-700/40 mx-auto relative">
        <div className="absolute left-0 top-0 h-0.5 w-0 bg-primary transition-all duration-500 group-hover:w-full" />
      </div>
    </div>


      <div className="relative mt-6 max-w-5xl mx-auto aspect-video">
      <BlurCircle top="-100px" right="-100px" />
      <iframe
      className="absolute inset-0 w-full h-full rounded-lg"
      src={`https://www.youtube.com/embed/${current.id}?rel=0&modestbranding=1`}
      title="YouTube video player"
      
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
      />
      
      
    </div>
{/* Thumbnails */}
      <div className='group grid grid-cols-4 gap-4 md:gap-8 mt-8 max-w-3xl mx-auto'>
        {dummyTrailers.map((t) => (
          <div key={t.id} className='relative group-hover:not-hover:opacity-50 hover:-translate-y-1 duration-300 transition max-md:h-60 md:max-h-60 cursor-pointer' onClick={()=> setCurrentTrailer(t)}>

            <img src={t.image} alt="trailer" className='rounded-lg w-full h-full object-cover brightness-75' />
            <PlayCircleIcon strokeWidth={1.6} className='absolute top-1/2 left-1/2 w-5 md:w-8 h-5 md:h-12 transform -translate-x-1/2 -translate-y-1/2'/>
          </div>
        ))}
      </div>
      
    </div>
  )
}

export default TrailerSection;
