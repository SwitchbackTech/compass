import CompassData
import CompassKit
import SwiftUI

struct LifeSidebarView: View {
  @Environment(\.nativeWebTheme) private var theme
  @Bindable var model: NativeCalendarRootModel
  @State private var birthDate = ""
  @State private var lifespan = ""
  @State private var invalidBirthDate = false
  @FocusState private var focusedField: Field?
  private enum Field { case birthDate, lifespan }

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 32) {
        VStack(alignment: .leading, spacing: 8) {
          HStack(spacing: 4) {
            variationButton(
              "Previous life variation in sidebar", symbol: "chevron.left", direction: -1)
            variationButton("Next life variation in sidebar", symbol: "chevron.right", direction: 1)
            Text(LifeMath.variations[model.lifeStore.preferences.variation]?.label ?? "Average")
              .fontWeight(.semibold).foregroundStyle(theme.textColor)
            Spacer(minLength: 0)
            ShortcutLevelBadgeView(levelsStore: model.levelsStore) { model.toggleShortcutsLegend() }
          }
          Text("This is your life if you live to \(model.lifeStore.preferences.lifespan)")
          Text("Each dot represents one week of your life, and each row represents one year.")
        }
        Text(model.lifeStore.summary)
          .fontWeight(.medium).foregroundStyle(theme.textColor)
          .frame(maxWidth: .infinity).multilineTextAlignment(.center)
          .accessibilityAddTraits(.updatesFrequently)
        VStack(spacing: 16) {
          VStack(spacing: 4) {
            Text("Date of birth").help("We don't store this information")
            TextField("Select date", text: $birthDate)
              .accessibilityLabel("Date of birth")
              .focused($focusedField, equals: .birthDate)
              .onSubmit { commitBirthDate() }
              .help("Enter a date as yyyy-mm-dd")
              .padding(.vertical, 8).frame(width: 176)
              .background(theme.surfaceColor).foregroundStyle(theme.textColor)
              .clipShape(RoundedRectangle(cornerRadius: 4))
          }
          VStack(spacing: 4) {
            HStack(spacing: 4) {
              Text("Age of Death")
              Button {
                model.lifeStore.shuffleRandomVariation()
              } label: {
                Image(systemName: "shuffle").frame(width: 24, height: 24)
              }
              .buttonStyle(.plain).accessibilityLabel("Shuffle life variation")
            }
            .frame(maxWidth: .infinity)
            TextField("Age of Death", text: $lifespan)
              .accessibilityLabel("Age of Death")
              .focused($focusedField, equals: .lifespan)
              .onSubmit { commitLifespan() }
              .padding(.vertical, 8).frame(width: 80)
              .background(theme.surfaceColor).foregroundStyle(theme.textColor)
              .clipShape(RoundedRectangle(cornerRadius: 4))
          }
        }
        .textFieldStyle(.plain)
        .multilineTextAlignment(.center)
        Text("“Lost time is never found again.” (Benjamin Franklin)").italic()
      }
      .font(.rubik(14))
      .foregroundStyle(theme.textMutedColor)
      .padding(20)
    }
    .onAppear { refreshInputs() }
    .onChange(of: model.lifeStore.preferences) { _, _ in refreshInputs() }
    .onChange(of: focusedField) { old, _ in
      if old == .birthDate { commitBirthDate() }
      if old == .lifespan { commitLifespan() }
    }
  }

  private func variationButton(_ label: String, symbol: String, direction: Int) -> some View {
    Button {
      model.lifeStore.cycleVariation(direction: direction)
    } label: {
      Image(systemName: symbol).font(.system(size: 12)).frame(width: 24, height: 24)
    }
    .buttonStyle(.plain).accessibilityLabel(label)
  }

  private func refreshInputs() {
    birthDate = model.lifeStore.preferences.birthDate
    lifespan = String(model.lifeStore.preferences.lifespan)
  }

  private func commitBirthDate() {
    invalidBirthDate = !model.lifeStore.updateBirthDate(birthDate)
    refreshInputs()
  }

  private func commitLifespan() {
    if let value = Double(lifespan) { model.lifeStore.updateLifespan(value) }
    refreshInputs()
  }
}
