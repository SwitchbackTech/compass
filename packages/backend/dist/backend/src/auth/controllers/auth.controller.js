"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const uuid_1 = require("uuid");
const core_constants_1 = require("@core/core.constants");
const errors_base_1 = require("@core/errors/errors.base");
const status_codes_1 = require("@core/errors/status.codes");
const common_logger_1 = require("@backend/common/logger/common.logger");
const google_auth_service_1 = __importDefault(require("../services/google.auth.service"));
const compass_auth_service_1 = __importDefault(require("../services/compass.auth.service"));
const login_complete_1 = require("../services/login.complete");
const logger = common_logger_1.Logger("app:auth.controller");
const jwtSecret = process.env.JWT_SECRET;
const tokenExpirationInSeconds = 36000;
// eventually split up for each provider (google, outlook, email+pw)
class AuthController {
    constructor() {
        this.checkOauthStatus = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const integration = req.query.integration;
            if (integration === core_constants_1.GOOGLE) {
                const status = yield new google_auth_service_1.default().checkOauthStatus(req);
                res.promise(Promise.resolve(status));
            }
            else {
                res.promise(new errors_base_1.BaseError("Not Supported", `${integration} is not supported`, status_codes_1.Status.BAD_REQUEST, true));
            }
        });
        this.getOauthUrl = (req, res) => {
            if (req.query.integration === core_constants_1.GOOGLE) {
                const authState = uuid_1.v4();
                const authUrl = new google_auth_service_1.default().generateAuthUrl(authState);
                res.promise(Promise.resolve({ authUrl, authState }));
            }
        };
        this.loginAfterOauthSucceeded = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const _integration = core_constants_1.GOOGLE;
            if (_integration === core_constants_1.GOOGLE) {
                const query = req.query;
                const gAuthService = new google_auth_service_1.default();
                yield gAuthService.setTokens(query.code, null);
                const gUser = yield gAuthService.getUser();
                // TODO use query.state to start watching for that channel
                // via gcal.service
                const compassLoginData = {
                    user: gUser,
                    oauth: Object.assign({}, { state: query.state }, { tokens: gAuthService.getTokens() }),
                };
                const compassAuthService = new compass_auth_service_1.default();
                const loginResp = yield compassAuthService.loginToCompass(compassLoginData);
                //TODO validate resp
                res.promise(Promise.resolve(login_complete_1.loginCompleteHtml));
            }
        });
    }
    demoCreateJWT(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const refreshId = req.body.userId + jwtSecret;
                const salt = crypto_1.default.createSecretKey(crypto_1.default.randomBytes(16));
                const hash = crypto_1.default
                    .createHmac("sha512", salt)
                    .update(refreshId)
                    .digest("base64");
                req.body.refreshKey = salt.export();
                const token = jsonwebtoken_1.default.sign(req.body, jwtSecret, {
                    expiresIn: tokenExpirationInSeconds,
                });
                return res.status(201).send({ accessToken: token, refreshToken: hash });
            }
            catch (err) {
                logger.error("createJWT error: %O", err);
                return res.status(500).send();
            }
        });
    }
    createJwt(req, res) {
        // we know this will be present thanks to jwt middleware
        const accessToken = req.headers.authorization
            .split("Bearer ")
            .join("")
            .trim();
        const payload = jsonwebtoken_1.default.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
        const newToken = jsonwebtoken_1.default.sign({ _id: payload._id }, process.env.ACCESS_TOKEN_SECRET, {
            algorithm: "HS256",
            expiresIn: process.env.ACCESS_TOKEN_LIFE,
        });
        res.promise(Promise.resolve({ token: newToken }));
    }
    loginWithPassword(req, res) {
        res.promise(new errors_base_1.BaseError("Not Implemented", "do this once adding user+pw support", 500, true));
    }
}
exports.default = new AuthController();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aC5jb250cm9sbGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vc3JjL2F1dGgvY29udHJvbGxlcnMvYXV0aC5jb250cm9sbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsZ0VBQXdDO0FBQ3hDLG9EQUE0QjtBQUM1QiwrQkFBb0M7QUFFcEMseURBQThDO0FBQzlDLDBEQUFxRDtBQUNyRCw0REFBbUQ7QUFDbkQsd0VBQThEO0FBTzlELDBGQUFpRTtBQUNqRSw0RkFBa0U7QUFDbEUsK0RBQStEO0FBRS9ELE1BQU0sTUFBTSxHQUFHLHNCQUFNLENBQUMscUJBQXFCLENBQUMsQ0FBQztBQUU3QyxNQUFNLFNBQVMsR0FBdUIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUM7QUFDN0QsTUFBTSx3QkFBd0IsR0FBRyxLQUFLLENBQUM7QUFFdkMsb0VBQW9FO0FBQ3BFLE1BQU0sY0FBYztJQUFwQjtRQXlDRSxxQkFBZ0IsR0FBRyxDQUFPLEdBQW9CLEVBQUUsR0FBcUIsRUFBRSxFQUFFO1lBQ3ZFLE1BQU0sV0FBVyxHQUFXLEdBQUcsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDO1lBQ2xELElBQUksV0FBVyxLQUFLLHVCQUFNLEVBQUU7Z0JBQzFCLE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSw2QkFBa0IsRUFBRSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNwRSxHQUFHLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQzthQUN0QztpQkFBTTtnQkFDTCxHQUFHLENBQUMsT0FBTyxDQUNULElBQUksdUJBQVMsQ0FDWCxlQUFlLEVBQ2YsR0FBRyxXQUFXLG1CQUFtQixFQUNqQyxxQkFBTSxDQUFDLFdBQVcsRUFDbEIsSUFBSSxDQUNMLENBQ0YsQ0FBQzthQUNIO1FBQ0gsQ0FBQyxDQUFBLENBQUM7UUFFRixnQkFB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