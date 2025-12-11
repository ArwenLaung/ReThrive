import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, Clock, MapPin, Leaf } from "lucide-react";
<<<<<<<< HEAD:src/pages/EventDetail.jsx
import { EVENTS_DATA } from "../constants";
========
import { EVENTS_DATA } from "../../../constants";
>>>>>>>> bf19cce5807cbb058d9a3e8848635c6fb3ef9aba:src/users/pages/EventDetail.jsx

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const event = EVENTS_DATA.find((item) => item.id === Number(id));

  if (!event) {
    return (
      <div className="min-h-screen bg-white">
<<<<<<<< HEAD:src/pages/EventDetail.jsx
        <main className="max-w-3xl mx-auto px-4 py-16 text-center">
========
        <main className="max-w-3xl mx-auto px-4 py-16 text-center" style={{ paddingTop: '70px' }}>
>>>>>>>> bf19cce5807cbb058d9a3e8848635c6fb3ef9aba:src/users/pages/EventDetail.jsx
          <p className="text-2xl font-semibold text-brand-darkText mb-6">
            That event moved or no longer exists.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-brand-purple font-semibold hover:text-brand-green transition-colors"
          >
            <ArrowLeft size={18} />
            Back to home
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
<<<<<<<< HEAD:src/pages/EventDetail.jsx
      <main className="max-w-5xl mt-7 mx-auto px-4 py-12">
========
      {/* 🟢 CRITICAL FIX #1: Add paddingTop to clear the 70px fixed header 🟢 */}
      <main className="max-w-5xl mx-auto px-4 py-12" style={{ paddingTop: '70px' }}>
>>>>>>>> bf19cce5807cbb058d9a3e8848635c6fb3ef9aba:src/users/pages/EventDetail.jsx
        <Link
          to="/#events" // Target the anchor link to trigger the ScrollHandler
          className="inline-flex items-center gap-2 text-brand-purple font-semibold hover:text-brand-green transition-colors"
        >
          <ArrowLeft size={18} />
          Back to events
        </Link>

        <section className="mt-8 bg-brand-cream rounded-3xl shadow-[0_12px_40px_rgba(124,58,237,0.08)] overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="p-8 flex flex-col gap-6">
              <div>
                <p className="text-sm uppercase tracking-wide text-brand-darkText/60 font-semibold">
                  Upcoming Event
                </p>
                <h1 className="text-3xl font-black text-brand-darkText mt-2">
                  {event.title}
                </h1>
              </div>

              <p className="text-brand-darkText/80 leading-relaxed">
                {event.description}
              </p>

              <div className="space-y-4">
                <div className="flex items-center gap-3 text-brand-darkText">
                  <CalendarDays className="text-brand-purple" />
                  <span className="font-semibold">{event.date}</span>
                </div>
                <div className="flex items-center gap-3 text-brand-darkText">
                  <Clock className="text-brand-purple" />
                  <span className="font-semibold">{event.time}</span>
                </div>
                <div className="flex items-center gap-3 text-brand-darkText">
                  <MapPin className="text-brand-purple" />
                  <span className="font-semibold">{event.location}</span>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-brand-lightPurple/40">
                <p className="text-sm text-brand-darkText/70 font-semibold mb-2 flex items-center gap-2">
                  <Leaf size={16} className="text-brand-green" />
                  EcoPoints you can unlock
                </p>
                <p className="text-4xl font-black text-brand-green">
                  {event.ecoPoints}
                </p>
              </div>

              <button
                onClick={() => navigate(`/register/${event.id}`)}
                className="inline-flex items-center justify-center rounded-2xl bg-brand-purple text-white font-semibold py-3 shadow-md hover:bg-brand-green transition-colors"
              >
                Register for this event
              </button>
            </div>

            <div className="relative min-h-[320px]">
              <img
                src={event.image}
                alt={event.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 left-4 right-4 bg-white/90 rounded-2xl p-4 shadow-lg">
                <p className="text-xs font-semibold text-brand-darkText/80 uppercase tracking-wide">
                  Eco Highlights
                </p>
                <ul className="mt-2 space-y-1 text-sm text-brand-darkText">
                  {event.ecoHighlights.map((highlight) => (
                    <li key={highlight} className="flex items-center gap-2">
                      <span className="text-brand-green font-bold">•</span>
                      {highlight}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default EventDetail;