import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  CalendarIcon,
  ClockIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { assets } from "@/assets/assets";

const slides = [
  {
    id: 1,
    title: "Demon Slayer: Infinity Castle",
    year: "2018",
    duration: "2h 35m",
    genres: "Action | Adventure | Animation",
    desc: "The epic first installment of a concluding trilogy, where Tanjiro and the Hashira face Muzan in the Infinity Castle.",
    bg: "/assets/demonslayer.jpg",
    logo: assets.demonIcon,
  },
  {
    id: 2,
    title: "Jujutsu Kaisen 0",
    year: "2021",
    duration: "1h 52m",
    genres: "Action | Supernatural | Thriller",
    desc: "Yuta Okkotsu joins Jujutsu High to control a powerful curse — and uncovers a dark secret.",
    bg: "/assets/jujutsuBackGround.jpg",
    logo: assets.jujutsuIcon,
  },
  {
    id: 3,
    title: "Attack on Titan: The Final Season",
    year: "2023",
    duration: "3h 00m",
    genres: "Action | Drama | Fantasy",
    desc: "Eren Yeager leads the Rumbling, and humanity's fate hangs in balance in this breathtaking finale.",
    bg: "/assets/aotBackGround.jpg",
    logo: assets.aotIcon,
  },
  {
    id: 4,
    title: "The Amazing Spider-Man 2",
    year: "2014",
    duration: "2h 22m",
    genres: "Action | Adventure | Sci-Fi",
    desc: "Peter Parker faces a powerful new foe, Electro, while struggling with the secrets surrounding his parents and his destiny as Spider-Man.",
    bg: "/assets/spidermanBackGround.png",
    logo: assets.marvelLogo,
  },
];

export default function HeroSection() {
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();
  const timerRef = useRef(null);

  // Auto slide every 30s, reset when user clicks
  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 1000000);
  };

  useEffect(() => {
    resetTimer();
    return () => clearInterval(timerRef.current);
  }, []);

  const nextSlide = () => {
    setCurrent((prev) => (prev + 1) % slides.length);
    resetTimer();
  };

  const prevSlide = () => {
    setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
    resetTimer();
  };

  const goToSlide = (i) => {
    setCurrent(i);
    resetTimer();
  };

  const slide = slides[current];

  // Font riêng cho từng phim
  const fontMap = {
    "Demon Slayer": "BloodCrow",
    "Jujutsu Kaisen": "JJKFont",
    "Attack on Titan": "AOTFont",
    "Spider-Man": "SpiderFont",
  };

  const matchedFont =
    Object.entries(fontMap).find(([key]) => slide.title.includes(key))?.[1] ||
    "Outfit";

  return (
    <div className="relative h-screen overflow-hidden hero-section select-text">
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.id}
          className="absolute inset-0 bg-cover bg-center flex flex-col items-start justify-center px-6 md:px-16 lg:px-36"
          style={{ backgroundImage: `url(${slide.bg})` }}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 1 }}
        >
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>

          {/* Content */}
          <div className="relative z-10 text-white max-w-xl">
            {/* Logo riêng */}
            {slide.logo && (
              <div className="relative inline-block mb-3 select-none">
                <img
                  src={slide.logo}
                  alt={slide.title}
                  className={`drop-shadow-[0_3px_6px_rgba(0,0,0,0.6)] select-none object-contain ${
                    slide.title.includes("Spider-Man")
                      ? "h-14 md:h-20"
                      : "h-20 md:h-32"
                  }`}
                />
              </div>
            )}

            {/* Tiêu đề — mỗi phim 1 font riêng */}
            <h1
              style={{ fontFamily: matchedFont }}
              className={`leading-tight font-semibold mb-3 ${
                slide.title.includes("Demon Slayer")
                  ? "bloodcrow-fill"
                  : "text-white"
              } ${
                slide.title.includes("Spider-Man")
                  ? "text-3xl md:text-[50px]"
                  : slide.title.includes("Attack on Titan")
                  ? "text-5xl md:text-[60px]"
                  : "text-5xl md:text-[70px]"
              }`}
            >
              {slide.title}
            </h1>

            {/* Thông tin phim */}
            <div className="flex items-center flex-wrap gap-3 text-gray-300 mb-4 text-sm md:text-base">
              <span>{slide.genres}</span>
              <div className="flex items-center gap-1">
                <CalendarIcon className="w-4 h-4" /> {slide.year}
              </div>
              <div className="flex items-center gap-1">
                <ClockIcon className="w-4 h-4" /> {slide.duration}
              </div>
            </div>

            {/* 🔹 Mô tả phim */}
            <p className="text-gray-300 mb-6 max-w-md">{slide.desc}</p>

            {/* 🔹 Nút Explore */}
            <button
              onClick={() => navigate("/movies")}
              className="flex items-center gap-2 px-6 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-full font-medium cursor-pointer"
            >
              Explore <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation arrows */}
      <div className="absolute inset-0 flex justify-between items-center px-6 md:px-12">
        <button
          onClick={prevSlide}
          className="p-2 bg-black/30 hover:bg-black/50 rounded-full transition cursor-pointer"
        >
          <ChevronLeft className="w-7 h-7 text-white" />
        </button>
        <button
          onClick={nextSlide}
          className="p-2 bg-black/30 hover:bg-black/50 rounded-full transition cursor-pointer"
        >
          <ChevronRight className="w-7 h-7 text-white" />
        </button>
      </div>

      {/* Dots indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-20">
        {slides.map((_, i) => (
          <div
            key={i}
            onClick={() => goToSlide(i)}
            className={`w-3 h-3 rounded-full cursor-pointer transition-all ${
              current === i
                ? "bg-primary scale-125"
                : "bg-white/40 hover:bg-white/70"
            }`}
          ></div>
        ))}
      </div>
    </div>
  );
}
