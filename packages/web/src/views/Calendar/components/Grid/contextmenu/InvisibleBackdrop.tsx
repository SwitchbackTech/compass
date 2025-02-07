import React from "react";

interface BackdropProps {
  onClick: () => void;
}

const InvisibleBackdrop: React.FC<BackdropProps> = ({ onClick }) => {
  return (
    <div
      onClick={onClick}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(0, 0, 0, 0)", // Fully transparent
        zIndex: 999,
      }}
    />
  );
};

export default InvisibleBackdrop;
