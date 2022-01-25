export const isDev = () => {
  return process.env.NODE_ENV === "development";
};

export const yearsAgo = (numYears: number) => {
  return new Date(new Date().setFullYear(new Date().getFullYear() - numYears));
};
