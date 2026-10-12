import CompassKit
import XCTest

/// `/api/user/metadata` sends the web's GoogleConnectionState values
/// ("HEALTHY", "RECONNECT_REQUIRED"). The generated enum once shared the
/// sync ConnectionState cases instead, so every payload with a connection
/// failed to decode and the app saw no accounts.
final class UserMetadataDecodingTests: XCTestCase {
    func testDecodesConnectionsWithGoogleConnectionState() throws {
        let json = """
        {"connections":[{"id":"c1","provider":"google","state":"healthy","stateReason":null,
        "lastSyncedAt":null,"lastHealthyAt":null,"accountEmail":"a@example.com",
        "connectionState":"HEALTHY","canSuggestContacts":true}]}
        """
        let metadata = try JSONDecoder().decode(UserMetadata.self, from: Data(json.utf8))
        let connection = try XCTUnwrap(metadata.connections?.first)
        XCTAssertEqual(connection.connectionState, .hEALTHY)
        XCTAssertTrue(BookingConnectionHealth.hasHealthyConnection(connections: [connection]))
    }
}
