import CompassData
import SwiftUI

/// Web `SidebarRefreshButton`: offered once live updates have been down a
/// while. It reconnects and reloads.
struct SidebarRefreshButton: View {
    @Environment(\.nativeWebTheme) private var theme
    @Bindable var model: NativeCalendarRootModel

    var body: some View {
        TimelineView(.periodic(from: .now, by: 5)) { context in
            if model.isSidebarRefreshDue(now: context.date) {
                Button {
                    model.refreshFromSidebar()
                } label: {
                    Label("Refresh", systemImage: "arrow.clockwise")
                        .font(.rubik(12))
                        .foregroundStyle(theme.textMutedColor)
                        .padding(.horizontal, 8)
                        .frame(height: 36)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .help("Reload for the latest version")
            }
        }
    }
}
