import CompassKit
import Foundation

extension NativeCalendarRootModel {
    public var isLifeViewIntroActive: Bool {
        viewStore.view == .life && lifeViewIntroStore.isMounted
    }

    public func refreshLifeViewIntro() {
        lifeViewIntroStore.refresh(
            onLifeView: viewStore.view == .life,
            authenticated: isSignedIn,
            userMetadataLoaded: onboardingStore.userMetadataLoaded,
            seenOnServer: LifeViewIntroGating.readSeenFromMetadata(
                syncConnectionsStore.lastLoadedMetadata))
    }

    public func dismissLifeViewIntro(reason: LifeViewIntroDismissReason) {
        lifeViewIntroStore.dismiss(reason: reason, authenticated: isSignedIn)
    }
}
