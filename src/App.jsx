import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";

import Home from "./pages/Home";
import EventDetail from "./pages/EventDetail";
import EventRegistration from "./pages/EventRegistration";
import Marketplace from "./pages/Marketplace";
import SellItem from "./pages/SellItem";
import DonationCorner from "./pages/DonationCorner";
import DonateItem from "./pages/DonateItem";
import MyAccount from "./pages/MyAccount";
import AccountDetails from './pages/AccountDetails';
import EditProfile from './pages/EditProfile';
// import Login from './pages/Login';

// Temporary Login Placeholder Component for firebase
const LoginPlaceholder = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <h1 className="text-2xl font-bold text-gray-400">Login Page (Coming Soon)</h1>
    </div>
  );
};

function App() {
  return (
    <div className="app">
      <BrowserRouter>
        <Header />

        <main className="content">
          <Routes>
            {/* Your routes go here */}
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<div>About Page</div>} />
            <Route path="/events/:id" element={<EventDetail />} />
            <Route path="/register/:id" element={<EventRegistration />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/sellitem" element={<SellItem />} />
            <Route path="/donationcorner" element={<DonationCorner />} />
            <Route path="/donateitem" element={<DonateItem />} />
            <Route path="/myaccount" element={<MyAccount />} />
            <Route path="/login" element={<LoginPlaceholder />} />
            <Route path="/accountdetails" element={<AccountDetails />} />
            <Route path="/editprofile" element={<EditProfile />} />
          </Routes>
        </main>

        <Footer />
      </BrowserRouter>
    </div>
  );
}

export default App;