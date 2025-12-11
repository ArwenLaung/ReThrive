import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  useSearchParams,
} from "react-router-dom";

import Header from "./users/components/Header.jsx";
import Footer from "./users/components/Footer.jsx";
import Home from "./users/pages/Home.jsx";
import Login from "./users/pages/Login.jsx";
import EventDetail from "./users/pages/EventDetail.jsx";
import EventRegistration from "./users/pages/EventRegistration.jsx";
import Marketplace from "./users/pages/Marketplace.jsx";
import Donation from "./users/pages/Donation.jsx";
import DonationCorner from "./users/pages/Donation.jsx";
import DonationDetail from "./users/pages/DonationDetail.jsx";
import DonateItem from "./users/pages/DonateItem.jsx";
import MyAccount from "./users/pages/MyAccount.jsx";
import AccountDetails from "./users/pages/AccountDetails.jsx";
import EditProfile from "./users/pages/EditProfile.jsx";
import MyRewards from "./users/pages/MyRewards.jsx";
import SellItem from "./users/pages/SellItem.jsx";
import ItemDetail from "./users/pages/ItemDetail.jsx";
import ItemsApproval from "./admin/pages/ItemsApproval.jsx";
import EventPosting from "./admin/pages/EventPosting.jsx";
import LeftColumnBar from "./admin/components/LeftColumnBar.jsx";

import { useRef, useState, useEffect } from "react";

const ScrollHandler = ({ aboutRef, eventsRef, setActiveLink }) => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // scroll spy
  useEffect(() => {
    if (location.pathname !== "/") return;

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setActiveLink({
              group: "scroll",
              link: entry.target.id === "about" ? "About" : "Events",
            });
          }
        });
      },
      { rootMargin: "-25% 0px -25% 0px" }
    );

    if (eventsRef.current) observer.observe(eventsRef.current);
    if (aboutRef.current) observer.observe(aboutRef.current);

    return () => observer.disconnect();
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname !== "/") return;

    const scrollTarget = searchParams.get("scroll_to");

    if (!scrollTarget) return;

    const map = { about: aboutRef, events: eventsRef };

    map[scrollTarget]?.current?.scrollIntoView({ behavior: "smooth" });

    setActiveLink({
      group: "scroll",
      link: scrollTarget[0].toUpperCase() + scrollTarget.slice(1),
    });

    setSearchParams({}, { replace: true });
  }, [location.pathname, searchParams]);

  return null;
};

const AppContent = ({ aboutRef, eventsRef, activeLink, setActiveLink }) => {
  const adminPaths = [
    "/itemsApproval",
    "/transactionModeration",
    "/eventPosting",
    "/voucherManagement",
    "/reportModeration",
    "/dataVisualisation"
  ];

  const location = useLocation();

  const hideHeader = adminPaths.some(p => location.pathname.startsWith(p))
    || location.pathname === "/login";

  const hideFooter = adminPaths.some(p => location.pathname.startsWith(p));

  return (
    <>
      {!hideHeader && (
        <Header activeLink={activeLink} setActiveLink={setActiveLink} />
      )}

      {adminPaths.some(p => location.pathname.startsWith(p)) && <LeftColumnBar />}

      <ScrollHandler
        aboutRef={aboutRef}
        eventsRef={eventsRef}
        setActiveLink={setActiveLink}
      />

      <Routes>
        <Route path="/" element={<Home aboutRef={aboutRef} eventsRef={eventsRef} />} />
        <Route path="/login" element={<Login />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/item/:id" element={<ItemDetail />} />
        <Route path="/sellitem" element={<SellItem />} />
        <Route path="/events/:id" element={<EventDetail />} />
        <Route path="/register/:id" element={<EventRegistration />} />
        <Route path="/donationcorner" element={<DonationCorner />} />
        <Route path="/donation/:id" element={<DonationDetail />} />
        <Route path="/donation" element={<Donation />} />
        <Route path="/donateitem" element={<DonateItem />} />
        <Route path="/myaccount" element={<MyAccount />} />
        <Route path="/myaccount/myrewards" element={<MyRewards />} />
        <Route path="/accountdetails" element={<AccountDetails />} />
        <Route path="/editprofile" element={<EditProfile />} />
        <Route path="/itemsApproval" element={<ItemsApproval />} />
        <Route path="/eventPosting" element={<EventPosting />} />
      </Routes>

      {!hideFooter && <Footer />}
    </>
  );
};

export default function App() {
  const aboutRef = useRef(null);
  const eventsRef = useRef(null);
  const [activeLink, setActiveLink] = useState({ group: "", link: "" });

  return (
    <BrowserRouter>
      <AppContent
        aboutRef={aboutRef}
        eventsRef={eventsRef}
        activeLink={activeLink}
        setActiveLink={setActiveLink}
      />
    </BrowserRouter>
  );
}