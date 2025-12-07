import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Hero from "../components/Hero";
import StatsSection from "../components/StatsSection";
import EventsSection from "../components/EventsSection";

const Home = () => {
  const location = useLocation();

  useEffect(() => {
    // Handle scrolling to sections when navigating from header
    // This is a fallback in case the header's setTimeout doesn't work
    const timer = setTimeout(() => {
      const hash = location.hash;
      if (hash) {
        const sectionId = hash.substring(1); // Remove the #
        const section = document.getElementById(sectionId);
        if (section) {
          section.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [location]);

  return (
    <div className="min-h-screen bg-white">
      <main>
        <Hero />
        <StatsSection />
        <EventsSection />
      </main>
    </div>
  );
};

export default Home;
