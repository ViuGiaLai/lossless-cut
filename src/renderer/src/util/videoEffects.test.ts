import { describe, it, expect } from 'vitest';
import { buildVideoFilterComplex, getWatermarkOverlayCoords, resolveVideoEncoder } from './videoEffects';

describe('videoEffects', () => {
  describe('getWatermarkOverlayCoords', () => {
    it('returns correct coordinates for corner presets', () => {
      expect(getWatermarkOverlayCoords('top-left', 15)).toEqual({ xExpr: '15', yExpr: '15' });
      expect(getWatermarkOverlayCoords('top-right', 20)).toEqual({ xExpr: 'main_w-overlay_w-20', yExpr: '20' });
      expect(getWatermarkOverlayCoords('bottom-left', 25)).toEqual({ xExpr: '25', yExpr: 'main_h-overlay_h-25' });
      expect(getWatermarkOverlayCoords('bottom-right', 30)).toEqual({ xExpr: 'main_w-overlay_w-30', yExpr: 'main_h-overlay_h-30' });
      expect(getWatermarkOverlayCoords('center')).toEqual({ xExpr: '(main_w-overlay_w)/2', yExpr: '(main_h-overlay_h)/2' });
    });

    it('returns normalized coords for custom position', () => {
      const coords = getWatermarkOverlayCoords('custom', 0, 50, 25);
      expect(coords.xExpr).toBe('main_w*0.5000');
      expect(coords.yExpr).toBe('main_h*0.2500');
    });
  });

  describe('buildVideoFilterComplex', () => {
    it('returns hasEffects: false when both are disabled', () => {
      const result = buildVideoFilterComplex({
        watermarkSettings: { enabled: false, position: 'top-right', scalePercent: 15, opacity: 1, margin: 20 },
        blurSettings: { enabled: false, x: 10, y: 10, width: 20, height: 20, strength: 15 },
      });
      expect(result.hasEffects).toBe(false);
      expect(result.filterComplex).toBeUndefined();
      expect(result.extraInputArgs).toEqual([]);
    });

    it('builds blur filter correctly when blur is enabled', () => {
      const result = buildVideoFilterComplex({
        blurSettings: { enabled: true, x: 70, y: 5, width: 25, height: 15, strength: 20 },
      });
      expect(result.hasEffects).toBe(true);
      expect(result.filterComplex).toContain('crop=w=iw*0.2500:h=ih*0.1500:x=iw*0.7000:y=ih*0.0500');
      expect(result.filterComplex).toContain('boxblur=20:2');
      expect(result.filterComplex).toContain('overlay=x=main_w*0.7000:y=main_h*0.0500');
      expect(result.videoOutputLabel).toBe('[v_blurred]');
    });

    it('builds watermark filter correctly when watermark is enabled', () => {
      const result = buildVideoFilterComplex({
        watermarkSettings: {
          enabled: true,
          imagePath: '/path/to/logo.png',
          position: 'top-right',
          margin: 20,
          scalePercent: 15,
          opacity: 0.85,
        },
        videoDimensions: { width: 1920, height: 1080 },
      });
      expect(result.hasEffects).toBe(true);
      expect(result.extraInputArgs).toEqual(['-i', '/path/to/logo.png']);
      expect(result.filterComplex).toContain('scale=288:-1'); // 1920 * 0.15 = 288
      expect(result.filterComplex).toContain('format=rgba,colorchannelmixer=aa=0.85');
      expect(result.filterComplex).toContain('overlay=x=main_w-overlay_w-20:y=20');
      expect(result.videoOutputLabel).toBe('[v_watermarked]');
    });

    it('combines both blur and watermark in a pipeline', () => {
      const result = buildVideoFilterComplex({
        blurSettings: { enabled: true, x: 10, y: 10, width: 20, height: 20, strength: 15 },
        watermarkSettings: {
          enabled: true,
          imagePath: 'logo.png',
          position: 'bottom-right',
          margin: 10,
          scalePercent: 20,
          opacity: 1,
        },
      });
      expect(result.hasEffects).toBe(true);
      expect(result.filterComplex).toContain('boxblur=15:2');
      expect(result.filterComplex).toContain('[v_blurred][wm_ready]overlay=');
      expect(result.videoOutputLabel).toBe('[v_watermarked]');
    });

    it('builds text removal delogo filter correctly when text removal is enabled', () => {
      const result = buildVideoFilterComplex({
        textRemovalSettings: { enabled: true, x: 10, y: 80, width: 80, height: 15, mode: 'delogo', staticPosition: true },
        videoDimensions: { width: 1920, height: 1080 },
      });
      expect(result.hasEffects).toBe(true);
      expect(result.filterComplex).toContain('delogo=x=192:y=864:w=1536:h=162:show=0');
      expect(result.videoOutputLabel).toBe('[v_text_removed]');
    });

    it('combines text removal, blur, and watermark in a pipeline', () => {
      const result = buildVideoFilterComplex({
        blurSettings: { enabled: true, x: 10, y: 10, width: 20, height: 20, strength: 15 },
        textRemovalSettings: { enabled: true, x: 20, y: 70, width: 60, height: 20, mode: 'delogo', staticPosition: true },
        watermarkSettings: {
          enabled: true,
          imagePath: 'logo.png',
          position: 'bottom-right',
          margin: 10,
          scalePercent: 20,
          opacity: 1,
        },
        videoDimensions: { width: 1920, height: 1080 },
      });
      expect(result.hasEffects).toBe(true);
      expect(result.filterComplex).toContain('boxblur=15:2');
      expect(result.filterComplex).toContain('[v_blurred]delogo=');
      expect(result.filterComplex).toContain('[v_text_removed][wm_ready]overlay=');
      expect(result.videoOutputLabel).toBe('[v_watermarked]');
    });
  });

  describe('resolveVideoEncoder', () => {
    it('resolves qsv encoder with high performance args', () => {
      const qsv = resolveVideoEncoder('qsv');
      expect(qsv.codec).toBe('h264_qsv');
      expect(qsv.extraArgs).toContain('veryfast');
    });

    it('resolves nvenc encoder', () => {
      const nvenc = resolveVideoEncoder('nvenc');
      expect(nvenc.codec).toBe('h264_nvenc');
      expect(nvenc.extraArgs).toContain('p2');
    });

    it('resolves auto on windows to qsv', () => {
      const autoWin = resolveVideoEncoder('auto', 'win32');
      expect(autoWin.codec).toBe('h264_qsv');
    });

    it('resolves cpu_ultrafast to libx264', () => {
      const cpu = resolveVideoEncoder('cpu_ultrafast');
      expect(cpu.codec).toBe('libx264');
      expect(cpu.extraArgs).toContain('ultrafast');
    });
  });
});
