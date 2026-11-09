const PREVIEW_KEYS = new Set([
  'Backspace', 'Delete', 'Enter', 'Tab', 'Shift+Tab', 'Escape', 'ArrowLeft', 'ArrowRight',
  'ArrowUp', 'ArrowDown', 'Home', 'End', 'ControlOrMeta+A'
]);

function validPreviewAction(action) {
  switch (action?.type) {
    case 'click':
    case 'wheel':
      return Number.isFinite(action.x) && Number.isFinite(action.y) &&
        action.x >= 0 && action.x <= 1 && action.y >= 0 && action.y <= 1 &&
        (action.type === 'click' || (Number.isFinite(action.dx) && Number.isFinite(action.dy) &&
          Math.abs(action.dx) <= 2000 && Math.abs(action.dy) <= 2000));
    case 'key':
      return PREVIEW_KEYS.has(action.key);
    case 'text':
      return typeof action.text === 'string' && action.text.length > 0 && action.text.length <= 4096;
    case 'restart':
    case 'stop':
      return true;
    default:
      return false;
  }
}

function attachReplayPreview(page, entryUrl) {
  let capturing = false;
  let timer;
  let previewUntil = 0;
  let lastFrame;
  let unchanged = 0;
  let urgent = false;
  let queued = 0;
  let actions = Promise.resolve();

  function schedule(delay) {
    if (capturing || page.isClosed() || !process.connected || Date.now() >= previewUntil) return;
    clearTimeout(timer);
    timer = setTimeout(capture, delay);
  }

  async function capture() {
    timer = undefined;
    if (page.isClosed() || !process.connected || Date.now() >= previewUntil) return;
    capturing = true;
    urgent = false;
    const started = Date.now();
    try {
      const image = await page.screenshot({ type: 'jpeg', quality: 90, scale: 'device', timeout: 1500 });
      if (lastFrame?.equals(image)) unchanged++;
      else if (process.connected) {
        unchanged = 0;
        lastFrame = image;
        process.send({ frame: image.toString('base64') }, () => {});
      }
    } catch {
      // A navigation in progress can interrupt capture. Retry on the next frame.
    } finally {
      capturing = false;
      schedule(urgent ? 0 : Math.max(0, (unchanged > 3 ? 240 : 90) - (Date.now() - started)));
    }
  }

  function handle(message) {
    if (message?.preview) {
      previewUntil = Date.now() + 5500;
      if (!timer) schedule(0);
      return;
    }
    const action = message?.action;
    if (!validPreviewAction(action)) return;
    if (action.type === 'stop') {
      page.close().catch(() => {});
      return;
    }
    if (queued >= 12) return;
    queued++;
    actions = actions.then(async () => {
      if (page.isClosed()) return;
      switch (action.type) {
        case 'restart':
          await page.goto(entryUrl, { waitUntil: 'commit', timeout: 15000 });
          break;
        case 'click':
        case 'wheel': {
          const { width, height } = page.viewportSize();
          const x = action.x * (width - 1);
          const y = action.y * (height - 1);
          if (action.type === 'click') await page.touchscreen.tap(x, y);
          else {
            await page.mouse.move(x, y);
            await page.mouse.wheel(action.dx, action.dy);
          }
          break;
        }
        case 'key':
          await page.keyboard.press(action.key);
          break;
        case 'text':
          await page.keyboard.insertText(action.text);
          break;
      }
    }).catch(() => {
      // A page may close or navigate while an action is queued.
    }).finally(() => {
      queued--;
      urgent = true;
      schedule(0);
    });
  }
  process.on('message', handle);
  page.once('close', () => {
    clearTimeout(timer);
    process.removeListener('message', handle);
  });
}

module.exports = { PREVIEW_KEYS, validPreviewAction, attachReplayPreview };
