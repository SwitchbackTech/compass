import SwiftUI

struct EventFormSectionChrome: ViewModifier {
    @Environment(\.nativeWebTheme) private var theme
    let focused: Bool

    func body(content: Content) -> some View {
        content
            .font(.rubik(13))
            .controlSize(.small)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(10)
            .background(theme.surfaceOverlayColor)
            .clipShape(RoundedRectangle(cornerRadius: 4))
            .overlay(
                RoundedRectangle(cornerRadius: 4)
                    .stroke(focused ? theme.accentColor : .clear, lineWidth: 1)
            )
    }
}

extension View {
    func eventFormSectionChrome(focused: Bool) -> some View {
        modifier(EventFormSectionChrome(focused: focused))
    }
}
