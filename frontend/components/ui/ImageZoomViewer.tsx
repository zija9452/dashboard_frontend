'use client';

import React, { useEffect, useRef, useState } from 'react';

const MIN_SCALE = 1;
const MAX_SCALE = 8;
const BUTTON_STEP = 0.5;
const WHEEL_FACTOR = 1.2;

const clamp = (value: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));

interface ImageZoomViewerProps {
  src: string;
  alt?: string;
  onClose: () => void;
}

/**
 * Full-screen image viewer with zoom: +/- buttons, mouse wheel, drag to move,
 * double-click to toggle fit / 2x. Keys: Esc close, + / - zoom, 0 fit.
 */
export default function ImageZoomViewer({ src, alt = '', onClose }: ImageZoomViewerProps) {
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const areaRef = useRef<HTMLDivElement>(null);

  // New image opens at fit size
  useEffect(() => {
    setScale(1);
  }, [src]);

  // Back at fit size the image is centered again
  useEffect(() => {
    if (scale === 1) setPos({ x: 0, y: 0 });
  }, [scale]);

  // Wheel listener is non-passive so the page behind does not scroll
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setScale((s) => clamp(e.deltaY < 0 ? s * WHEEL_FACTOR : s / WHEEL_FACTOR));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === '+' || e.key === '=') setScale((s) => clamp(s + BUTTON_STEP));
      else if (e.key === '-') setScale((s) => clamp(s - BUTTON_STEP));
      else if (e.key === '0') setScale(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handlePointerDown = (e: React.PointerEvent<HTMLImageElement>) => {
    if (scale === 1) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
    setDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLImageElement>) => {
    const start = dragStart.current;
    if (!start) return;
    setPos({ x: start.px + (e.clientX - start.x), y: start.py + (e.clientY - start.y) });
  };

  const handlePointerUp = () => {
    dragStart.current = null;
    setDragging(false);
  };

  const cursor = scale === 1 ? 'cursor-zoom-in' : dragging ? 'cursor-grabbing' : 'cursor-grab';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
        title="Close (Esc)"
      >
        <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div ref={areaRef} className="w-full h-full flex items-center justify-center overflow-hidden">
        <img
          src={src}
          alt={alt}
          draggable={false}
          onDoubleClick={() => setScale((s) => (s > 1 ? 1 : 2))}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{
            transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
            transition: dragging ? 'none' : 'transform 0.15s ease-out',
          }}
          className={`max-h-[80vh] max-w-full object-contain rounded-lg select-none touch-none ${cursor}`}
        />
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
        <div className="flex items-center gap-1 bg-gray-900 bg-opacity-80 text-white rounded-lg px-2 py-1.5 shadow-lg">
          <button
            onClick={() => setScale((s) => clamp(s - BUTTON_STEP))}
            disabled={scale <= MIN_SCALE}
            className="h-8 w-8 rounded-md text-lg font-medium hover:bg-white hover:bg-opacity-10 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Zoom out (-)"
          >
            −
          </button>
          <span className="w-14 text-center text-sm tabular-nums">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => setScale((s) => clamp(s + BUTTON_STEP))}
            disabled={scale >= MAX_SCALE}
            className="h-8 w-8 rounded-md text-lg font-medium hover:bg-white hover:bg-opacity-10 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Zoom in (+)"
          >
            +
          </button>
          <button
            onClick={() => setScale(1)}
            disabled={scale === 1}
            className="ml-1 px-3 h-8 rounded-md text-sm font-medium bg-regal-yellow text-regal-black hover:bg-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Fit to screen (0)"
          >
            Fit
          </button>
        </div>
        <p className="text-xs text-gray-400">Scroll to zoom · Drag to move · Double-click to fit</p>
      </div>
    </div>
  );
}
