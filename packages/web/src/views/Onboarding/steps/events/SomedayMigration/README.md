# SomedayMigration Component

An interactive onboarding step demonstrating how to migrate "someday" events, with a responsive calendar and a hand‑drawn ellipse highlighting the current week.

## Features

- 3‑column layout: sidebar (events), middle (calendar), right (instructions)
- Displays 3 sample someday events in a sidebar
- Clickable events that log to console when clicked
- Keyboard navigation support (Enter and Space keys)
- Integrated with OnboardingTwoRowLayout
- Responsive, hand‑drawn ellipse highlighting the current week’s day labels (e.g., 7–13 for 9/11)
- Fully accessible with proper ARIA attributes

## Usage

```tsx
import { SomedayMigration } from "./SomedayMigration";

<SomedayMigration
  currentStep={1}
  totalSteps={3}
  onNext={() => console.log("Next clicked")}
  onPrevious={() => console.log("Previous clicked")}
  onSkip={() => console.log("Skip clicked")}
/>;
```

## Layout Structure

The component uses a 3‑column layout:

- **Left Column**: Sidebar with 3 sample someday events
- **Middle Column**: Compact month calendar with current week highlighted by a hand‑drawn ellipse
- **Right Column**: Instructional text and guidance

## Events

The component displays 3 sample events:

- 💸 File taxes (Work priority)
- 🥗 Get groceries (Self priority)
- 🏠 Book Airbnb (Relationships priority)

## Interaction

- Click any event to log it to the console
- Use Enter or Space keys when focused on an event
- Events are styled with different colors based on priority

## Testing

The component includes comprehensive tests that verify:

- Event rendering
- Click interactions
- Keyboard navigation
- Console logging
- Accessibility attributes

Run tests with:

```bash
yarn test:web --testPathPattern="SomedayMigration"
```
