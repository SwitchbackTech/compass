import { mockBSON } from "@core/__tests__/mock.setup";

process.env.API_BASEURL = "http://localhost:3000/api";
process.env.GOOGLE_CLIENT_ID = "mockedClientId";

mockBSON();
