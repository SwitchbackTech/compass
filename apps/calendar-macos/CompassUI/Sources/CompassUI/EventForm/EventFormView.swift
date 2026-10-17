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
            .accessibilityIdentifier("compass-event-form-title")
            .pageJumpChipAnchor(id: "form-title")

            ScrollViewReader { proxy in
                ScrollView {
                    VStack(alignment: .leading, spacing: 12) {
                        EventFormScheduleSection(
                            model: model,
                            draft: draft,
                            focusField: model.eventFormFocusedField
                        )
                        .id(EventFormField.start)
                        EventFormRecurrenceSection(
                            model: model,
                            draft: draft,
                            focusField: model.eventFormFocusedField
                        )
                        .id(EventFormField.recurrence)
                        EventFormCalendarSection(
                            model: model,
                            draft: draft,
                            focusField: model.eventFormFocusedField
                        )
                        .id(EventFormField.calendar)
                        EventFormColorSection(
                            model: model,
                            draft: draft,
                            focusField: model.eventFormFocusedField
                        )
                        .id(EventFormField.color)
                        EventFormLocationField(
                            model: model,
                            draft: draft,
                            focusField: model.eventFormFocusedField
                        )
                        .id(EventFormField.location)
                        DescriptionEditorView(
                            html: Binding(
                                get: { draft.description },
                                set: { model.updateDraftFromForm(description: $0) }
                            ),
                            resetKey: draft.persistedEventId?.rawValue ?? draft.clientId.rawValue,
                            isFocused: model.eventFormFocusedField == .description,
                            isEditable: !model.isEventFormReadOnly(for: draft)
                        )
                        .frame(minHeight: 72, maxHeight: 140)
                        .padding(8)
                        .background(theme.surfaceOverlayColor)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(
                                    model.eventFormFocusedField == .description ? theme.accentColor : theme.borderColor,
                                    lineWidth: 1
                                )
                        )
                        .pageJumpChipAnchor(id: "form-description")
                        .id(EventFormField.description)

                        EventFormConferenceSection(
                            model: model,
                            draft: draft,
                            focusField: model.eventFormFocusedField
                        )
                        .id(EventFormField.conference)
                        EventFormAttendeesSection(
                            model: model,
                            draft: draft,
                            focusField: model.eventFormFocusedField
                        )
                        .id(EventFormField.attendees)
                        EventFormRsvpSection(
                            model: model,
                            draft: draft,
                            focusField: model.eventFormFocusedField
                        )
                        .id(EventFormField.rsvp)
                    }
                }
                .onChange(of: model.eventFormFocusedField) { _, field in
                    proxy.scrollTo(field == .end ? EventFormField.start : field, anchor: .center)
                }
            }
            if !model.isEventFormReadOnly(for: draft) {
                Button {
                    Task { await model.saveDraft() }
                } label: {
                    HStack(spacing: 8) {
                        Text("Save")
                        ShortcutHintChip(label: "Enter")
                    }
                    .font(.rubik(14, weight: .medium))
                    .foregroundStyle(theme.backgroundColor)
                    .frame(maxWidth: .infinity, minHeight: 40)
                    .background(theme.textColor)
                    .clipShape(RoundedRectangle(cornerRadius: 4))
                }
                .buttonStyle(.plain)
                .disabled(model.hasPendingEventMutations)
                .accessibilityLabel("Save")
                .accessibilityIdentifier("compass-event-form-save")
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, 20)
        .padding(.bottom, 16)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("compass-event-form")
        .focusOnAppear($titleFocused)
        .onAppear {
            model.eventFormFocusedField = .title
        }
        .onChange(of: model.eventFormFocusedField) { _, field in
            titleFocused = field == .title
        }
    }
}
