import { mockBSON } from "@web/__tests__/web.test.start";

process.env.API_BASEURL = "http://localhost:3000/api";
process.env.GOOGLE_CLIENT_ID = "mockedClientId";

mockBSON();
