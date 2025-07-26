// @ts-nocheck
class TributeMenuEvents {
  constructor(tribute) {
    this.tribute = tribute;
    this.tribute.menuEvents = this;
    this.menu = this.tribute.menu;
  }

  bind() {
    this.menuClickEvent = this.tribute.events.click.bind(null, this);
    this.menuContainerScrollEvent = this.debounce(
      () => {
        if (this.tribute.isActive) {
          this.tribute.showMenuFor(this.tribute.current.element, false);
        }
      },
      300,
      false
    );
    this.windowResizeEvent = this.debounce(
      () => {
        if (this.tribute.isActive) {
          this.tribute.range.positionMenuAtCaret(true);
        }
      },
      300,
      false
    );

    document.addEventListener("click", this.menuClickEvent, false);
    window.addEventListener("resize", this.windowResizeEvent);

    // jwbth: Added this line to make the menu change its height if its lower border is off screen.
    window.addEventListener("scroll", this.windowResizeEvent);

    if (this.menuContainer) {
      this.menuContainer.addEventListener(
        "scroll",
        this.menuContainerScrollEvent,
        false
      );
    } else {
      window.addEventListener("scroll", this.menuContainerScrollEvent);
    }
  }

  unbind() {
    document.removeEventListener("click", this.menuClickEvent, false);
    window.removeEventListener("resize", this.windowResizeEvent);

    // jwbth: Added this line, see above.
    window.removeEventListener("scroll", this.windowResizeEvent);

    if (this.menuContainer) {
      this.menuContainer.removeEventListener(
        "scroll",
        this.menuContainerScrollEvent,
        false
      );
    } else {
      window.removeEventListener("scroll", this.menuContainerScrollEvent);
    }
  }

  debounce(func, wait, immediate) {
    var timeout;
    return () => {
      var context = this,
        args = arguments;
      var later = () => {
        timeout = null;
        if (!immediate) func.apply(context, args);
      };
      var callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func.apply(context, args);
    };
  }
}

export default TributeMenuEvents;
