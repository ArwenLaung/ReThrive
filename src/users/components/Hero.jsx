import React, { useState, useEffect } from "react";
import {
  ShoppingBag,
  Heart,
  Calendar,
  Leaf,
  CheckCircle,
  Ticket,
  ArrowRight
} from "lucide-react";
import { Link } from "react-router-dom";
import usm1 from "../assets/usm1.jpeg";
import usm2 from "../assets/usm2.png";
import usm3 from "../assets/usm3.jpeg";
import usm4 from "../assets/usm4.png";

const HERO_IMAGES = [usm1, usm2, usm3, usm4];

const FEATURES = [
  {
    icon: <ShoppingBag size={32} />,
    title: "Campus Marketplace",
    desc: "Buy and sell hostel essentials, textbooks, and electronics securely within the USM community.",
    color: "bg-purple-100 text-purple-700"
  },
  {
    icon: <Heart size={32} />,
    title: "Donation Corner",
    desc: "Give back to your peers. Donate items you no longer need and help others thrive.",
    color: "bg-green-100 text-green-700"
  },
  {
    icon: <Calendar size={32} />,
    title: "Campus Events",
    desc: "Discover and participate in vibrant student events happening right now on campus.",
    color: "bg-blue-100 text-blue-700"
  },
  {
    icon: <Leaf size={32} />,
    title: "Earn EcoPoints",
    desc: "Get rewarded for every sustainable action—buying used, selling, or joining events.",
    color: "bg-emerald-100 text-emerald-700"
  },
  {
    icon: <CheckCircle size={32} />,
    title: "Daily Check-in",
    desc: "Log in daily to claim free EcoPoints and keep your streak alive!",
    color: "bg-orange-100 text-orange-700"
  },
  {
    icon: <Ticket size={32} />,
    title: "Exclusive Vouchers",
    desc: "Redeem your hard-earned EcoPoints for exclusive vouchers and deals.",
    color: "bg-pink-100 text-pink-700"
  }
];

const Hero = () => {
  const [currentImage, setCurrentImage] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col w-full">

      <section className="relative w-full h-[700px] overflow-hidden bg-gray-900">

        {HERO_IMAGES.map((img, index) => (
          <div
            key={index}
            className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${index === currentImage ? "opacity-60" : "opacity-0"
              }`}
          >
            <img
              src={img}
              alt={`Slide ${index + 1}`}
              className="w-full h-full object-cover"
            />
          </div>
        ))}

        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-4">

          <div className="bg-white/30 backdrop-blur-sm border border-white/10 p-10 md:p-14 rounded-3xl shadow-2xl max-w-4xl transition-all">

            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 drop-shadow-md">
              Welcome to <span className="text-[#8E24AA]">Re</span><span className="text-[#AAD11D]">Thrive</span>
            </h1>

            <h2 className="text-xl md:text-2xl font-semibold text-gray-100 mb-8 tracking-wide">
              Your campus community marketplace
            </h2>

            <p className="text-gray-200 max-w-2xl mx-auto mb-8 text-sm md:text-lg leading-relaxed font-medium shadow-black drop-shadow-md">
              A secure platform for USM students to buy, sell, and donate second-hand items.
              Join the movement to reduce waste and thrive together.
            </p>

            <div className="flex justify-center">
              <Link
                to="/marketplace"
                className="bg-[#59287a] hover:bg-[#451d5e] text-white px-10 py-4 rounded-full font-bold transition-transform hover:scale-105 shadow-lg flex items-center gap-2 text-lg"
              >
                Start Exploring <ArrowRight size={22} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-[#59287a] mb-4">
              Everything You Need to Thrive
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">
              ReThrive isn't just a marketplace—it's an ecosystem designed to reward you for sustainable living on campus.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {FEATURES.map((feature, index) => (
              <div
                key={index}
                className="group p-8 rounded-[2rem] border border-gray-100 bg-white hover:shadow-xl hover:shadow-purple-500/5 transition-all duration-300 hover:-translate-y-2"
              >
                <div className={`w-16 h-16 rounded-2xl ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-3 group-hover:text-[#59287a] transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-500 leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
};

export default Hero;