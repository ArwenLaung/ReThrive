import React from "react";
import Header from "../components/Header";
import Hero from "../components/Hero";
import StatsSection from "../components/StatsSection";
import EventsSection from "../components/EventsSection";

const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        <Hero />
        <StatsSection />
        <EventsSection />
      </main>
      <footer className="bg-brand-lightPurple/30 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-brand-darkText opacity-60 text-sm">
          <p>© 2025 ReThrive @USM. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
