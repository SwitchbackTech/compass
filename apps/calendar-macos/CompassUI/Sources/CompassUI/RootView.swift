import AppKit
import CompassData
import CompassKit
import SwiftUI

public struct RootView: View {
    @Environment(\.nativeWebTheme) private var theme
    @Bindable public var model: NativeCalendarRootModel
    /// Web `SIDEBAR_DIVIDER_WIDTH`: the resize handle's column.
    private let sidebarDividerWidth: CGFloat = 32
    /// Web main column `pl-8`.
    private let contentLeadingInset: CGFloat = 32
    public init(model: NativeCalendarRootModel) {
        self.model = model
    }

    public var body: some View {
        ZStack(alignment: .top) {
            HStack(spacing: 0) {
                VStack(spacing: 0) {
                    header
                    if model.viewStore.view != .life, model.showsDemoEventsBanner {
                        DemoEventsBannerView {
                            model.dismissDemoEventsBanner()
                        }
                        .noticeFocusRing(model.focusedNotice == .demoEvents)
                    }
                    content
                        .padding(.leading, contentLeadingInset)
                }
                // Web: Day/Week keep the panel mounted for event details even
                // when the sidebar preference is closed.
                if model.isSidebarOpen || model.isEventFormVisible {
                    sidebarResizeHandle
                    sidebar
                }
            }
            pointerHintLayer
            GridFocusAccessibilityOverlay(focusedLabel: model.gridFocusAccessibilityLabel)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                .padding(.top, 52)
                .padding(.leading, contentLeadingInset + 8)
        }
        .background(theme.backgroundColor)
        .font(.rubik(14))
        .overlayPreferenceValue(PageJumpChipAnchorKey.self) { anchors in
            ModHoldChipsOverlay(
                targets: model.focusStore.pageJumpTargets,
                anchors: anchors,
                visible: model.focusStore.pageJumpHintsVisible
            )
        }
        .overlay(alignment: .bottom) {
            VStack(spacing: 12) {
                if model.desktopUpdateReadyVersion != nil {
                    DesktopUpdateReadyBannerView {
                        model.onDesktopRestartToUpdate?()
                    }
                    .noticeFocusRing(model.focusedNotice == .updateReady)
                }
                if model.viewStore.view != .life {
                UpNextBanner(
                    model: model,
                    onOpen: { model.openUpNextEvent() },
                    onJoin: { model.joinUpNextMeeting() },
                    onBannerShown: { event in
                        model.upNextBannerShown(event)
                    })
                }
            }
            .padding(.bottom, 24)
        }
        .overlay(alignment: .top) {
            if case let .server(server) = model.billingStore.appAccess,
               server.status == .pastDue
            {
                BillingPastDueBannerView(billingStore: model.billingStore)
                    .noticeFocusRing(model.focusedNotice == .billingPastDue)
            }
        }
        .overlay {
            if model.authStore.isModalPresented, model.activeOnboardingSurface != .welcomeModal {
                AuthModalOverlay(authStore: model.authStore, billingStore: model.billingStore)
            }
        }
        .overlay {
            OnboardingOverlay(model: model)
        }
        .overlay {
            BlockPartyOverlay(model: model)
        }
        .overlay {
            if model.authStore.authenticated, model.billingStore.gateStatus != nil {
                BillingGateOverlay(billingStore: model.billingStore)
            }
        }
        .overlay {
            SettingsWindowOverlay(model: model)
        }
        .overlay {
            BillingUpgradeConfirmationSheet(billingStore: model.billingStore)
        }
        .overlay {
            CommandPaletteOverlay(model: model)
        }
        .overlay {
            ShortcutsLegendOverlay(model: model)
        }
        .overlay {
            WhichKeyPanelOverlay(model: model)
        }
        .overlay {
            EventContextMenuOverlay(model: model)
        }
        .overlay {
            StatusToastOverlay(model: model)
        }
        .overlay {
            DedicationDialogView(
                isPresented: model.dedicationDialogVisible,
                onClose: { model.dedicationDialogVisible = false }
            )
        }
        .overlay {
            LogoutConfirmationDialogView(model: model)
        }
        .overlay {
            DiscardUnsavedDraftDialogView(
                isPresented: model.pendingDiscardDraftConfirmation,
                onCancel: { model.cancelDiscardDraftConfirmation() },
                onDiscard: { model.discardDraftConfirmed() }
            )
        }
        .overlay {
            RecurrenceScopeDialogView(
                isPresented: model.pendingRecurrenceScopePrompt != nil,
                title: model.pendingRecurrenceScopePrompt == .delete
                    ? "Delete recurring event"
                    : "Save recurring event",
                onCancel: { model.cancelRecurrenceScopePrompt() },
                onConfirm: { scope in Task { await model.confirmRecurrenceScope(scope) } }
            )
        }
        .overlay {
            ConvertToStandaloneDialogView(
                isPresented: model.pendingConvertToStandaloneConfirmation,
                eventTitle: model.draftStore.gridDraft?.title.isEmpty == false
                    ? (model.draftStore.gridDraft?.title ?? "this event")
                    : "this event",
                onCancel: { model.cancelConvertToStandaloneConfirmation() },
                onConfirm: { Task { await model.confirmConvertToStandalone() } }
            )
        }
        .overlay {
            SendInvitationsDialogView(
                prompt: model.invitationPrompt,
                onCancel: { model.cancelInvitationPrompt() },
                onDontSend: { model.confirmInvitationDontSend() },
                onSend: { model.confirmInvitationSend() }
            )
        }
        .overlay {
            RsvpScopeDialogView(
                isPresented: model.pendingRsvpChoice != nil,
                onCancel: { model.cancelRsvpScopeDialog() },
                onConfirm: { scope in Task { await model.confirmRsvpScope(scope) } }
            )
        }
    }

    /// Web `ResizableSidebarPanel`: drag the divider column to resize. The
    /// sidebar sits on the right, so dragging left widens it.
    private var sidebarResizeHandle: some View {
        SidebarResizeHandle(width: model.sidebarWidth,
            onResize: { model.resizeSidebar(to: $0) }, onCommit: { model.saveSidebarWidth() })
            .frame(width: sidebarDividerWidth)
    }

    /// Mirrors the web sidebar: month picker, Up Next, accounts, then the
    /// status line and the actions bar pinned to the bottom.
    private var sidebar: some View {
        VStack(alignment: .leading, spacing: 0) {
            if model.isEventFormVisible {
                EventFormView(model: model)
            } else if model.viewStore.view == .life {
                LifeSidebarView(model: model)
            } else {
                sidebarBody
            }
            EventJumpStatusLine(model: model)
                .padding(.horizontal, 16)
                .padding(.bottom, 2)
            SidebarSyncStatusLine(model: model)
                .padding(.horizontal, 16)
                .padding(.bottom, 4)
            ShortcutSidebarFooter(levelsStore: model.levelsStore)
                .padding(.horizontal, 16)
                .padding(.bottom, 8)
            sidebarActions
        }
        .pageJumpChipAnchor(id: "calendars")
        .frame(width: model.sidebarWidth)
        .frame(maxHeight: .infinity)
        .background(theme.surfacePanelColor)
        .overlay(alignment: .leading) {
            Rectangle()
                .fill(theme.borderColor)
                .frame(width: 1)
        }
        .overlay {
            Color.clear
                .accessibilityElement()
                .accessibilityIdentifier("compass-native-sidebar")
                .allowsHitTesting(false)
        }
    }

    private var sidebarBody: some View {
        VStack(alignment: .leading, spacing: 24) {
            SidebarMonthPicker(
                displayedMonth: Binding(get: { model.monthPickerMonth }, set: { model.browseMonth($0) }),
                selectedDate: model.viewStore.anchorDate,
                onSelectDate: { model.goToDate($0) },
                focusedDate: model.monthPickerFocusDate,
                visibleDayCount: model.viewStore.visibleDayCount,
                trailingHeader: {
                    HStack(spacing: 8) {
                        TrialBadgeView(billingStore: model.billingStore)
                        ShortcutLevelBadgeView(levelsStore: model.levelsStore) { model.toggleShortcutsLegend() }
                    }
                }
            )
            .pageJumpChipAnchor(id: "month-picker")
            UpNextCard(model: model, onOpen: { model.openUpNextEvent() })
            CalendarListView(model: model)
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 20)
        .padding(.top, 20)
        .padding(.bottom, 20)
    }

    /// Web `SidebarActions`: shortcuts on the left, settings and palette on the right.
    private var sidebarActions: some View {
        HStack(spacing: 8) {
            sidebarActionButton(
                label: model.shortcutsLegendStore.isOpen ? "Close shortcuts" : "Open shortcuts",
                systemImage: "keyboard"
            ) {
                model.toggleShortcutsLegend()
            }
            SidebarRefreshButton(model: model)
            Spacer()
            sidebarActionButton(label: "Open settings", systemImage: "gearshape") {
                model.settingsStore.open()
            }
            sidebarActionButton(label: "Open command palette", systemImage: "command") {
                model.toggleCommandPalette()
            }
        }
        .padding(.horizontal, 12)
        .frame(height: 48)
        .overlay(alignment: .top) {
            Rectangle()
                .fill(theme.borderColor)
                .frame(height: 1)
        }
    }

    private func sidebarActionButton(
        label: String,
        systemImage: String,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            Image(systemName: systemImage)
                .font(.system(size: 14))
                .foregroundStyle(theme.textMutedColor)
                .frame(width: 36, height: 36)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .help(label)
        .accessibilityLabel(label)
    }

    private var header: some View {
        HStack(spacing: 12) {
            HStack(spacing: 12) {
                headerButton(
                    label: model.viewStore.view == .life ? "Previous life variation" : "Previous",
                    systemImage: "chevron.left"
                ) {
                    model.handleShortcut(model.viewStore.view == .life ? .navLifePrev : .navPrevious)
                }
                headerButton(
                    label: model.viewStore.view == .life ? "Next life variation" : "Next",
                    systemImage: "chevron.right"
                ) {
                    model.handleShortcut(model.viewStore.view == .life ? .navLifeNext : .navNext)
                }
                ViewSwitcherView(model: model)
            }
            .padding(.leading, contentLeadingInset)

            Spacer()

            headerButton(
                label: model.isSidebarOpen ? "Close sidebar" : "Open sidebar",
                systemImage: "sidebar.right"
            ) {
                model.isSidebarOpen.toggle()
            }
            .padding(.trailing, 20)
        }
        .frame(height: 48)
        .padding(.top, 20)
        .frame(maxWidth: .infinity)
        .background(theme.backgroundColor)
        .overlay {
            Color.clear
                .accessibilityElement()
                .accessibilityIdentifier("compass-native-header")
                .allowsHitTesting(false)
        }
    }

    private var content: some View {
        Group {
            if model.viewStore.view == .life {
                LifeContentView(model: model)
            } else {
                let focusedEventId = model.timeGridState.focusedEventId
                ZStack(alignment: .topLeading) {
                    TimeGridRepresentable(model: model, focusedEventId: focusedEventId)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .accessibilityElement(children: .contain)
                    EventJumpChipsOverlay(
                        hints: model.timeGridState.eventJumpHints,
                        gridYOffset: gridChipYOffset,
                        visible: !model.timeGridState.eventJumpHints.isEmpty
                    )
                }
                .background(theme.backgroundColor)
                .accessibilityIdentifier("compass-native-content")
            }
        }
        .background {
            GeometryReader { geometry in
                Color.clear
                    .onAppear { model.updateContentTrackWidth(geometry.size.width) }
                    .onChange(of: geometry.size.width) { _, width in
                        model.updateContentTrackWidth(width)
                    }
            }
        }
    }

    private var gridChipYOffset: CGFloat {
        let colWidths = model.timeGridState.resolvedColumnWidths()
        let metrics = model.timeGridState.snapshot(colWidths: colWidths).metrics
        return GridTimeConstants.timedContentDocumentYOffset(
            allDayRowHeight: metrics.allDayRowHeight
        )
    }

    @ViewBuilder
    private var pointerHintLayer: some View {
        if model.activeOnboardingSurface == .pointerHint, model.pointerHintStore.isVisible {
            PointerHintView(store: model.pointerHintStore, registry: model.shortcutRegistry)
                .padding(.top, 16)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
                .allowsHitTesting(true)
        }
    }

    private func headerButton(
        label: String,
        systemImage: String,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            Image(systemName: systemImage)
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(theme.textMutedColor)
                .frame(width: 24, height: 24)
        }
        .buttonStyle(.plain)
        .help(label)
        .accessibilityLabel(label)
    }
}
