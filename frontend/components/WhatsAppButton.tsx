'use client';

import React, { useEffect, useRef, useState } from 'react';

// Floating button on every page: opens WhatsApp on its chat list (no specific
// chat) in the WhatsApp app - phone app (Android: WhatsApp, else WhatsApp
// Business), or WhatsApp Desktop on a computer.
// (WhatsApp Web was dropped: every click reopened and reloaded a new tab.)
// Slips go to a group via Share.
// Drag it (like the Vercel toolbar); on release it snaps to the nearest of the
// four corners, never stays mid-screen. The corner is remembered per browser.

const SIZE = 56; // h-14 w-14
const MARGIN = 20; // gap from the screen edges in a corner
const DRAG_THRESHOLD = 10; // px (10, not 5: a finger tap wobbles a few px) moved before a press counts as a drag, not a click
const STORAGE_KEY = 'whatsapp-button-corner';

// Android: WhatsApp only handles whatsapp://send, so a bare whatsapp:// does
// nothing there. Instead the app is launched by package: normal WhatsApp first,
// then WhatsApp Business. When a package is missing, Chrome goes to the
// fallback URL - this same page with a marker hash - and the hashchange
// handler tries the next app.
const WHATSAPP_PACKAGE = 'com.whatsapp';
const BUSINESS_PACKAGE = 'com.whatsapp.w4b';
const TRY_BUSINESS_HASH = '#open-whatsapp-business';
const NOT_INSTALLED_HASH = '#whatsapp-not-installed';

const isAndroid = () => /Android/i.test(navigator.userAgent);

const androidIntent = (pkg: string, fallbackHash: string) => {
  const fallbackUrl = window.location.href.split('#')[0] + fallbackHash;
  return (
    `intent://#Intent;package=${pkg};action=android.intent.action.MAIN;` +
    `category=android.intent.category.LAUNCHER;S.browser_fallback_url=${encodeURIComponent(fallbackUrl)};end`
  );
};

type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
const CORNERS: Corner[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

interface Position {
  x: number;
  y: number;
}

const cornerPosition = (corner: Corner): Position => ({
  x: corner.endsWith('left') ? MARGIN : window.innerWidth - SIZE - MARGIN,
  y: corner.startsWith('top') ? MARGIN : window.innerHeight - SIZE - MARGIN,
});

// Corner closest to where the button was dropped
const nearestCorner = (pos: Position): Corner => {
  const centerX = pos.x + SIZE / 2;
  const centerY = pos.y + SIZE / 2;
  const vertical = centerY < window.innerHeight / 2 ? 'top' : 'bottom';
  const horizontal = centerX < window.innerWidth / 2 ? 'left' : 'right';
  return `${vertical}-${horizontal}` as Corner;
};

// Keep the button on screen while dragging
const clamp = (pos: Position): Position => ({
  x: Math.min(Math.max(pos.x, 0), window.innerWidth - SIZE),
  y: Math.min(Math.max(pos.y, 0), window.innerHeight - SIZE),
});

const loadCorner = (): Corner => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (CORNERS.includes(saved as Corner)) return saved as Corner;
  } catch {
    // Storage blocked -> default corner
  }
  return 'bottom-right';
};

const saveCorner = (corner: Corner) => {
  try {
    localStorage.setItem(STORAGE_KEY, corner);
  } catch {
    // Storage blocked -> corner just isn't remembered
  }
};

const WhatsAppButton: React.FC = () => {
  // null until mounted (window is not available during server render)
  const [corner, setCorner] = useState<Corner | null>(null);
  const [dragPosition, setDragPosition] = useState<Position | null>(null); // set only while dragging
  const [, setViewport] = useState(0); // re-render on resize so the corner follows the screen edge
  const drag = useRef<{ startX: number; startY: number; offsetX: number; offsetY: number; moved: boolean } | null>(null);

  useEffect(() => {
    setCorner(loadCorner());
    const onResize = () => setViewport((n) => n + 1);
    window.addEventListener('resize', onResize);

    // Android fallback chain (see androidIntent): normal WhatsApp missing ->
    // try Business; Business missing too -> tell the user.
    const onHashChange = () => {
      const hash = window.location.hash;
      if (hash !== TRY_BUSINESS_HASH && hash !== NOT_INSTALLED_HASH) return;
      // Drop the marker hash so the URL stays clean
      history.replaceState(null, '', window.location.pathname + window.location.search);
      if (hash === TRY_BUSINESS_HASH) {
        window.location.href = androidIntent(BUSINESS_PACKAGE, NOT_INSTALLED_HASH);
      } else {
        alert('WhatsApp is not installed on this phone.');
      }
    };
    window.addEventListener('hashchange', onHashChange);

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('hashchange', onHashChange);
    };
  }, []);

  const openWhatsApp = () => {
    if (isAndroid()) {
      window.location.href = androidIntent(WHATSAPP_PACKAGE, TRY_BUSINESS_HASH);
      return;
    }
    // iPhone and computer: the installed WhatsApp app (an open one comes to
    // the front). Without the app installed nothing happens.
    window.location.href = 'whatsapp://';
  };

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!corner || e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const start = cornerPosition(corner);
    drag.current = {
      startX: e.clientX,
      startY: e.clientY,
      offsetX: e.clientX - start.x,
      offsetY: e.clientY - start.y,
      moved: false,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < DRAG_THRESHOLD) return;
    d.moved = true;
    setDragPosition(clamp({ x: e.clientX - d.offsetX, y: e.clientY - d.offsetY }));
  };

  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.moved && dragPosition) {
      const target = nearestCorner(dragPosition);
      setCorner(target);
      saveCorner(target);
    } else if (!d.moved) {
      openWhatsApp(); // a press without moving is a click
    }
    setDragPosition(null);
  };

  if (!corner) return null;
  const dragging = dragPosition !== null;
  const position = dragPosition ?? cornerPosition(corner);

  return (
    <button
      type="button"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        // Drag interrupted -> back to its corner
        drag.current = null;
        setDragPosition(null);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openWhatsApp();
        }
      }}
      style={{ left: position.x, top: position.y, touchAction: 'none' }}
      // z-40: stays under modals/overlays; print:hidden keeps it off printed invoices
      className={`fixed z-40 flex h-14 w-14 select-none items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg hover:bg-[#1ebe5b] print:hidden ${
        // Glides into the corner on release; follows the pointer with no delay while dragging
        dragging ? 'scale-110 cursor-grabbing' : 'cursor-pointer transition-all duration-300 ease-out hover:scale-110'
      }`}
      title="Open WhatsApp (drag to move)"
      aria-label="Open WhatsApp"
    >
      <svg viewBox="0 0 24 24" className="pointer-events-none h-8 w-8" fill="currentColor" aria-hidden="true">
        <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.32l-.34-.2-3.57.94.95-3.48-.22-.36a9.42 9.42 0 0 1-1.44-5.02c0-5.2 4.24-9.44 9.45-9.44a9.4 9.4 0 0 1 6.68 2.77 9.38 9.38 0 0 1 2.76 6.68c0 5.21-4.24 9.44-9.45 9.44zm8.04-17.48A11.3 11.3 0 0 0 12.05.7C5.78.7.68 5.8.68 12.06c0 2 .52 3.96 1.52 5.68L.58 23.3l5.7-1.5a11.33 11.33 0 0 0 5.77 1.47h.01c6.26 0 11.36-5.1 11.36-11.36 0-3.04-1.18-5.89-3.33-8.03z" />
      </svg>
    </button>
  );
};

export default WhatsAppButton;
