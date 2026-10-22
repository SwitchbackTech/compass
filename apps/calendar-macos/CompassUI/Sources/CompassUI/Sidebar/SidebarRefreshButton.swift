import CompassData
import CompassKit
import SwiftUI

/// Web `SidebarRefreshButton`: offered once live updates have been down a
/// while. It reconnects and reloads.
struct SidebarRefreshButton: View {
    @Environment(\.nativeWebTheme) private var theme
    @Bindable var model: NativeCalendarRootModel

    private let slotWidth: CGFloat = 76

    var body: some View {
        TimelineView(.periodic(from: .now, by: 5)) { context in
            Group {
                if model.isSidebarRefreshDue(now: context.date) {
                    Button {
                        model.refreshFromSidebar()
                    } label: {
                        HStack(spacing: 6) {
                            PhosphorIconView(icon: .arrowClockwise, size: 16)
                            Text("Refresh")
                                .font(.rubik(12))
                                .foregroundStyle(theme.textMutedColor)
                        }
                        .padding(.horizontal, 8)
                        .frame(height: 36)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .help("Reload for the latest version")
                }
            }
            .frame(width: slotWidth, height: 36, alignment: .leading)
        }
    }
}
