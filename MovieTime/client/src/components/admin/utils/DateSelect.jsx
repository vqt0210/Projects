import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const DateSelect = ({ dateTime, id, onExpired }) => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);

  const now = new Date();
  const availableDates = Object.keys(dateTime).filter((date) => {
    // nếu trong ngày đó có ít nhất 1 suất còn sau "bây giờ" (local time)
    return dateTime[date].some((show) => new Date(show.time) > new Date());
  });
  const isExpired = availableDates.length === 0;

  // SỬA: CHỈ CẦN DÙNG useEffect NÀY LÀ ĐỦ
  // Nó sẽ đảm bảo onExpired được gọi sau khi render
  useEffect(() => {
    if (onExpired) onExpired(isExpired);
  }, [isExpired, onExpired]);

  const onBookHandler = () => {
    if (!selected) return toast("Please select a date");
    navigate(`/movies/${id}/${selected}`);
    scrollTo(0, 0);
  };

  if (isExpired) {
    return null; 
  }

  useEffect(() => {
    if (!selected && availableDates.length > 0) {
        setSelected(availableDates[0]);
    }
  }, [availableDates, selected]);
  

  return (
    <div className="pt-20">
      <div className="p-8 border rounded-lg bg-primary/10 border-primary/20">
        <p className="mb-4 text-xl font-semibold">Choose Date</p>
        <div className="flex items-center gap-6">
          <div className="overflow-x-auto w-[500px] mx-10 scrollbar-thin pb-2">
            <div className="flex gap-3 min-w-max">
              {availableDates.map((date) => (
                <button
                  key={date}
                  onClick={() => setSelected(date)}
                  className={`min-w-[64px] flex flex-col items-center border rounded p-2 cursor-pointer ${
                    selected === date
                      ? "bg-primary text-white border-black"
                      : "border-primary/60"
                  }`}
                >
                  <span>{new Date(date).getDate()}</span>
                  <span>
                    {new Date(date).toLocaleString("en-US", { month: "short" })}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={onBookHandler}
            className="px-6 py-3 text-white transition-all rounded cursor-pointer whitespace-nowrap bg-primary hover:bg-primary/90 shrink-0"
          >
            Book Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default DateSelect;