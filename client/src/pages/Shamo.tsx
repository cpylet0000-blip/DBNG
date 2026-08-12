import { useMemo, useState } from "react";
import { MessageCircle, Users } from "lucide-react";

const Shamo = () => {
  const [activeSlide, setActiveSlide] = useState(0);

  const telegramGroup = import.meta.env.VITE_TELEGRAM_GROUP_USERNAME || "";
  const telegramSupport = import.meta.env.VITE_SUPPORT_URL || "";
  const groupUrl = telegramGroup
    ? `https://t.me/${telegramGroup}`
    : "https://t.me/";
  const supportUrl = telegramSupport
    ? `https://t.me/${telegramSupport}`
    : "https://t.me/";

  const slides = useMemo(
    () => [
      {
        image: "/advertisement/ad1.jpg",
      },
      {
        image: "/advertisement/ad2.jpg",
      },
      {
        image: "/advertisement/ad3.jpg",
      },
    ],
    [],
  );

  return (
    <div className="w-full flex flex-col  justify-center mt-10 ">
      <div className="">
        <div className="">
          <div className="">
            <img
              src={slides[activeSlide].image}
              className="h-[30vh] w-full object-cover rounded-md border border-blue-400/20"
            />
          </div>

          <div className="mt-2 flex items-center justify-center gap-2">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveSlide(index)}
                className={`h-2.5 w-2.5 rounded-full transition ${
                  index === activeSlide ? "bg-blue-400" : "bg-slate-600"
                }`}
                aria-label={`Slide ${index + 1}`}
              />
            ))}
          </div>

          <div className="mt-4 flex  gap-3 sm:flex-row">
            <a
              href={groupUrl}
              target="_blank"
              rel="noreferrer"
              className="flex-1 rounded-xl border border-blue-400/80 bg-[#111111] px-3 py-2.5 text-center text-sm font-semibold text-slate-100 transition hover:border-blue-400 hover:text-blue-300"
            >
              <div className="flex items-center justify-center gap-2 text-[13px] text-blue-400">
                <Users size={13} />
                Telegram Group
              </div>
            </a>
            <a
              href={supportUrl}
              target="_blank"
              rel="noreferrer"
              className="flex-1 rounded-xl border border-blue-400/80 bg-[#111111] px-3 py-2.5 text-center text-sm font-semibold text-slate-100 transition hover:border-blue-400 hover:text-blue-300"
            >
              <div className="flex items-center justify-center gap-2 text-[13px]">
                <MessageCircle size={13} />
                Telegram Support
              </div>
            </a>
          </div>

          <div className="mt-6">
            <div className="mb-2 text-base font-semibold text-white/95 text-center">
              ✨ የቴሌግራም ግሩፓችንን በመቀላቀል የሚገኙ ጥቅሞች
            </div>
            <div className="flex items-center justify-center">
              <ul className="space-y-1 pl-4 text-slate-300 text-sm">
                <li>🎁 የዕለታዊ የሻሞ ኮድ ቅድሚያ ማግኘት</li>
                <li>🔥 ስለ አዳዲስ ሽልማቶች ፈጣን መረጃ</li>
                <li>⚡ ለጥያቄዎችዎ ፈጣን ምላሽ እና ድጋፍ</li>
                <li>🎮 የማሸነፍ እድልዎን በየቀኑ ያሳድጉ</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Shamo;
