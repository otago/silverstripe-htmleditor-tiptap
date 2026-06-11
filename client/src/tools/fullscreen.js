import screenfull from 'screenfull';

const fullscreenTool = {
  action: 'fullscreen',
  getToolbarConfig({ tooltips }) {
    return {
      type: 'button',
      title: tooltips.fullscreen || 'Toggle Fullscreen',
      action: 'fullscreen',
      extension: 'custom',
    };
  },
  run({ button, context }) {
    if (!screenfull.isEnabled) {
      return;
    }

    const wrapper = button.closest(`.${context.constants.CSS_CLASSES.WRAPPER}`)[0];
    if (screenfull.isFullscreen) {
      screenfull.exit();
      return;
    }

    screenfull.request(wrapper);
  },
  isActive() {
    return screenfull.isEnabled ? screenfull.isFullscreen : false;
  },
  isDisabled() {
    return !screenfull.isEnabled;
  },
};

export default fullscreenTool;
