export class WeekInteractionController {
  canOwnPointerDown(_event?: PointerEvent): boolean {
    return false;
  }

  handlePointerDown(event: PointerEvent): boolean {
    return this.canOwnPointerDown(event);
  }
}
