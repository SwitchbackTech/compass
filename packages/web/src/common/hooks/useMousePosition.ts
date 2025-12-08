import { useContext } from "react";
import { MousePositionContext } from "@web/common/context/mouse-position";

export const useMousePosition = () => useContext(MousePositionContext);
