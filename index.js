/*
 * Copyright (c) 2024 Huawei Device Co., Ltd. All rights reserved
 * Use of this source code is governed by a MIT license that can be
 * found in the LICENSE file.
 */
import { NativeEventEmitter, NativeModules, Platform, TurboModuleRegistry } from 'react-native';

const RNFileViewer = TurboModuleRegistry ? TurboModuleRegistry.get('FileViewerNativeModule') : NativeModules.RNFileViewer;
const eventEmitter = new NativeEventEmitter(RNFileViewer);

let lastId = 0;

function open(path, options = {}) {
  const _options = typeof options === 'string' ? { displayName: options } : options;
  const { onDismiss, ...nativeOptions } = _options;

  if (!['android', 'ios', 'harmony'].includes(Platform.OS)) {
    return RNFileViewer.open(path, _options);
  }

  return new Promise((resolve, reject) => {
    const currentId = ++lastId;

    const openSubscription = eventEmitter.addListener('RNFileViewerDidOpen', ({ id, error }) => {
      if (id === currentId) {
        openSubscription.remove();
        return error ? reject(new Error(error)) : resolve();
      }
    });
    const dismissSubscription = eventEmitter.addListener('RNFileViewerDidDismiss', ({ id }) => {
      if (id === currentId) {
        dismissSubscription.remove();
        onDismiss && onDismiss();
      }
    });

    RNFileViewer.open(normalize(path), currentId, nativeOptions);
  });
}

function normalize(path) {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    const filePrefix = 'file://';
    if (path.startsWith(filePrefix)) {
      path = path.substring(filePrefix.length);
      try {
        path = decodeURI(path);
      } catch (e) { }
    }
  }
  return path;
}

export default { open };
export { open };
