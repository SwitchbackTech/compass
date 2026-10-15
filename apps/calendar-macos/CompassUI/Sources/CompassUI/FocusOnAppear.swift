import SwiftUI

extension View {
    /// Focuses a field once it is on screen. Setting `@FocusState` inside
    /// `onAppear` runs before the field joins the window's key view loop, so
    /// whichever control held first responder (the header Previous button at
    /// launch) keeps it and typing never reaches the field. One run loop later
    /// the field can take first responder.
    func focusOnAppear(_ focused: FocusState<Bool>.Binding) -> some View {
        onAppear {
            DispatchQueue.main.async {
                focused.wrappedValue = true
            }
        }
    }
}
