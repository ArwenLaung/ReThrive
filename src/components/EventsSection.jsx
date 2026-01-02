import React, { useRef, useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  CalendarDays,
} from "lucide-react";
import { Link } from "react-router-dom";
import { EVENTS_DATA } from "../constants";

const EventsSection = () => {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, []);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 340; // card width + gap
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
      // Allow time for scroll to complete before checking again
      setTimeout(checkScroll, 300);
    }
  };

  return (
    <section id="events" className="py-16 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <h2 className="text-3xl font-extrabold text-center text-brand-darkText mb-12 relative inline-block left-1/2 transform -translate-x-1/2">
          <span className="relative z-10 text-brand-purple">Events in USM</span>
          <span className="absolute bottom-1 left-0 w-full h-3 bg-brand-lightPurple -z-0 opacity-60"></span>
        </h2>

        <div className="relative flex items-center">
          {/* Left Arrow */}
          <button
            onClick={() => scroll("left")}
            className={`absolute -left-2 md:-left-8 z-10 p-2 text-brand-brown hover:text-[#c2884a] transition-all transform hover:scale-125 ${
              !canScrollLeft
                ? "opacity-30 cursor-not-allowed"
                : "cursor-pointer"
            }`}
            disabled={!canScrollLeft}
            aria-label="Previous events"
          >
            <ChevronLeft size={48} strokeWidth={2.5} />
          </button>

          {/* Carousel Container */}
          <div
            ref={scrollRef}
            onScroll={checkScroll}
            className="flex overflow-x-auto gap-6 py-8 px-2 scroll-smooth snap-x snap-mandatory hide-scrollbar"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {EVENTS_DATA.map((event) => (
              <div
                key={event.id}
                className="flex-shrink-0 w-72 md:w-80 bg-white rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition-shadow duration-300 p-4 snap-center border border-gray-50"
              >
                <div className="w-full h-48 rounded-2xl overflow-hidden mb-5 bg-gray-100">
                  <img
                    src={event.image}
                    alt={event.title}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  />
                </div>

                <div className="px-2 pb-2 space-y-3">
                  <h3 className="font-bold text-xl text-brand-darkText">
                    {event.title}
                  </h3>
                  <p className="text-sm text-brand-darkText/70 flex items-center gap-2">
                    <CalendarDays size={16} className="text-brand-purple" />
                    {event.date}
                  </p>

                  <Link
                    to={`/events/${event.id}`}
                    className="inline-flex items-center text-brand-purple font-bold text-sm hover:text-brand-green transition-colors group"
                  >
                    More Info
                    <ArrowRight
                      size={16}
                      className="ml-2 transform group-hover:translate-x-1 transition-transform"
                    />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Right Arrow */}
          <button
            onClick={() => scroll("right")}
            className={`absolute -right-2 md:-right-8 z-10 p-2 text-brand-brown hover:text-[#c2884a] transition-all transform hover:scale-125 ${
              !canScrollRight
                ? "opacity-30 cursor-not-allowed"
                : "cursor-pointer"
            }`}
            disabled={!canScrollRight}
            aria-label="Next events"
          >
            <ChevronRight size={48} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </section>
  );
};

export default EventsSection;
