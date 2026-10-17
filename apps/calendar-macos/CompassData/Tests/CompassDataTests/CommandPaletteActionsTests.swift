import CompassKit
import XCTest
@testable import CompassData

@MainActor
final class CommandPaletteActionsTests: XCTestCase {
    private var savedDefaults: [String: Any] = [:]
    private var previousTimeZone = "UTC"
    private let keys = [RecentCommandsPersistence.storageKey,
        ShortcutUsageStorageKeys.personalization, ShortcutUsageStorageKeys.levelHidden,
        ShortcutUsageStorageKeys.levelCelebrated, ShortcutUsageStorageKeys.tipRotationIndex]

    override func setUp() async throws {
        previousTimeZone = EffectiveTimeZone.identifier
        for key in keys {
            savedDefaults[key] = UserDefaults.standard.object(forKey: key)
            UserDefaults.standard.removeObject(forKey: key)
        }
    }

    override func tearDown() async throws {
        for key in keys {
            if let value = savedDefaults[key] { UserDefaults.standard.set(value, forKey: key) }
            else { UserDefaults.standard.removeObject(forKey: key) }
        }
        savedDefaults = [:]
        EffectiveTimeZone.identifier = previousTimeZone
    }

    func testCreateRowsOpenTimedAndAllDayForms() async throws {
        let model = try await makeModel()
        for (id, kind) in [("create-event", DraftSchedule.Kind.timed), ("create-allday-event", .allDay)] {
            model.commandPaletteStore.open()
            model.runPaletteCommand(id: id)
            XCTAssertFalse(model.commandPaletteStore.isOpen)
            let draft = try XCTUnwrap(model.draftStore.gridDraft)
            XCTAssertEqual(draft.schedule.kind, kind)
            XCTAssertTrue(model.isEventFormVisible)
            model.draftStore.discard()
        }
    }

    func testCreateShortcutsDoNotDraftBehindSettingsOrAuthentication() async throws {
        let model = try await makeModel()
        model.settingsStore.open()
        model.handleShortcut(.createTimed)
        XCTAssertNil(model.draftStore.gridDraft)
        model.settingsStore.close()
        model.authStore.openModal(.login)
        model.handleShortcut(.createAllday)
        XCTAssertNil(model.draftStore.gridDraft)
    }

    func testCreationFromLifeViewReturnsToCalendar() async throws {
        let model = try await makeModel()
        model.viewStore.view = .life
        model.runPaletteCommand(id: "create-event")
        XCTAssertEqual(model.viewStore.view, .week)
        XCTAssertNotNil(model.draftStore.gridDraft)
    }

    func testSelectionWrapsAndResetsWhenQueryChanges() async throws {
        let model = try await makeModel()
        model.commandPaletteStore.open()
        let items = model.filteredPaletteSections().flatMap(\.items)
        XCTAssertEqual(model.selectedPaletteItemId, items.first?.id)
        model.movePaletteSelection(by: -1)
        XCTAssertEqual(model.selectedPaletteItemId, items.last?.id)
        model.movePaletteSelection(by: 1)
        XCTAssertEqual(model.selectedPaletteItemId, items.first?.id)
        model.movePaletteSelection(by: 1)
        XCTAssertEqual(model.selectedPaletteItemId, items[1].id)
        model.commandPaletteStore.query = "settings"
        XCTAssertEqual(model.selectedPaletteItemId, "open-settings")
        model.activatePaletteSelection()
        XCTAssertTrue(model.settingsStore.isPresented)
        XCTAssertFalse(model.commandPaletteStore.isOpen)
    }

    func testEmptyResultsCannotActivateAnOldSelection() async throws {
        let model = try await makeModel()
        model.commandPaletteStore.open()
        model.movePaletteSelection(by: 1)
        model.commandPaletteStore.query = "no-match-a9z8x7"
        XCTAssertNil(model.selectedPaletteItemId)
        model.activatePaletteSelection()
        XCTAssertTrue(model.commandPaletteStore.isOpen)
    }

    func testRecentRowsHaveUniqueIdentityAndRunTheUnderlyingCommand() async throws {
        let model = try await makeModel()
        model.commandPaletteStore.recordSelection(commandId: "today")
        model.commandPaletteStore.open()
        let ids = model.filteredPaletteSections().flatMap(\.items).map(\.id)
        XCTAssertEqual(ids.count, Set(ids).count)
        XCTAssertTrue(ids.contains("recent-today"))
        model.commandPaletteStore.select(commandId: "recent-today")
        model.activatePaletteSelection()
        XCTAssertFalse(model.commandPaletteStore.isOpen)
        XCTAssertEqual(model.commandPaletteStore.recentCommandIds.first, "today")
        XCTAssertFalse(model.commandPaletteStore.recentCommandIds.contains("recent-today"))
    }

    func testAboutInvokesNativePresentation() async throws {
        let model = try await makeModel()
        var presented = false
        model.onShowAbout = { presented = true }
        model.commandPaletteStore.open()
        model.runPaletteCommand(id: "about")
        XCTAssertTrue(presented)
        XCTAssertFalse(model.commandPaletteStore.isOpen)
    }

    private func makeModel() async throws -> NativeCalendarRootModel {
        let environment = try NativeCalendarEnvironment(inMemoryDatabase: true, sessionStore: MemorySessionStore(tokens: nil))
        let model = NativeCalendarRootModel(environment: environment, demoPresentation: try DemoSeedFixture.load())
        await model.start()
        return model
    }
}
