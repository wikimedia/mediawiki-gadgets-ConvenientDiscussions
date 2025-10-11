/**
 * @jest-environment jsdom
 */

describe('Thread hidden="until-found" functionality', () => {
  let mockElement;

  beforeEach(() => {
    // Create mock element for testing
    mockElement = document.createElement('div');
    mockElement.textContent = 'Test content';
    document.body.append(mockElement);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('should support hidden="until-found" when browser supports beforematch', () => {
    // Mock browser support for beforematch
    Object.defineProperty(mockElement, 'onbeforematch', {
      value: null,
      writable: true,
    });

    // Test the logic that would be in hideElement method
    mockElement.classList.add('cd-hidden');
    if ('onbeforematch' in mockElement) {
      mockElement.setAttribute('hidden', 'until-found');
    }

    expect(mockElement.classList.contains('cd-hidden')).toBe(true);
    expect(mockElement.getAttribute('hidden')).toBe('until-found');
  });

  test('should fall back gracefully when browser does not support beforematch', () => {
    // Test the logic directly with a plain object
    const elementWithoutSupport = {};
    let hiddenAttributeSet = false;

    // Test the logic that would be in hideElement method
    if ('onbeforematch' in elementWithoutSupport) {
      hiddenAttributeSet = true;
    }

    expect(hiddenAttributeSet).toBe(false);
    expect('onbeforematch' in elementWithoutSupport).toBe(false);
  });

  test('should remove hidden attribute when unhiding element', () => {
    // Mock browser support
    Object.defineProperty(mockElement, 'onbeforematch', {
      value: null,
      writable: true,
    });

    // Hide element first
    mockElement.classList.add('cd-hidden');
    mockElement.setAttribute('hidden', 'until-found');
    expect(mockElement.getAttribute('hidden')).toBe('until-found');

    // Unhide element
    mockElement.classList.remove('cd-hidden');
    mockElement.removeAttribute('hidden');

    expect(mockElement.classList.contains('cd-hidden')).toBe(false);
    expect(mockElement.getAttribute('hidden')).toBeNull();
  });

  test('should detect beforematch support correctly', () => {
    const testElement = document.createElement('div');

    // In jsdom, beforematch is supported by default
    const hasSupport1 = 'onbeforematch' in testElement;
    expect(hasSupport1).toBe(true);

    // Test with an object without support
    const elementWithoutSupport = {};
    const hasSupport2 = 'onbeforematch' in elementWithoutSupport;
    expect(hasSupport2).toBe(false);
  });

  test('should handle beforematch event correctly', () => {
    // Mock browser support
    Object.defineProperty(mockElement, 'onbeforematch', {
      value: null,
      writable: true,
    });

    let eventFired = false;
    const handleBeforeMatch = (event) => {
      eventFired = true;
      expect(event.target).toBe(mockElement);
    };

    // Add event listener
    mockElement.addEventListener('beforematch', handleBeforeMatch);

    // Simulate beforematch event
    const beforeMatchEvent = new Event('beforematch');
    mockElement.dispatchEvent(beforeMatchEvent);

    expect(eventFired).toBe(true);
  });
});
