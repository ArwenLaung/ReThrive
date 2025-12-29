import React from "react";
import Hero from "../components/Hero";
import StatsSection from "../components/StatsSection";
import EventsSection from "../components/EventsSection";

const Home = () => {
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
