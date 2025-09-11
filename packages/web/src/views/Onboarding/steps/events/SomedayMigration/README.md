# SomedayMigration Component

An interactive sandbox component for demonstrating someday event migration during onboarding.

## Features

- **3-Column Layout**: Left sidebar with events, middle column with rectangle, right column with instructions
- Displays 3 sample someday events in a sidebar
- Clickable events that log to console when clicked
- Keyboard navigation support (Enter and Space keys)
- Integrated with OnboardingTwoRowLayout
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

The component uses a 3-column layout:

- **Left Column**: Sidebar with 3 sample someday events
- **Middle Column**: Simple rectangle placeholder (200x120px)
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
