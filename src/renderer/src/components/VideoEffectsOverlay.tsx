import { useEffect, useState, useRef, type RefObject, type CSSProperties } from 'react';
import useUserSettings from '../hooks/useUserSettings';

interface Props {
  videoRef: RefObject<HTMLVideoElement | null>;
  showHandles?: boolean;
  onOpenPanel?: () => void;
  isPanelOpen?: boolean;
  isModalOpen?: boolean;
}

interface VideoRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export default function VideoEffectsOverlay({
  videoRef,
  showHandles = true,
  onOpenPanel,
  isPanelOpen = false,
  isModalOpen = false,
}: Props) {
  const {
    watermarkSettings,
    setWatermarkSettings,
    blurSettings,
    setBlurSettings,
    textRemovalSettings,
    setTextRemovalSettings,
  } = useUserSettings();

  const [rect, setRect] = useState<VideoRect | null>(null);
  const [isDraggingBlur, setIsDraggingBlur] = useState(false);
  const [isResizingBlur, setIsResizingBlur] = useState(false);
  const [isDraggingText, setIsDraggingText] = useState(false);
  const [isResizingText, setIsResizingText] = useState(false);
  const [isDraggingWm, setIsDraggingWm] = useState(false);

  const blurDragStartRef = useRef<{
    mouseX: number;
    mouseY: number;
    initialX: number;
    initialY: number;
    initialW: number;
    initialH: number;
  } | null>(null);

  const textDragStartRef = useRef<{
    mouseX: number;
    mouseY: number;
    initialX: number;
    initialY: number;
    initialW: number;
    initialH: number;
  } | null>(null);

  const wmDragStartRef = useRef<{
    mouseX: number;
    mouseY: number;
    initialX: number;
    initialY: number;
  } | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateRect = () => {
      const containerWidth = video.clientWidth;
      const containerHeight = video.clientHeight;
      if (!containerWidth || !containerHeight) return;

      const videoWidth = video.videoWidth || containerWidth;
      const videoHeight = video.videoHeight || containerHeight;

      const containerRatio = containerWidth / containerHeight;
      const videoRatio = videoWidth / videoHeight;

      let width = containerWidth;
      let height = containerHeight;
      let left = 0;
      let top = 0;

      if (containerRatio > videoRatio) {
        width = containerHeight * videoRatio;
        left = (containerWidth - width) / 2;
      } else {
        height = containerWidth / videoRatio;
        top = (containerHeight - height) / 2;
      }

      setRect({ left, top, width, height });
    };

    updateRect();
    const resizeObserver = new ResizeObserver(updateRect);
    resizeObserver.observe(video);
    video.addEventListener('loadedmetadata', updateRect);

    return () => {
      resizeObserver.disconnect();
      video.removeEventListener('loadedmetadata', updateRect);
    };
  }, [videoRef]);

  // Global mouse move and mouse up for dragging blur/text box or resizing
  useEffect(() => {
    if (!isDraggingBlur && !isResizingBlur && !isDraggingWm && !isDraggingText && !isResizingText) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!rect) return;

      if ((isDraggingBlur || isResizingBlur) && blurDragStartRef.current) {
        const { mouseX, mouseY, initialX, initialY, initialW, initialH } = blurDragStartRef.current;
        const deltaXPercent = ((e.clientX - mouseX) / rect.width) * 100;
        const deltaYPercent = ((e.clientY - mouseY) / rect.height) * 100;

        if (isDraggingBlur) {
          const newX = Math.max(0, Math.min(100 - initialW, Math.round(initialX + deltaXPercent)));
          const newY = Math.max(0, Math.min(100 - initialH, Math.round(initialY + deltaYPercent)));
          setBlurSettings((prev) => ({ ...prev, x: newX, y: newY }));
        } else if (isResizingBlur) {
          const newW = Math.max(2, Math.min(100 - initialX, Math.round(initialW + deltaXPercent)));
          const newH = Math.max(2, Math.min(100 - initialY, Math.round(initialH + deltaYPercent)));
          setBlurSettings((prev) => ({ ...prev, width: newW, height: newH }));
        }
      }

      if ((isDraggingText || isResizingText) && textDragStartRef.current) {
        const { mouseX, mouseY, initialX, initialY, initialW, initialH } = textDragStartRef.current;
        const deltaXPercent = ((e.clientX - mouseX) / rect.width) * 100;
        const deltaYPercent = ((e.clientY - mouseY) / rect.height) * 100;

        if (isDraggingText) {
          const newX = Math.max(0, Math.min(100 - initialW, Math.round(initialX + deltaXPercent)));
          const newY = Math.max(0, Math.min(100 - initialH, Math.round(initialY + deltaYPercent)));
          setTextRemovalSettings((prev) => ({ ...prev, x: newX, y: newY }));
        } else if (isResizingText) {
          const newW = Math.max(2, Math.min(100 - initialX, Math.round(initialW + deltaXPercent)));
          const newH = Math.max(2, Math.min(100 - initialY, Math.round(initialH + deltaYPercent)));
          setTextRemovalSettings((prev) => ({ ...prev, width: newW, height: newH }));
        }
      }

      if (isDraggingWm && wmDragStartRef.current) {
        const { mouseX, mouseY, initialX, initialY } = wmDragStartRef.current;
        const deltaXPercent = ((e.clientX - mouseX) / rect.width) * 100;
        const deltaYPercent = ((e.clientY - mouseY) / rect.height) * 100;

        const scaleW = watermarkSettings.scalePercent ?? 15;
        const newX = Math.max(0, Math.min(100 - scaleW, Math.round(initialX + deltaXPercent)));
        const newY = Math.max(0, Math.min(95, Math.round(initialY + deltaYPercent)));
        setWatermarkSettings((prev) => ({
          ...prev,
          position: 'custom',
          customX: newX,
          customY: newY,
        }));
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      e.stopPropagation();
      setIsDraggingBlur(false);
      setIsResizingBlur(false);
      setIsDraggingText(false);
      setIsResizingText(false);
      setIsDraggingWm(false);
      blurDragStartRef.current = null;
      textDragStartRef.current = null;
      wmDragStartRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingBlur, isResizingBlur, isDraggingWm, isDraggingText, isResizingText, rect, setBlurSettings, setTextRemovalSettings, setWatermarkSettings, watermarkSettings.scalePercent]);

  const showWatermark = Boolean(watermarkSettings?.enabled && watermarkSettings.imagePath);
  const showBlur = Boolean(blurSettings?.enabled && (blurSettings.width ?? 0) > 0 && (blurSettings.height ?? 0) > 0);
  const showTextRemoval = Boolean(textRemovalSettings?.enabled && (textRemovalSettings.width ?? 0) > 0 && (textRemovalSettings.height ?? 0) > 0);

  if (!rect || isModalOpen) {
    return null;
  }

  const handleBlurMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!blurSettings || !showHandles) return;
    setIsDraggingBlur(true);
    blurDragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      initialX: blurSettings.x ?? 0,
      initialY: blurSettings.y ?? 0,
      initialW: blurSettings.width ?? 25,
      initialH: blurSettings.height ?? 15,
    };
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!blurSettings || !showHandles) return;
    setIsResizingBlur(true);
    blurDragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      initialX: blurSettings.x ?? 0,
      initialY: blurSettings.y ?? 0,
      initialW: blurSettings.width ?? 25,
      initialH: blurSettings.height ?? 15,
    };
  };

  const handleTextMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!textRemovalSettings || !showHandles) return;
    setIsDraggingText(true);
    textDragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      initialX: textRemovalSettings.x ?? 15,
      initialY: textRemovalSettings.y ?? 80,
      initialW: textRemovalSettings.width ?? 70,
      initialH: textRemovalSettings.height ?? 12,
    };
  };

  const handleTextResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!textRemovalSettings || !showHandles) return;
    setIsResizingText(true);
    textDragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      initialX: textRemovalSettings.x ?? 15,
      initialY: textRemovalSettings.y ?? 80,
      initialW: textRemovalSettings.width ?? 70,
      initialH: textRemovalSettings.height ?? 12,
    };
  };

  const handleWmMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!watermarkSettings || !showHandles) return;
    setIsDraggingWm(true);

    let initX = watermarkSettings.customX ?? 5;
    let initY = watermarkSettings.customY ?? 5;
    const scale = watermarkSettings.scalePercent ?? 15;

    if (watermarkSettings.position === 'top-left') {
      initX = 2;
      initY = 2;
    } else if (watermarkSettings.position === 'top-right') {
      initX = 100 - scale - 2;
      initY = 2;
    } else if (watermarkSettings.position === 'bottom-left') {
      initX = 2;
      initY = 85;
    } else if (watermarkSettings.position === 'bottom-right') {
      initX = 100 - scale - 2;
      initY = 85;
    } else if (watermarkSettings.position === 'center') {
      initX = 50 - scale / 2;
      initY = 45;
    }

    wmDragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      initialX: initX,
      initialY: initY,
    };
  };

  const getWatermarkStyle = (): CSSProperties => {
    if (!watermarkSettings) return {};
    const { position, margin = 20, scalePercent = 15, opacity = 1, customX = 0, customY = 0 } = watermarkSettings;
    const widthPx = (rect.width * scalePercent) / 100;

    const baseStyle: CSSProperties = {
      position: 'absolute',
      width: widthPx,
      maxWidth: '80%',
      opacity,
      userSelect: 'none',
      zIndex: 5,
      cursor: showHandles ? (isDraggingWm ? 'grabbing' : 'grab') : 'default',
      pointerEvents: showHandles ? 'auto' : 'none',
      border: showHandles ? '1px dashed #38bdf8' : 'none',
      boxShadow: showHandles ? '0 0 8px rgba(56, 189, 248, 0.4)' : 'none',
    };

    switch (position) {
      case 'top-left':
        return { ...baseStyle, top: margin, left: margin };
      case 'top-right':
        return { ...baseStyle, top: margin, right: margin };
      case 'bottom-left':
        return { ...baseStyle, bottom: margin, left: margin };
      case 'bottom-right':
        return { ...baseStyle, bottom: margin, right: margin };
      case 'center':
        return { ...baseStyle, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
      case 'custom':
        return { ...baseStyle, top: `${customY}%`, left: `${customX}%` };
      default:
        return { ...baseStyle, top: margin, right: margin };
    }
  };

  const getBlurStyle = (): CSSProperties => {
    if (!blurSettings) return {};
    const { x = 70, y = 5, width = 25, height = 15, strength = 15 } = blurSettings;

    return {
      position: 'absolute',
      left: `${x}%`,
      top: `${y}%`,
      width: `${width}%`,
      height: `${height}%`,
      backdropFilter: `blur(${Math.max(4, Math.round(strength / 1.5))}px)`,
      backgroundColor: showHandles ? 'rgba(245, 158, 11, 0.08)' : 'transparent',
      border: showHandles ? '2px dashed #f59e0b' : 'none',
      boxShadow: showHandles ? '0 0 12px rgba(245, 158, 11, 0.4)' : 'none',
      cursor: showHandles ? (isDraggingBlur ? 'grabbing' : 'grab') : 'default',
      pointerEvents: showHandles ? 'auto' : 'none',
      userSelect: 'none',
      zIndex: 6,
      borderRadius: '4px',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
      padding: '3px 6px',
      overflow: 'hidden',
    };
  };

  const getTextRemovalStyle = (): CSSProperties => {
    if (!textRemovalSettings) return {};
    const { x = 15, y = 80, width = 70, height = 12 } = textRemovalSettings;

    return {
      position: 'absolute',
      left: `${x}%`,
      top: `${y}%`,
      width: `${width}%`,
      height: `${height}%`,
      backgroundColor: showHandles ? 'rgba(249, 115, 22, 0.12)' : 'transparent',
      border: showHandles ? '2px dashed #f97316' : 'none',
      boxShadow: showHandles ? '0 0 12px rgba(249, 115, 22, 0.45)' : 'none',
      cursor: showHandles ? (isDraggingText ? 'grabbing' : 'grab') : 'default',
      pointerEvents: showHandles ? 'auto' : 'none',
      userSelect: 'none',
      zIndex: 7,
      borderRadius: '4px',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
      padding: '3px 6px',
      overflow: 'hidden',
    };
  };

  const watermarkSrc = watermarkSettings?.imagePath
    ? (watermarkSettings.imagePath.startsWith('file://') ? watermarkSettings.imagePath : `file:///${watermarkSettings.imagePath.replace(/\\/g, '/')}`)
    : '';

  const hasActiveEffects = showWatermark || showBlur || showTextRemoval;

  return (
    <>
      {/* Container matching exact video rectangle */}
      <div
        style={{
          position: 'absolute',
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
      >
        {showWatermark && (
          <img
            src={watermarkSrc}
            alt="Watermark Preview"
            style={getWatermarkStyle()}
            onMouseDown={handleWmMouseDown}
            title={showHandles ? 'Kéo để di chuyển vị trí Logo' : undefined}
          />
        )}

        {showBlur && (
          <div
            style={getBlurStyle()}
            onMouseDown={handleBlurMouseDown}
            title={showHandles ? 'Kéo để di chuyển ô che mờ (Drag to move)' : undefined}
          >
            {showHandles && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#fff',
                  backgroundColor: 'rgba(0, 0, 0, 0.75)',
                  padding: '2px 5px',
                  borderRadius: '3px',
                  lineHeight: 1.2,
                  pointerEvents: 'none',
                }}
              >
                🔍 Che mờ
              </span>
            )}

            {showHandles && (
              <div
                onMouseDown={handleResizeMouseDown}
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: 14,
                  height: 14,
                  backgroundColor: '#f59e0b',
                  border: '1.5px solid #ffffff',
                  borderRadius: '2px',
                  cursor: 'nwse-resize',
                  pointerEvents: 'auto',
                  zIndex: 10,
                }}
                title="Kéo góc này để thay đổi kích thước"
              />
            )}
          </div>
        )}

        {showTextRemoval && (
          <div
            style={getTextRemovalStyle()}
            onMouseDown={handleTextMouseDown}
            title={showHandles ? 'Kéo để di chuyển vùng Text cần xóa (Drag to move)' : undefined}
          >
            {showHandles && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#fff',
                  backgroundColor: 'rgba(234, 88, 12, 0.9)',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  lineHeight: 1.2,
                  pointerEvents: 'none',
                }}
              >
                ✂ {textRemovalSettings.mode === 'delogo' ? '⚡ Xóa Text' : '✨ AI Inpaint'}
              </span>
            )}

            {showHandles && (
              <div
                onMouseDown={handleTextResizeMouseDown}
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: 14,
                  height: 14,
                  backgroundColor: '#f97316',
                  border: '1.5px solid #ffffff',
                  borderRadius: '2px',
                  cursor: 'nwse-resize',
                  pointerEvents: 'auto',
                  zIndex: 10,
                }}
                title="Kéo góc này để thay đổi kích thước vùng xóa Text"
              />
            )}
          </div>
        )}
      </div>

      {/* Floating quick button on video to open panel if closed */}
      {!isPanelOpen && onOpenPanel && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenPanel();
          }}
          title="Mở bảng điều chỉnh Logo, Che mờ & Xóa Text trực tiếp trên video"
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 25,
            padding: '6px 12px',
            backgroundColor: hasActiveEffects ? '#0284c7' : 'rgba(15, 23, 42, 0.85)',
            color: '#ffffff',
            border: hasActiveEffects ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '20px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <span>🎨 Hiệu ứng & Xóa Text</span>
          {hasActiveEffects && (
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: '#4ade80',
                display: 'inline-block',
              }}
            />
          )}
        </button>
      )}
    </>
  );
}
