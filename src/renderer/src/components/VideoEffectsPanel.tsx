import type { CSSProperties } from 'react';
import { memo, useCallback, useState } from 'react';
import { FaTimes, FaMagic, FaFolderOpen, FaEye, FaEyeSlash } from 'react-icons/fa';
import { MdBlurOn, MdPhotoSizeSelectActual } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import useUserSettings from '../hooks/useUserSettings';
import { showOpenDialog } from '../dialogs';
import Switch from './Switch';
import Select from './Select';
import type { VideoExportEncoder, WatermarkPosition } from '../../../common/types';

interface Props {
  onClose: () => void;
  showHandles: boolean;
  setShowHandles: (v: boolean | ((prev: boolean) => boolean)) => void;
}

const PRESETS = [
  {
    name: '↖ Góc trên - Trái',
    desc: 'Che "原创@权谋动画"',
    settings: { x: 1, y: 1, width: 38, height: 9, strength: 20 },
  },
  {
    name: '↗ Góc trên - Phải',
    desc: 'Che "虚拟剧情请勿模仿"',
    settings: { x: 61, y: 1, width: 38, height: 9, strength: 20 },
  },
  {
    name: '━ Dải viền trên',
    desc: 'Che cả 2 mép trên',
    settings: { x: 0, y: 0, width: 100, height: 10, strength: 20 },
  },
  {
    name: '⬇ Phụ đề dưới',
    desc: 'Che chữ phụ đề đáy',
    settings: { x: 10, y: 82, width: 80, height: 14, strength: 22 },
  },
];

function VideoEffectsPanel({ onClose, showHandles, setShowHandles }: Props) {
  const { t } = useTranslation();
  const {
    watermarkSettings,
    setWatermarkSettings,
    blurSettings,
    setBlurSettings,
    exportEncoder,
    setExportEncoder,
  } = useUserSettings();

  const [activeTab, setActiveTab] = useState<'blur' | 'logo' | 'gpu'>('blur');

  const onSelectLogoImage = useCallback(async () => {
    const { canceled, filePaths } = await showOpenDialog({
      title: t('Select watermark / logo image'),
      filters: [
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'svg'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });
    const selected = filePaths?.[0];
    if (!canceled && selected) {
      setWatermarkSettings((prev) => ({ ...prev, imagePath: selected, enabled: true }));
    }
  }, [setWatermarkSettings, t]);

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setBlurSettings((prev) => ({
      ...prev,
      ...preset.settings,
      enabled: true,
    }));
  };

  const panelStyle: CSSProperties = {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 370,
    maxHeight: 'calc(100% - 24px)',
    backgroundColor: 'rgba(18, 20, 26, 0.94)',
    color: '#e2e8f0',
    borderRadius: '12px',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.65), 0 0 1px rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(16px)',
    zIndex: 35,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    fontSize: '13px',
    border: '1px solid rgba(255, 255, 255, 0.12)',
  };

  const tabButtonStyle = (tab: 'blur' | 'logo' | 'gpu'): CSSProperties => ({
    flex: 1,
    padding: '8px 4px',
    backgroundColor: activeTab === tab ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
    color: activeTab === tab ? '#38bdf8' : '#94a3b8',
    border: 'none',
    borderBottom: activeTab === tab ? '2px solid #38bdf8' : '2px solid transparent',
    cursor: 'pointer',
    fontWeight: activeTab === tab ? 600 : 500,
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '5px',
    transition: 'all 0.15s ease',
  });

  return (
    <div style={panelStyle} className="no-drag">
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 14px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'rgba(255, 255, 255, 0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '14px' }}>
          <span style={{ color: '#38bdf8', fontSize: '16px' }}>🎨</span>
          <span>Logo & Che mờ (Xem trước)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setShowHandles((v) => !v)}
            title={showHandles ? 'Ẩn khung viền (Xem kết quả thật)' : 'Hiện khung viền điều chỉnh'}
            style={{
              background: showHandles ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.08)',
              border: `1px solid ${showHandles ? '#f59e0b' : 'rgba(255, 255, 255, 0.15)'}`,
              color: showHandles ? '#f59e0b' : '#94a3b8',
              borderRadius: '6px',
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {showHandles ? <FaEyeSlash /> : <FaEye />}
            {showHandles ? 'Ẩn viền' : 'Hiện viền'}
          </button>
          <button
            type="button"
            onClick={onClose}
            title={t('Close')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              fontSize: '14px',
            }}
          >
            <FaTimes />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(0,0,0,0.2)' }}>
        <button type="button" style={tabButtonStyle('blur')} onClick={() => setActiveTab('blur')}>
          <MdBlurOn size={15} />
          Che mờ {blurSettings.enabled && '●'}
        </button>
        <button type="button" style={tabButtonStyle('logo')} onClick={() => setActiveTab('logo')}>
          <MdPhotoSizeSelectActual size={14} />
          Logo / Watermark {watermarkSettings.enabled && '●'}
        </button>
        <button type="button" style={tabButtonStyle('gpu')} onClick={() => setActiveTab('gpu')}>
          ⚡ Tốc độ GPU
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '14px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Tab 1: Che mờ (Blur) */}
        {activeTab === 'blur' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
              <span style={{ fontWeight: 600, color: blurSettings.enabled ? '#38bdf8' : '#cbd5e1' }}>
                Bật ô che mờ (Blur Box)
              </span>
              <Switch
                checked={blurSettings.enabled}
                onCheckedChange={(enabled) => setBlurSettings((prev) => ({ ...prev, enabled }))}
              />
            </div>

            {blurSettings.enabled ? (
              <>
                {/* Presets */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: '#f59e0b', fontWeight: 600, fontSize: '12px' }}>
                    <FaMagic size={12} />
                    <span>Vị trí mẫu (Bấm để che chữ trên video):</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    {PRESETS.map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => applyPreset(p)}
                        style={{
                          padding: '8px 6px',
                          background: 'rgba(255, 255, 255, 0.06)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: '6px',
                          color: '#f1f5f9',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(56, 189, 248, 0.2)';
                          e.currentTarget.style.borderColor = '#38bdf8';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                        }}
                      >
                        <div style={{ fontWeight: 600, fontSize: '12px' }}>{p.name}</div>
                        <div style={{ fontSize: '10px', color: '#94a3b8' }}>{p.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Manual sliders */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(0, 0, 0, 0.2)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>
                    Tinh chỉnh vị trí & kích thước:
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' }}>
                        <span>Vị trí X (Trái)</span>
                        <span>{blurSettings.x}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={blurSettings.x}
                        onChange={(e) => setBlurSettings((prev) => ({ ...prev, x: Number(e.target.value) }))}
                        style={{ width: '100%', accentColor: '#38bdf8' }}
                      />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' }}>
                        <span>Vị trí Y (Trên)</span>
                        <span>{blurSettings.y}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={blurSettings.y}
                        onChange={(e) => setBlurSettings((prev) => ({ ...prev, y: Number(e.target.value) }))}
                        style={{ width: '100%', accentColor: '#38bdf8' }}
                      />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' }}>
                        <span>Chiều rộng</span>
                        <span>{blurSettings.width}%</span>
                      </div>
                      <input
                        type="range"
                        min="2"
                        max="100"
                        value={blurSettings.width}
                        onChange={(e) => setBlurSettings((prev) => ({ ...prev, width: Number(e.target.value) }))}
                        style={{ width: '100%', accentColor: '#38bdf8' }}
                      />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' }}>
                        <span>Chiều cao</span>
                        <span>{blurSettings.height}%</span>
                      </div>
                      <input
                        type="range"
                        min="2"
                        max="100"
                        value={blurSettings.height}
                        onChange={(e) => setBlurSettings((prev) => ({ ...prev, height: Number(e.target.value) }))}
                        style={{ width: '100%', accentColor: '#38bdf8' }}
                      />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' }}>
                      <span>Độ mờ (Blur Strength)</span>
                      <span>{blurSettings.strength}</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="40"
                      value={blurSettings.strength}
                      onChange={(e) => setBlurSettings((prev) => ({ ...prev, strength: Number(e.target.value) }))}
                      style={{ width: '100%', accentColor: '#f59e0b' }}
                    />
                  </div>
                </div>

                <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.4, background: 'rgba(56, 189, 248, 0.08)', padding: '8px 10px', borderRadius: '6px', borderLeft: '3px solid #38bdf8' }}>
                  👉 <strong>Kéo chuột trực tiếp:</strong> Bạn có thể dùng chuột kéo ô màu vàng viền đứt trên video để di chuyển, và kéo góc dưới-phải của ô để phóng to/thu nhỏ!
                </div>
              </>
            ) : (
              <div style={{ padding: '20px 10px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                Bật công tắc ở trên để bắt đầu che mờ logo hoặc chữ trên video.
              </div>
            )}
          </>
        )}

        {/* Tab 2: Logo / Watermark */}
        {activeTab === 'logo' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
              <span style={{ fontWeight: 600, color: watermarkSettings.enabled ? '#38bdf8' : '#cbd5e1' }}>
                Bật Logo / Watermark
              </span>
              <Switch
                checked={watermarkSettings.enabled}
                onCheckedChange={(enabled) => {
                  setWatermarkSettings((prev) => ({ ...prev, enabled }));
                  if (enabled && !watermarkSettings.imagePath) {
                    onSelectLogoImage();
                  }
                }}
              />
            </div>

            {watermarkSettings.enabled ? (
              <>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: '#94a3b8' }}>
                    Tệp hình ảnh Logo:
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={onSelectLogoImage}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        background: '#0284c7',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 500,
                        flexShrink: 0,
                      }}
                    >
                      <FaFolderOpen /> Chọn ảnh...
                    </button>
                    <div
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontSize: '11px',
                        color: watermarkSettings.imagePath ? '#f8fafc' : '#ef4444',
                      }}
                      title={watermarkSettings.imagePath}
                    >
                      {watermarkSettings.imagePath
                        ? watermarkSettings.imagePath.split(/[\\/]/).pop()
                        : '⚠ Chưa chọn ảnh logo'}
                    </div>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: '#94a3b8' }}>
                    Vị trí đặt Logo:
                  </div>
                  <Select
                    value={watermarkSettings.position}
                    onChange={(e) => setWatermarkSettings((prev) => ({ ...prev, position: e.target.value as WatermarkPosition }))}
                    style={{ width: '100%', background: '#1e293b', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
                  >
                    <option value="top-left">Góc trên - Trái (Top-Left)</option>
                    <option value="top-right">Góc trên - Phải (Top-Right)</option>
                    <option value="bottom-left">Góc dưới - Trái (Bottom-Left)</option>
                    <option value="bottom-right">Góc dưới - Phải (Bottom-Right)</option>
                    <option value="center">Ở chính giữa (Center)</option>
                    <option value="custom">Tùy chỉnh (Kéo chuột trực tiếp)</option>
                  </Select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' }}>
                      <span>Kích cỡ Logo</span>
                      <span>{watermarkSettings.scalePercent}%</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="70"
                      value={watermarkSettings.scalePercent}
                      onChange={(e) => setWatermarkSettings((prev) => ({ ...prev, scalePercent: Number(e.target.value) }))}
                      style={{ width: '100%', accentColor: '#38bdf8' }}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' }}>
                      <span>Độ rõ (Opacity)</span>
                      <span>{Math.round((watermarkSettings.opacity ?? 1) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={Math.round((watermarkSettings.opacity ?? 1) * 100)}
                      onChange={(e) => setWatermarkSettings((prev) => ({ ...prev, opacity: Number(e.target.value) / 100 }))}
                      style={{ width: '100%', accentColor: '#38bdf8' }}
                    />
                  </div>
                </div>

                <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.4, background: 'rgba(56, 189, 248, 0.08)', padding: '8px 10px', borderRadius: '6px', borderLeft: '3px solid #38bdf8' }}>
                  👉 Bạn có thể dùng chuột kéo trực tiếp logo trên màn hình video để điều chỉnh vị trí theo ý thích!
                </div>
              </>
            ) : (
              <div style={{ padding: '20px 10px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                Bật công tắc ở trên để thêm logo hoặc watermark thương hiệu vào video.
              </div>
            )}
          </>
        )}

        {/* Tab 3: Tốc độ xuất (GPU) */}
        {activeTab === 'gpu' && (
          <>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: '#94a3b8' }}>
                Bộ mã hóa phần cứng (GPU Encoder):
              </div>
              <Select
                value={exportEncoder}
                onChange={(e) => setExportEncoder(e.target.value as VideoExportEncoder)}
                style={{ width: '100%', background: '#1e293b', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
              >
                <option value="auto">⚡ Tự động nhận diện GPU (Nhanh nhất)</option>
                <option value="qsv">Intel QuickSync (h264_qsv - Cực nhanh)</option>
                <option value="nvenc">NVIDIA NVENC (h264_nvenc - Cực nhanh)</option>
                <option value="amf">AMD AMF (h264_amf - Cực nhanh)</option>
                <option value="mf">Windows Media Foundation (h264_mf)</option>
                <option value="cpu_ultrafast">CPU x264 ultrafast (Dự phòng)</option>
              </Select>
            </div>

            <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: 1.5, background: 'rgba(34, 197, 94, 0.1)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(34, 197, 94, 0.25)' }}>
              <div style={{ fontWeight: 600, color: '#4ade80', marginBottom: '4px' }}>
                ✓ Đảm bảo tốc độ xuất video siêu nhanh:
              </div>
              LosslessCut tận dụng nhân GPU đồ họa phần cứng trên máy tính của bạn để xử lý hiệu ứng, đồng thời giữ nguyên 100% các luồng Âm thanh (Audio) và Phụ đề (Subtitles) không bị nén lại (`-c:a copy -c:s copy`).
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '10px 14px',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'rgba(0, 0, 0, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: '11px', color: '#94a3b8' }}>
          {(watermarkSettings.enabled || blurSettings.enabled)
            ? '● Đang xem trước trực tiếp trên video'
            : 'Chưa bật hiệu ứng nào'}
        </span>
        <button
          type="button"
          onClick={onClose}
          style={{
            padding: '5px 12px',
            background: '#0284c7',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 600,
          }}
        >
          Xong & Xem trên video
        </button>
      </div>
    </div>
  );
}

export default memo(VideoEffectsPanel);
