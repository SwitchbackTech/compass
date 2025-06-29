import { css, keyframes } from "styled-components";

export const rotate = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

export const rotateAnimation = <
  T extends {
    duration?: string;
    loop?: number | "infinite" | "initial" | "inherit";
    paused?: boolean;
  },
>({
  duration,
  loop,
  paused,
}: T) => {
  const pause = paused ? "paused" : "running";

  return css<T>`
    ${rotate} ${duration ?? "1.1s"} linear ${loop ?? "infinite"} ${pause}
  `;
};
