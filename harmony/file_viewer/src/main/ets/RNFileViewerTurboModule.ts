import { TurboModule, TurboModuleContext } from '@rnoh/react-native-openharmony/ts';
import { TM } from '@rnoh/react-native-openharmony/generated/ts';
import { BusinessError } from '@kit.BasicServicesKit';
import { filePreview } from '@kit.PreviewKit';
import fileUri from '@ohos.file.fileuri';
import { Context, common, Want } from '@kit.AbilityKit';
import wantConstant from '@ohos.app.ability.wantConstant';
import fs from '@ohos.file.fs';
import mime from 'mime';
import EventEmitter from './EventMitter';
import type { ISubscribe } from './EventMitter';

type EmitID = ISubscribe['id'];

interface RNFileViewerOptions {
  displayName?: string;
  showAppsSuggestions?: boolean;
  showOpenWithDialog?: boolean;
}

// 派发事件名称
const OPEN_EVENT: string = 'RNFileViewerDidOpen';
const DISMISS_EVENT: string = 'RNFileViewerDidDismiss';
const eventEmitter = new EventEmitter();

export class RNFileViewerTurboModule extends TurboModule implements TM.FileViewerNativeModule.Spec {
  constructor(protected ctx: TurboModuleContext) {
    super(ctx);
    this.ctx = ctx;
  }

  open(filepath: string, currentId: number, options: RNFileViewerOptions | string = {}): Promise<void> {
    const _options = typeof options === 'string' ? { displayName: options } : options;

    return new Promise((resolve, reject) => {
      const openSubscription = eventEmitter.$on(
        OPEN_EVENT,
        (id: EmitID, error: string) => {
          if (id === openSubscription.id) {
            openSubscription.$off();
            return error ? reject(new Error(error)) : resolve();
          }
        },
      );

      const dismissSubscription = eventEmitter.$on(
        DISMISS_EVENT,
        (id: EmitID) => {
          if (id === dismissSubscription.id) {
            this.ctx.rnInstance.emitDeviceEvent(DISMISS_EVENT, { id: currentId });
            dismissSubscription.$off();
          }
        },
      );

      // 判断文件是否存在
      fs.stat(filepath)
        .then((stat: fs.Stat) => {
          this.OpenFile(filepath, this.ctx, _options);
          console.info('get file info succeed, the size of file is ' + stat.size);
          resolve();
        })
        .catch((err: BusinessError) => {
          console.error('get file info failed with error message: ' + err.message + ', error code: ' + err.code);
          reject('get file info failed with error message: ' + err.message + ', error code: ' + err.code);
          throw err;
        });
    });
  }

  private async OpenFile(uri: string, ctx: TurboModuleContext, options: RNFileViewerOptions): Promise<void> {
    const { showOpenWithDialog, showAppsSuggestions, displayName } = options;
    const uiContext: Context = ctx.uiAbilityContext;

    // 获取前提信息
    const fUri: fileUri.FileUri = new fileUri.FileUri(uri);
    const filename: string = fUri.name;
    const fileExt: string = filename.substring(filename.lastIndexOf('.'));
    const fileMimeType: string = mime.getType(fileExt);

    const context = uiContext as common.UIAbilityContext; // UIAbilityContext

    // 是否支持直接预览
    const canPreviewFlag: boolean = await filePreview.canPreview(
      uiContext,
      uri,
    );

    // 非多种预览方式,直接进行预览
    if (canPreviewFlag && !showOpenWithDialog) {
      const showFileName = displayName ? displayName : filename.split('.')[0];
      // action: 'ohos.want.action.viewData'
      this.OpenByFilePreview(ctx, uri, fileMimeType, showFileName);
      return;
    }

    let want: Want = {
      type: fileMimeType,
      uri: 'file://' + uri,
      flags: wantConstant.Flags.FLAG_AUTH_READ_URI_PERMISSION,
    };

    // 跳转应用商店
    if (showAppsSuggestions) {
      want = {
        uri: `store://appgallery.huawei.com/app`,
      };
    }

    try {
      context.startAbilityForResult(
        want,
        (err: BusinessError, result: common.AbilityResult) => {
          if (err.code) {
            // 处理业务逻辑错误
            console.error(`startAbilityForResult failed, code is ${err.code}, message is ${err.message}`);
            throw new Error(err.message);
          }
          eventEmitter.$emit(OPEN_EVENT);
          // 关闭ability
          if (result.resultCode === -1) {
            eventEmitter.$emit(DISMISS_EVENT);
          }
        },
      );
    } catch (error) {
      console.error(`Failed to startAbility. message: ${error}`);
      eventEmitter.$emit(OPEN_EVENT, error);
    }
  }

  // filePreview能够展示自定义name，无关闭回调
  private OpenByFilePreview(
    ctx: TurboModuleContext,
    uri: string,
    fileMimeType: string,
    filename: string,
  ): void {
    const uiContext: Context = ctx.uiAbilityContext;

    // 计算打开窗口大小及居中位置
    const screenInfo = ctx.getDisplayMetrics().screenPhysicalPixels;
    const screenWidth = screenInfo.width / screenInfo.scale;
    const screenHeight = screenInfo.height / screenInfo.scale;
    const offsetX =
      screenInfo.width > screenWidth ? (screenInfo.width - screenWidth) / 2 : 0;
    const offsetY =
      screenInfo.height > screenHeight
        ? (screenInfo.height - screenHeight) / 2
        : 0;

    // 调用OS filePreview 进行预览
    const displayInfo: filePreview.DisplayInfo = {
      x: offsetX,
      y: offsetY,
      width: screenWidth,
      height: screenHeight,
    };

    const fileInfo: filePreview.PreviewInfo = {
      title: filename,
      uri: 'file://' + uri,
      mimeType: fileMimeType,
    };

    // 打开预览窗口
    filePreview
      .openPreview(uiContext, fileInfo, displayInfo)
      .then(() => {
        eventEmitter.$emit(OPEN_EVENT);
      })
      .catch((err: BusinessError) => {
        console.error(`Failed to openPreview, err.code = ${err.code}, err.message = ${err.message}`);
        eventEmitter.$emit(OPEN_EVENT, err);
        throw new Error(err.message);
      });
  }

  public addListener(eventType: string): void {
  }

  public removeListeners(count: number): void {
  }
}


