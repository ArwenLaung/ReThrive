import Hero from "../components/Hero";
import StatsSection from "../components/StatsSection";
import EventsSection from "../components/EventsSection";

const Home = ({ aboutRef, eventsRef }) => {
  return (
    <>
      <div ref={aboutRef} id="about">
        <Hero />
        <StatsSection />
      </div>

      <div ref={eventsRef} id="events">
        <EventsSection />
      </div>
    </>
  );
};

export default Home;
