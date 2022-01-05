export const isDev = () => {
  return process.env.ENV === "dev";
};

export const yearsAgo = (numYears: number) => {
  return new Date(new Date().setFullYear(new Date().getFullYear() - numYears));
};
