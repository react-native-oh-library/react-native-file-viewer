import type { TurboModule } from 'react-native/Libraries/TurboModule/RCTExport';
import { TurboModuleRegistry } from 'react-native';

export interface RNFileViewerOptions {
  displayName?: string;
  showAppsSuggestions?: boolean;
  showOpenWithDialog?: boolean;
}

export interface Spec extends TurboModule {
  open: (filepath: string, id: number, options?: RNFileViewerOptions | string) => Promise<void>;
  addListener: (eventType: string) => void;
  removeListeners: (count: number) => void;
}

export default TurboModuleRegistry.get<Spec>('FileViewerNativeModule') as Spec | null;