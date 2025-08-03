import React from "react";
import logo from "@web/assets/png/logo.png";

export const Logo = (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
  return <img src={logo} alt="Compass" {...props} />;
};
