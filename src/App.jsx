import { BrowserRouter, Routes, Route, useLocation, useSearchParams } from "react-router-dom";
import { useRef, useState, useEffect } from "react";

// --- COMPONENTS & PAGES IMPORTS ---
import Header from "./users/components/Header.jsx";
import Footer from "./users/components/Footer.jsx";
import Home from "./users/pages/Home.jsx";
import Login from "./users/pages/Login.jsx";
import Signup from "./users/pages/Signup.jsx";
import EventDetail from "./users/pages/EventDetail.jsx";
import EventRegistration from "./users/pages/EventRegistration.jsx";
import Marketplace from "./users/pages/Marketplace.jsx";
import Donation from "./users/pages/Donation.jsx";
import DonationDetail from "./users/pages/DonationDetail.jsx";
import DonateItem from "./users/pages/DonateItem.jsx";
import MyAccount from "./users/pages/MyAccount.jsx";
import AccountDetails from "./users/pages/AccountDetails.jsx";
import EditProfile from "./users/pages/EditProfile.jsx";
import MyRewards from "./users/pages/MyRewards.jsx";
import MyListings from "./users/pages/MyListings.jsx";
import ListingDetail from "./users/pages/ListingDetail.jsx";
import MyPurchases from "./users/pages/MyPurchases.jsx";
import MySoldItems from "./users/pages/MySoldItems.jsx";
import SellItem from "./users/pages/SellItem.jsx";
import ItemDetail from "./users/pages/ItemDetail.jsx";
import MyDonations from "./users/pages/MyDonations.jsx";
import MyDonationDetail from "./users/pages/MyDonationDetail.jsx";
import MyDonatedItems from "./users/pages/MyDonatedItems.jsx";
import MyClaimedItems from "./users/pages/MyClaimedItems.jsx";
import MyCart from "./users/pages/MyCart.jsx";
import ClaimDonation from "./users/pages/ClaimDonation.jsx";

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.body.scrollTo(0, 0);
    document.getElementById("root")?.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

const ScrollHandler = ({ aboutRef, eventsRef, setActiveLink }) => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (location.pathname !== "/") return;
    const observer = new IntersectionObserver(
      entries => entries.forEach(entry => {
        if (entry.isIntersecting) setActiveLink({ group: "scroll", link: entry.target.id === "about" ? "About" : "Events" });
      }),
      { rootMargin: "-25% 0px -25% 0px" }
    );
    if (eventsRef.current) observer.observe(eventsRef.current);
    if (aboutRef.current) observer.observe(aboutRef.current);
    return () => observer.disconnect();
  }, [location.pathname, setActiveLink, eventsRef, aboutRef]);

  useEffect(() => {
    if (location.pathname !== "/") return;
    const scrollTarget = searchParams.get("scroll_to");
    if (!scrollTarget) return;
    const map = { about: aboutRef, events: eventsRef };
    
    setTimeout(() => map[scrollTarget]?.current?.scrollIntoView({ behavior: "smooth" }), 100);
    setActiveLink({ group: "scroll", link: scrollTarget[0].toUpperCase() + scrollTarget.slice(1) });
    setSearchParams({}, { replace: true });
  }, [location.pathname, searchParams, aboutRef, eventsRef, setActiveLink, setSearchParams]);

  return null;
};

const AppContent = ({ aboutRef, eventsRef, activeLink, setActiveLink }) => {
  const location = useLocation();
  const hideHeader = location.pathname === "/login" || location.pathname === "/signup";

  return (
    <>
      <ScrollToTop /> 

      {!hideHeader && <Header activeLink={activeLink} setActiveLink={setActiveLink} />}
      
      <ScrollHandler aboutRef={aboutRef} eventsRef={eventsRef} setActiveLink={setActiveLink} />

      <Routes>
        <Route path="/" element={<Home aboutRef={aboutRef} eventsRef={eventsRef} />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/item/:id" element={<ItemDetail />} />
        <Route path="/sellitem" element={<SellItem />} />
        <Route path="/events/:id" element={<EventDetail />} />
        <Route path="/register/:id" element={<EventRegistration />} />
        <Route path="/donation" element={<Donation />} />
        <Route path="/donation/:id" element={<DonationDetail />} />
        <Route path="/donateitem" element={<DonateItem />} />
        <Route path="/claimdonation/:id" element={<ClaimDonation />} />
        <Route path="/myaccount" element={<MyAccount />} />
        <Route path="/myrewards" element={<MyRewards />} />
        <Route path="/accountdetails" element={<AccountDetails />} />
        <Route path="/editprofile" element={<EditProfile />} />
        <Route path="/mylistings" element={<MyListings />} />
        <Route path="/listing/:id" element={<ListingDetail />} />
        <Route path="/purchasehistory" element={<MyPurchases />} />
        <Route path="/solditems" element={<MySoldItems />} />
        <Route path="/mydonations" element={<MyDonations />} />
        <Route path="/mydonationdetail/:id" element={<MyDonationDetail />} />
        <Route path="/mydonateditems" element={<MyDonatedItems />} />
        <Route path="/myclaimeditems" element={<MyClaimedItems />} />
        <Route path="/mycart" element={<MyCart />} />
      </Routes>

      <Footer />
    </>
  );
};

export default function App() {
  const aboutRef = useRef(null);
  const eventsRef = useRef(null);
  const [activeLink, setActiveLink] = useState({ group: "", link: "" });

  return (
    <BrowserRouter>
      <AppContent aboutRef={aboutRef} eventsRef={eventsRef} activeLink={activeLink} setActiveLink={setActiveLink} />
    </BrowserRouter>
  );
}