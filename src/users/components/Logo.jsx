import React from "react";
import LogoMark from "../assets/logo.svg";

const Logo = ({ size = "sm" }) => {
  const isLarge = size === "lg";

  const logoSize = isLarge ? "h-16 w-16" : "h-10 w-10";

  return (
    <div className="flex items-center">
      <img
        src={LogoMark}
        alt="ReThrive @USM"
        className={`${logoSize} w-auto drop-shadow-sm`}
      />
    </div>
  );
};

export default Logo;
