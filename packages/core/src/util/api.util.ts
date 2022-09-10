// import { PORT_DEFAULT_API, NodeEnv } from "@core/constants/core.constants";

// // interface Params_BaseUrl {
// //   port?: number;
// //   prodUrl?: string;
// // }
// export const getApiBaseUrl = (nodeEnv: NodeEnv) => {
//   if (!Object.values(NodeEnv).includes(nodeEnv)) {
//     throw new Error(`Invalid NODE_ENV value: '${nodeEnv}'`);
//   }

//   if (nodeEnv === NodeEnv.Production) {
//     return params?.prodUrl || API_URL_DEFAULT;
//   }

//   return `http://localhost:${params?.port || PORT_DEFAULT_API}/api`;
// };

//++
// export const getApiBaseUrl = (nodeEnv: NodeEnv, params?: Params_BaseUrl) => {
//   if (!Object.values(NodeEnv).includes(nodeEnv)) {
//     throw new Error(`Invalid NODE_ENV value: '${nodeEnv}'`);
//   }

//   if (nodeEnv === NodeEnv.Production) {
//     return params?.prodUrl || API_URL_DEFAULT;
//   }

//   return `http://localhost:${params?.port || PORT_DEFAULT_API}/api`;
// };
