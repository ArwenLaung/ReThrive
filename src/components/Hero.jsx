import React from "react";
import Logo from "./Logo";

const Hero = () => {
  return (
    <section id="about" className="pt-32 pb-12 px-4 bg-white">
      <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
        <div className="mb-6">
          <Logo size="lg" />
        </div>

        <p className="text-gray-600 max-w-2xl mx-auto mb-12 text-sm md:text-base leading-relaxed">
          A secure and convenient platform for USM students to buy, sell, and
          donate second-hand items such as hostel essentials, clothes,
          electronics and books. Log in with USM ID to get yours now.
        </p>

        <div className="w-full h-64 md:h-96 bg-gray-50 rounded-3xl shadow-lg border border-gray-100 flex items-center justify-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-lightPurple to-white opacity-50"></div>

          {/* Decorative placeholder elements */}
          <div className="relative z-10 text-center p-8">
            <div className="inline-block p-4 rounded-full bg-white shadow-sm mb-4">
              <span className="text-4xl">👋</span>
            </div>
            <h3 className="text-brand-purple font-bold text-xl mb-2">
              Welcome to ReThrive
            </h3>
            <p className="text-gray-500 text-sm">
              Your campus community marketplace
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
