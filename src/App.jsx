import { BrowserRouter, Routes, Route, useLocation, useSearchParams, Navigate } from "react-router-dom";
import { useRef, useState, useEffect } from "react";

// COMPONENTS
import Header from "./users/components/Header.jsx";
import Footer from "./users/components/Footer.jsx";
import Home from "./users/pages/Home.jsx";
import Login from "./users/pages/Login.jsx";
import Signup from "./users/pages/Signup.jsx";
import EventDetail from "./users/pages/EventDetail.jsx";
import EventRegistration from "./users/pages/EventRegistration.jsx";
import Marketplace from "./users/pages/Marketplace.jsx";
import DonationCorner from "./users/pages/DonationCorner.jsx";
import DonationDetail from "./users/pages/DonationDetail.jsx";
import DonateItem from "./users/pages/DonateItem.jsx";
import MyAccount from "./users/pages/MyAccount.jsx";
import AccountDetails from "./users/pages/AccountDetails.jsx";
import EditProfile from "./users/pages/EditProfile.jsx";
import MyCart from "./users/pages/MyCart.jsx";
import MyRewards from "./users/pages/MyRewards.jsx";
import MyListings from "./users/pages/MyListings.jsx";
import ListingDetail from "./users/pages/ListingDetail.jsx";
import MyPurchases from "./users/pages/MyPurchases.jsx";
import MySoldItems from "./users/pages/MySoldItems.jsx";
import SellItem from "./users/pages/SellItem.jsx";
import ItemDetail from "./users/pages/ItemDetail.jsx";

// ADMIN
import ItemsApproval from "./admin/pages/ItemsApproval.jsx";
import EventPosting from "./admin/pages/EventPosting.jsx";
import TransactionModeration from "./admin/pages/TransactionModeration.jsx";
import VoucherManagement from "./admin/pages/VoucherManagement.jsx";
import ReportModeration from "./admin/pages/ReportModeration.jsx";
import DataVisualisation from "./admin/pages/DataVisualisation.jsx";
import LeftColumnBar from "./admin/components/LeftColumnBar.jsx";

// AUTH
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";

// --- SCROLL COMPONENTS ---
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
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
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveLink({
              group: "scroll",
              link: entry.target.id === "about" ? "About" : "Events",
            });
          }
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

    setTimeout(() => {
      map[scrollTarget]?.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);

    setActiveLink({
      group: "scroll",
      link: scrollTarget[0].toUpperCase() + scrollTarget.slice(1),
    });

    setSearchParams({}, { replace: true });
  }, [location.pathname, searchParams, aboutRef, eventsRef, setActiveLink, setSearchParams]);

  return null;
};

const AppContent = ({ aboutRef, eventsRef, activeLink, setActiveLink, currentUser, loadingAuth }) => {
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(false);

  const ADMIN_UID = "s1vc26Q4mTYqsg2n0WL7CSN6q3k1";
  const isAdmin = currentUser?.uid === ADMIN_UID;

  const adminPaths = [
    "/itemsApproval",
    "/transactionModeration",
    "/eventPosting",
    "/voucherManagement",
    "/reportModeration",
    "/dataVisualisation",
  ];

  const isAdminPath = adminPaths.some((p) => location.pathname.startsWith(p));

  if (loadingAuth) return null;

  const adminWrapper = (component) => (
    <div className={`admin-page-wrapper ${collapsed ? "collapsed" : ""}`}>
      <LeftColumnBar onCollapseChange={setCollapsed} />
      <div className="admin-page-content">{component}</div>
    </div>
  );

  const hideHeader = isAdmin || location.pathname === "/login" || location.pathname === "/signup";
  const hideFooter = isAdmin;

  return (
    <>
      <ScrollToTop />
      {!hideHeader && <Header activeLink={activeLink} setActiveLink={setActiveLink} />}
      <ScrollHandler aboutRef={aboutRef} eventsRef={eventsRef} setActiveLink={setActiveLink} />

      <Routes>
        <Route
          path="/"
          element={isAdmin ? <Navigate to="/itemsApproval" /> : <Home aboutRef={aboutRef} eventsRef={eventsRef} />}
        />

        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* USER ROUTES BLOCKED FOR ADMIN */}
        <Route path="/marketplace" element={isAdmin ? <Navigate to="/itemsApproval" /> : <Marketplace />} />
        <Route path="/item/:id" element={isAdmin ? <Navigate to="/itemsApproval" /> : <ItemDetail />} />
        <Route path="/sellitem" element={isAdmin ? <Navigate to="/itemsApproval" /> : <SellItem />} />
        <Route path="/events/:id" element={isAdmin ? <Navigate to="/itemsApproval" /> : <EventDetail />} />
        <Route path="/register/:id" element={isAdmin ? <Navigate to="/itemsApproval" /> : <EventRegistration />} />
        <Route path="/donationcorner" element={isAdmin ? <Navigate to="/itemsApproval" /> : <DonationCorner />} />
        <Route path="/donation/:id" element={isAdmin ? <Navigate to="/itemsApproval" /> : <DonationDetail />} />
        <Route path="/donation" element={isAdmin ? <Navigate to="/itemsApproval" /> : <DonationCorner />} />
        <Route path="/donateitem" element={isAdmin ? <Navigate to="/itemsApproval" /> : <DonateItem />} />
        <Route path="/myaccount" element={isAdmin ? <Navigate to="/itemsApproval" /> : <MyAccount />} />
        <Route path="/myrewards" element={isAdmin ? <Navigate to="/itemsApproval" /> : <MyRewards />} />
        <Route path="/mycart" element={isAdmin ? <Navigate to="/itemsApproval" /> : <MyCart />} />
        <Route path="/accountdetails" element={isAdmin ? <Navigate to="/itemsApproval" /> : <AccountDetails />} />
        <Route path="/editprofile" element={isAdmin ? <Navigate to="/itemsApproval" /> : <EditProfile />} />
        <Route path="/mylistings" element={isAdmin ? <Navigate to="/itemsApproval" /> : <MyListings />} />
        <Route path="/listing/:id" element={isAdmin ? <Navigate to="/itemsApproval" /> : <ListingDetail />} />
        <Route path="/purchasehistory" element={isAdmin ? <Navigate to="/itemsApproval" /> : <MyPurchases />} />
        <Route path="/solditems" element={isAdmin ? <Navigate to="/itemsApproval" /> : <MySoldItems />} />

        {/* ADMIN ROUTES BLOCKED FOR USERS */}
        <Route path="/itemsApproval" element={isAdmin ? adminWrapper(<ItemsApproval />) : <Navigate to="/" />} />
        <Route path="/eventPosting" element={isAdmin ? adminWrapper(<EventPosting />) : <Navigate to="/" />} />
        <Route path="/transactionModeration" element={isAdmin ? adminWrapper(<TransactionModeration />) : <Navigate to="/" />} />
        <Route path="/voucherManagement" element={isAdmin ? adminWrapper(<VoucherManagement />) : <Navigate to="/" />} />
        <Route path="/reportModeration" element={isAdmin ? adminWrapper(<ReportModeration />) : <Navigate to="/" />} />
        <Route path="/dataVisualisation" element={isAdmin ? adminWrapper(<DataVisualisation />) : <Navigate to="/" />} />
      </Routes>

      {!hideFooter && <Footer />}
    </>
  );
};

export default function App() {
  const aboutRef = useRef(null);
  const eventsRef = useRef(null);
  const [activeLink, setActiveLink] = useState({ group: "", link: "" });
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      // console.log("CURRENT UID:", user?.uid); check for UID
      setCurrentUser(user);
      setLoadingAuth(false);
    });
    return () => unsub();
  }, []);

  return (
    <BrowserRouter>
      <AppContent
        aboutRef={aboutRef}
        eventsRef={eventsRef}
        activeLink={activeLink}
        setActiveLink={setActiveLink}
        currentUser={currentUser}
        loadingAuth={loadingAuth}
      />
    </BrowserRouter>
  );
}