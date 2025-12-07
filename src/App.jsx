import { BrowserRouter, Routes, Route, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import Header from "./users/components/Header.jsx";
import Login from "./users/pages/Login.jsx";
import MyRewards from "./users/pages/MyRewards.jsx";
import Home from "./users/pages/Home.jsx";
import EventDetail from "./users/pages/EventDetail.jsx";
import EventRegistration from "./users/pages/EventRegistration.jsx";
import Marketplace from "./users/pages/Marketplace.jsx";
import Donation from "./users/pages/Donation.jsx";
import Footer from "./users/components/Footer.jsx";
import { ScrollContext } from "./users/context/ScrollContext.jsx";
import { useRef, useState, useEffect, useLayoutEffect } from "react";

// --- ScrollHandler component definition ---
const ScrollHandler = ({ aboutRef, eventsRef, scrollTarget, setScrollTarget, setActiveLink }) => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // 1. FIX PERSISTENT SCROLL (Aggressive Scroll Reset)
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    if (location.pathname !== "/") {
      if (scrollTarget.target !== null) {
        setScrollTarget({ target: null });
      }
    }
  }, [location.pathname, scrollTarget.target, setScrollTarget]);

  // 2. SCROLL SPY FIX (Intersection Observer - COMBINED/SIMPLIFIED)
  useEffect(() => {
    const urlScrollTarget = searchParams.get('scroll_to');

    // Skip observer run if not on homepage OR if a URL scroll is pending
    if (location.pathname !== "/" || urlScrollTarget) return;

    // Use a single observer instance for both elements
    const observer = new IntersectionObserver(
      (entries) => {
        if (scrollTarget.target !== null) return; // Ignore updates during click-scroll

        // Check which element is intersecting the center of the viewport
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const linkName = entry.target.id === 'about' ? 'About' : 'Events';
            setActiveLink({ group: "scroll", link: linkName });
          }
        });
      },
      {
        // rootMargin: Triggers intersection only when the element crosses the middle 60% of the viewport.
        // This is a reliable way to determine the active section without complex logic.
        rootMargin: '-20% 0px -20% 0px',
        threshold: 0,
      }
    );

    // Ensure the refs exist before observing
    if (eventsRef.current && eventsRef.current.id === 'events') observer.observe(eventsRef.current);
    if (aboutRef.current && aboutRef.current.id === 'about') observer.observe(aboutRef.current);

    return () => {
      observer.disconnect();
    };

  }, [location.pathname, scrollTarget.target, aboutRef, eventsRef, setActiveLink, searchParams]);


  // 3. INTERNAL CLICKS
  useEffect(() => {
    if (location.pathname !== "/" || !scrollTarget.target) return;

    const target = scrollTarget.target.toLowerCase();
    let timeoutId;

    if (target === "about") {
      setActiveLink({ group: "scroll", link: "About" });
      aboutRef.current?.scrollIntoView({ behavior: "smooth" });
    } else if (target === "events") {
      setActiveLink({ group: "scroll", link: "Events" });
      eventsRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    const scrollDuration = 700;
    timeoutId = setTimeout(() => {
      setScrollTarget({ target: null });
    }, scrollDuration);

    return () => clearTimeout(timeoutId);

  }, [scrollTarget.target, location.pathname, aboutRef, eventsRef, setActiveLink, setScrollTarget]);

  // 4. EXTERNAL URL CHANGES
  useEffect(() => {
    const hashTarget = location.hash.substring(1);
    const urlScrollTarget = searchParams.get('scroll_to');

    if (location.pathname !== "/" || (!hashTarget && !urlScrollTarget)) return;

    const target = urlScrollTarget || hashTarget;

    if (target === "events") {
      eventsRef.current?.scrollIntoView({ behavior: "smooth" });
    } else if (target === "about") {
      aboutRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    if (urlScrollTarget) {
      setSearchParams({}, { replace: true });
    }

    if (target === 'events') {
      setActiveLink({ group: "scroll", link: "Events" });
    } else if (target === 'about') {
      setActiveLink({ group: "scroll", link: "About" });
    }

    setScrollTarget({ target: null });

  }, [location.pathname, location.hash, searchParams, setSearchParams, aboutRef, eventsRef, setActiveLink, setScrollTarget]);

  return null;
};
// --- End ScrollHandler component definition ---


// 🟢 NEW Component to handle Router hooks and conditional rendering 🟢
const AppContent = ({ aboutRef, eventsRef, activeLink, setActiveLink, scrollTarget, setScrollTarget }) => {

  // 💥 CRITICAL FIX: useLocation() is now safely inside <Router> context 💥
  const location = useLocation();
  const NO_HEADER_PATHS = ['/login'];
  const showHeader = !NO_HEADER_PATHS.includes(location.pathname);

  return (
    <>
      {/* 🟢 CONDITIONAL RENDERING OF HEADER 🟢 */}
      {showHeader && (
        <Header
          activeLink={activeLink}
          setActiveLink={setActiveLink}
          setScrollTarget={setScrollTarget}
        />
      )}

      {/* ScrollHandler runs globally but uses router hooks */}
      <ScrollHandler
        aboutRef={aboutRef}
        eventsRef={eventsRef}
        scrollTarget={scrollTarget}
        setScrollTarget={setScrollTarget}
        setActiveLink={setActiveLink}
      />

      <Routes>
        {/* Pass refs to Home */}
        <Route path="/" element={<Home aboutRef={aboutRef} eventsRef={eventsRef} />} />
        <Route path="login" element={<Login />} />
        <Route path="/myAccount/myRewards" element={< MyRewards />} />
        <Route path="/events/:id" element={<EventDetail />} />
        <Route path="/register/:id" element={<EventRegistration />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/donation" element={<Donation />} />
      </Routes>

      <Footer />
    </>
  );
}
// --- End AppContent ---


function App() {
  const aboutRef = useRef(null);
  const eventsRef = useRef(null);

  const [activeLink, setActiveLink] = useState({ group: "scroll", link: "About" });
  const [scrollTarget, setScrollTarget] = useState({ target: null });

  const scrollToAbout = () => {
    setScrollTarget({ target: "About" });
    setActiveLink({ group: "scroll", link: "About" });
  };

  const scrollToEvents = () => {
    setScrollTarget({ target: "Events" });
    setActiveLink({ group: "scroll", link: "Events" });
  };

  return (
    <ScrollContext.Provider value={{ scrollToAbout, scrollToEvents }}>
      <BrowserRouter>
        {/* 🟢 Render the component that holds the conditional logic and router hooks 🟢 */}
        <AppContent
          aboutRef={aboutRef}
          eventsRef={eventsRef}
          activeLink={activeLink}
          setActiveLink={setActiveLink}
          scrollTarget={scrollTarget}
          setScrollTarget={setScrollTarget}
        />
      </BrowserRouter>
    </ScrollContext.Provider>
  );
}

export default App;