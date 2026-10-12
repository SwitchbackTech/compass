import CompassData
import CompassKit
import SwiftUI

/// Web `SidebarEventDetails`: the form replaces the sidebar's body while a
/// draft is open, so `RootView` hosts it in the sidebar column.
public struct EventFormView: View {
    @Environment(\.nativeWebTheme) private var theme
    @Bindable public var model: NativeCalendarRootModel
    @FocusState private var titleFocused: Bool

    public init(model: NativeCalendarRootModel) {
        self.model = model
    }

    public var body: some View {
        if model.isEventFormVisible, let draft = model.draftStore.gridDraft {
            formPanel(draft: draft)
                .overlayPreferenceValue(PageJumpChipAnchorKey.self) { anchors in
                ModHoldChipsOverlay(
                    targets: model.formFieldDigitTargets(),
                    anchors: anchors,
                    visible: model.formFieldDigitHintsVisible,
                    accessibilityIdentifier: "compass-form-field-digit-chips"
                )
            }
        }
    }

    private func formPanel(draft: GridEventDraft) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            EventFormToolbarView(
                isExistingEvent: draft.kind == .edit,
                onClose: { model.requestCloseEventForm() },
                onDuplicate: { Task { await model.duplicateFocusedOrFormEvent() } },
                onDelete: { Task { await model.deleteFormEvent() } }
            )
            .pageJumpChipAnchor(id: "form-actions")

            TextField("Title", text: Binding(
                get: { draft.title },
                set: { model.updateDraftFromForm(title: $0) }
            ))
            .textFieldStyle(.plain)
            .font(.rubik(16))
            .foregroundStyle(theme.textColor)
            .focused($titleFocused)
            .pageJumpChipAnchor(id: "form-title")

            DescriptionEditorView(
                html: Binding(
                    get: { draft.description },
                    set: { model.updateDraftFromForm(description: $0) }
                ),
                resetKey: draft.persistedEventId?.rawValue ?? draft.clientId.rawValue,
                isFocused: model.eventFormFocusedField == .description
            )
            .frame(minHeight: 72, maxHeight: 140)
            .padding(8)
            .background(theme.surfacePanelColor)
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(
                        model.eventFormFocusedField == .description ? theme.accentColor : theme.borderColor,
                        lineWidth: 1
                    )
            )
            .pageJumpChipAnchor(id: "form-description")

            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    EventFormLocationField(
                        model: model,
                        draft: draft,
                        focusField: model.eventFormFocusedField
                    )
                    EventFormScheduleSection(
                        model: model,
                        draft: draft,
                        focusField: model.eventFormFocusedField
                    )
                    EventFormCalendarSection(
                        model: model,
                        draft: draft,
                        focusField: model.eventFormFocusedField
                    )
                    EventFormColorSection(
                        model: model,
                        draft: draft,
                        focusField: model.eventFormFocusedField
                    )
                    EventFormRecurrenceSection(
                        model: model,
                        draft: draft,
                        focusField: model.eventFormFocusedField
                    )
                    EventFormConferenceSection(
                        model: model,
                        draft: draft,
                        focusField: model.eventFormFocusedField
                    )
                    EventFormAttendeesSection(
                        model: model,
                        draft: draft,
                        focusField: model.eventFormFocusedField
                    )
                    EventFormRsvpSection(
                        model: model,
                        draft: draft,
                        focusField: model.eventFormFocusedField
                    )
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, 20)
        .padding(.bottom, 16)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("compass-event-form")
        .onAppear {
            titleFocused = true
            model.eventFormFocusedField = .title
        }
        .onChange(of: model.eventFormFocusedField) { _, field in
            titleFocused = field == .title
        }
    }
}
