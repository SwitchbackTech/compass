import Foundation

public struct SessionTokens: Equatable, Sendable, Codable {
    public var accessToken: String
    public var refreshToken: String
    public var frontToken: String

    /// Supertokens' front token is base64-encoded UTF-8 JSON; `uid` survives token refresh.
    public var userId: String? {
        struct Identity: Decodable { let uid: String }
        let padding = String(repeating: "=", count: (4 - frontToken.count % 4) % 4)
        guard let data = Data(base64Encoded: frontToken + padding),
              let identity = try? JSONDecoder().decode(Identity.self, from: data),
              !identity.uid.isEmpty else { return nil }
        return identity.uid
    }

    public init(accessToken: String, refreshToken: String, frontToken: String) {
        self.accessToken = accessToken
        self.refreshToken = refreshToken
        self.frontToken = frontToken
    }
}

public enum SessionHeader {
    public static let authMode = "st-auth-mode"
    public static let headerModeValue = "header"
    public static let accessToken = "st-access-token"
    public static let refreshToken = "st-refresh-token"
    public static let frontToken = "front-token"
    public static let refreshTokenBody = "st-refresh-token"
}
