import CompassKit
import SwiftUI

/// Web `FormCardIconRow`: muted 16px icon column with aligned field content.
struct EventFormIconRow<Content: View>: View {
    let icon: PhosphorIcon
    var alignTop = false
    @ViewBuilder var content: () -> Content

    var body: some View {
        HStack(alignment: alignTop ? .top : .center, spacing: 8) {
            PhosphorIconView(icon: icon, size: 16)
                .frame(width: 16, height: 16, alignment: .center)
            content()
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .frame(minHeight: 32, alignment: alignTop ? .top : .center)
    }
}
