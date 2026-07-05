import { createRequire } from 'module';

import { DeviceListener } from 'types/DeviceListener';
import type { UiohookLike } from 'types/DeviceListener';

interface UiohookModule {
  uIOhook: UiohookLike;
}

const require = createRequire(import.meta.url);

function createDefaultUiohook(): UiohookLike {
  // Lazy require is intentional: a static import loads the native addon during
  // module evaluation, before Wayland/DISPLAY diagnostics can be reported.
  return (require('uiohook-napi') as UiohookModule).uIOhook;
}

export const deviceListener = new DeviceListener({
  hookFactory: createDefaultUiohook,
});
