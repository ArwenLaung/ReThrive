import React from "react";
import Hero from "../components/Hero";
import StatsSection from "../components/StatsSection";
import EventsSection from "../components/EventsSection";

const Home = ({ aboutRef, eventsRef }) => {
  return (
    <>
      <div ref={aboutRef} id="about"> {/* This section is now observable */}
        <Hero />
        <StatsSection />
      </div>
      <div ref={eventsRef} id="events"> {/* This section is now observable */}
        <EventsSection />
      </div>
    </>
  );
};

export default Home;