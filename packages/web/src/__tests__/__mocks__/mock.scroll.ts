export const mockScroll = () => {
  window.HTMLElement.prototype.scroll = jest.fn();
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
};
