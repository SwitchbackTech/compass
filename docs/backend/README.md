# Compass Backend

## Status

The backend currently supports an integration with Google Calendar. Our app code is tightly-coupled with Google Calendar, which is not good. As we make changes, we should ensure that we're decoupling the app code from Google Calendar rather than coupling it more. The reason for this is that we want to be able to use the backend with other calendar providers in the future, such as Office 365 and Apple Calendar.
