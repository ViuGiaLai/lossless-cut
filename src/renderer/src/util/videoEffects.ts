import type { BlurSettings, TextRemovalSettings, VideoExportEncoder, WatermarkPosition, WatermarkSettings } from '../../../common/types';

export interface VideoDimensions {
  width?: number | undefined;
  height?: number | undefined;
}

export interface BuildVideoFilterComplexParams {
  watermarkSettings?: WatermarkSettings | undefined;
  blurSettings?: BlurSettings | undefined;
  textRemovalSettings?: TextRemovalSettings | undefined;
  videoDimensions?: VideoDimensions | undefined;
  videoInputIndex?: number;
  watermarkInputIndex?: number;
}

export interface VideoFilterResult {
  hasEffects: boolean;
  filterComplex: string | undefined;
  videoOutputLabel: string | undefined;
  extraInputArgs: string[];
}

export function getWatermarkOverlayCoords(
  position: WatermarkPosition,
  margin: number = 20,
  customX: number = 0,
  customY: number = 0,
): { xExpr: string; yExpr: string } {
  switch (position) {
    case 'top-left':
      return { xExpr: `${margin}`, yExpr: `${margin}` };
    case 'top-right':
      return { xExpr: `main_w-overlay_w-${margin}`, yExpr: `${margin}` };
    case 'bottom-left':
      return { xExpr: `${margin}`, yExpr: `main_h-overlay_h-${margin}` };
    case 'bottom-right':
      return { xExpr: `main_w-overlay_w-${margin}`, yExpr: `main_h-overlay_h-${margin}` };
    case 'center':
      return { xExpr: '(main_w-overlay_w)/2', yExpr: '(main_h-overlay_h)/2' };
    case 'custom': {
      const xNorm = Math.max(0, Math.min(100, customX)) / 100;
      const yNorm = Math.max(0, Math.min(100, customY)) / 100;
      return { xExpr: `main_w*${xNorm.toFixed(4)}`, yExpr: `main_h*${yNorm.toFixed(4)}` };
    }
    default:
      return { xExpr: `main_w-overlay_w-${margin}`, yExpr: `${margin}` };
  }
}

export function buildVideoFilterComplex({
  watermarkSettings,
  blurSettings,
  textRemovalSettings,
  videoDimensions,
  videoInputIndex = 0,
  watermarkInputIndex = 1,
}: BuildVideoFilterComplexParams): VideoFilterResult {
  const isBlurActive = Boolean(
    blurSettings?.enabled &&
    (blurSettings.width ?? 0) > 0 &&
    (blurSettings.height ?? 0) > 0,
  );

  const isTextRemovalActive = Boolean(
    textRemovalSettings?.enabled &&
    (textRemovalSettings.width ?? 0) > 0 &&
    (textRemovalSettings.height ?? 0) > 0,
  );

  const isWatermarkActive = Boolean(
    watermarkSettings?.enabled &&
    watermarkSettings.imagePath &&
    watermarkSettings.imagePath.trim().length > 0,
  );

  if (!isBlurActive && !isWatermarkActive && !isTextRemovalActive) {
    return {
      hasEffects: false,
      filterComplex: undefined,
      videoOutputLabel: undefined,
      extraInputArgs: [],
    };
  }

  const filters: string[] = [];
  let currentVideoOutput = `[${videoInputIndex}:v]`;
  const extraInputArgs: string[] = [];

  // 1. Process Blur Filter if enabled
  if (isBlurActive && blurSettings) {
    const xNorm = Math.max(0, Math.min(100, blurSettings.x ?? 0)) / 100;
    const yNorm = Math.max(0, Math.min(100, blurSettings.y ?? 0)) / 100;
    const wNorm = Math.max(1, Math.min(100, blurSettings.width ?? 20)) / 100;
    const hNorm = Math.max(1, Math.min(100, blurSettings.height ?? 20)) / 100;
    const strength = Math.max(1, Math.min(50, blurSettings.strength ?? 15));

    const cropFilter = `crop=w=iw*${wNorm.toFixed(4)}:h=ih*${hNorm.toFixed(4)}:x=iw*${xNorm.toFixed(4)}:y=ih*${yNorm.toFixed(4)}`;
    const blurFilter = `boxblur=${strength}:2`;
    const overlayPos = `x=main_w*${xNorm.toFixed(4)}:y=main_h*${yNorm.toFixed(4)}`;

    filters.push(
      `${currentVideoOutput}split[main_blur][crop_in]`,
      `[crop_in]${cropFilter},${blurFilter}[blurred]`,
      `[main_blur][blurred]overlay=${overlayPos}[v_blurred]`,
    );

    currentVideoOutput = '[v_blurred]';
  }

  // 1b. Process Text Removal Filter (Fast Delogo Inpainting) if enabled
  if (isTextRemovalActive && textRemovalSettings) {
    const xNorm = Math.max(0, Math.min(100, textRemovalSettings.x ?? 0)) / 100;
    const yNorm = Math.max(0, Math.min(100, textRemovalSettings.y ?? 0)) / 100;
    const wNorm = Math.max(0.5, Math.min(100, textRemovalSettings.width ?? 20)) / 100;
    const hNorm = Math.max(0.5, Math.min(100, textRemovalSettings.height ?? 10)) / 100;

    const vW = videoDimensions?.width && videoDimensions.width > 0 ? videoDimensions.width : 1920;
    const vH = videoDimensions?.height && videoDimensions.height > 0 ? videoDimensions.height : 1080;

    let x = Math.round(vW * xNorm);
    let y = Math.round(vH * yNorm);
    let w = Math.round(vW * wNorm);
    let h = Math.round(vH * hNorm);

    // delogo requires at least 1px boundary around the frame
    x = Math.max(1, Math.min(x, vW - 4));
    y = Math.max(1, Math.min(y, vH - 4));
    w = Math.max(2, Math.min(w, vW - x - 1));
    h = Math.max(2, Math.min(h, vH - y - 1));

    const delogoFilter = `delogo=x=${x}:y=${y}:w=${w}:h=${h}:show=0`;

    filters.push(
      `${currentVideoOutput}${delogoFilter}[v_text_removed]`,
    );

    currentVideoOutput = '[v_text_removed]';
  }

  // 2. Process Watermark Filter if enabled
  if (isWatermarkActive && watermarkSettings && watermarkSettings.imagePath) {
    extraInputArgs.push('-i', watermarkSettings.imagePath);

    const margin = Math.max(0, watermarkSettings.margin ?? 20);
    const scalePercent = Math.max(5, Math.min(100, watermarkSettings.scalePercent ?? 15));
    const opacity = Math.max(0.05, Math.min(1.0, watermarkSettings.opacity ?? 1.0));

    let scaleFilter: string;
    if (videoDimensions?.width && videoDimensions.width > 0) {
      const targetWidth = Math.round(videoDimensions.width * (scalePercent / 100));
      scaleFilter = `scale=${targetWidth}:-1`;
    } else {
      scaleFilter = `scale=iw*${(scalePercent / 100).toFixed(4)}:-1`;
    }

    const alphaFilter = `format=rgba,colorchannelmixer=aa=${opacity.toFixed(2)}`;
    const { xExpr, yExpr } = getWatermarkOverlayCoords(
      watermarkSettings.position,
      margin,
      watermarkSettings.customX,
      watermarkSettings.customY,
    );

    filters.push(
      `[${watermarkInputIndex}:v]${scaleFilter},${alphaFilter}[wm_ready]`,
      `${currentVideoOutput}[wm_ready]overlay=x=${xExpr}:y=${yExpr}:format=auto[v_watermarked]`,
    );

    currentVideoOutput = '[v_watermarked]';
  }

  return {
    hasEffects: true,
    filterComplex: filters.join(';'),
    videoOutputLabel: currentVideoOutput,
    extraInputArgs,
  };
}

export interface ResolvedEncoder {
  codec: string;
  extraArgs: string[];
}

export function resolveVideoEncoder(
  choice: VideoExportEncoder = 'auto',
  systemPlatform: string = process.platform,
): ResolvedEncoder {
  switch (choice) {
    case 'nvenc':
      return {
        codec: 'h264_nvenc',
        extraArgs: ['-preset', 'p2', '-cq', '23'],
      };
    case 'qsv':
      return {
        codec: 'h264_qsv',
        extraArgs: ['-preset', 'veryfast', '-global_quality', '23'],
      };
    case 'amf':
      return {
        codec: 'h264_amf',
        extraArgs: ['-quality', 'speed', '-rc', 'cqp', '-qp_i', '23'],
      };
    case 'mf':
      return {
        codec: 'h264_mf',
        extraArgs: ['-b:v', '5M'],
      };
    case 'cpu_ultrafast':
      return {
        codec: 'libx264',
        extraArgs: ['-preset', 'ultrafast', '-crf', '22'],
      };
    case 'auto':
    default: {
      if (systemPlatform === 'win32') {
        return {
          codec: 'h264_qsv',
          extraArgs: ['-preset', 'veryfast', '-global_quality', '23'],
        };
      }
      if (systemPlatform === 'darwin') {
        return {
          codec: 'h264_videotoolbox',
          extraArgs: ['-b:v', '5M'],
        };
      }
      return {
        codec: 'libx264',
        extraArgs: ['-preset', 'ultrafast', '-crf', '22'],
      };
    }
  }
}
