import Foundation

public struct AuthFormField: Encodable, Sendable {
    public let id: String
    public let value: String

    public init(id: String, value: String) {
        self.id = id
        self.value = value
    }
}

public struct SignInUpRequest: Encodable, Sendable {
    public let thirdPartyId: String
    public let clientType: String
    public let redirectURIInfo: RedirectURIInfo

    public struct RedirectURIInfo: Encodable, Sendable {
        public let redirectURIOnProviderDashboard: String
        public let redirectURIQueryParams: RedirectURIQueryParams
        public let pkceCodeVerifier: String?

        public struct RedirectURIQueryParams: Encodable, Sendable {
            public let code: String
            public let scope: String?
            public let state: String?
            public let user: String?
        }
    }

    public init(
        thirdPartyId: String,
        clientType: String = "web",
        redirectURIInfo: RedirectURIInfo
    ) {
        self.thirdPartyId = thirdPartyId
        self.clientType = clientType
        self.redirectURIInfo = redirectURIInfo
    }
}

public struct AuthAPI: Sendable {
    private let client: CompassAPIClient

    init(client: CompassAPIClient) {
        self.client = client
    }

    public struct SignInUpResult: Sendable {
        public let createdNewRecipeUser: Bool
    }

    public func signInUp(_ request: SignInUpRequest) async throws -> SignInUpResult {
        let payload = try await client.sendRaw(
            method: "POST",
            path: "signinup",
            bodyData: try JSONEncoder().encode(request),
            auth: .headerSession,
            allowRefresh: false,
            extraHeaders: ["rid": "thirdparty"]
        )
        guard (200 ..< 300).contains(payload.statusCode) else {
            throw CompassAPIError.httpStatus(payload.statusCode, body: payload.body)
        }
        let bodyData = payload.body.data(using: .utf8) ?? Data()
        let createdNewRecipeUser = Self.parseCreatedNewRecipeUser(from: bodyData)
        try await client.storeSession(from: payload)
        return SignInUpResult(createdNewRecipeUser: createdNewRecipeUser)
    }

    private static func parseCreatedNewRecipeUser(from body: Data) -> Bool {
        guard let json = try? JSONSerialization.jsonObject(with: body) as? [String: Any]
        else {
            return false
        }
        return json["createdNewRecipeUser"] as? Bool ?? false
    }

    public func refresh() async throws {
        try await client.refreshSessionSingleFlight()
    }

    public func signOut() async throws {
        guard let tokens = try await client.currentSession() else {
            try await client.signOutLocally()
            return
        }
        let payload = try await client.sendRaw(
            method: "POST",
            path: "signout",
            auth: .headerSession,
            allowRefresh: false,
            extraHeaders: [SessionHeader.refreshTokenBody: tokens.refreshToken]
        )
        if !(200 ..< 300).contains(payload.statusCode) {
            throw CompassAPIError.httpStatus(payload.statusCode, body: payload.body)
        }
        try await client.signOutLocally()
    }
}
