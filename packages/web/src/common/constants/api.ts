// TODO change once you put the production web server and
// backend on separate VMs
// export const BASEURL = "http://localhost:3000/api";
// export const BASEURL = "https://***REMOVED***/api";
export const BASEURL =
  process.env.NODE_ENV === "production"
    ? "https://***REMOVED***/api"
    : "http://localhost:3000/api";

console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("BASEURL:", BASEURL);
