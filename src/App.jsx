import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";

import Home from "./pages/Home";
import EventDetail from "./pages/EventDetail";
import EventRegistration from "./pages/EventRegistration";

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
            <Route path="/marketplace" element={<div className="p-10 text-center text-2xl">Marketplace Page (Coming Soon)</div>} />
            <Route path="/donation" element={<div className="p-10 text-center text-2xl">Donation Page (Coming Soon)</div>} />
          </Routes>
        </main>

        <Footer />
      </BrowserRouter>
    </div>
  );
}

export default App;