"use client";

import { useEffect, useRef } from "react";

/**
 * Hardware-back support for overlays (Android's most-used gesture).
 *
 * Opening the overlay pushes one history entry; pressing Back closes
 * the overlay instead of leaving the page. Closing by any other means
 * (X button, backdrop tap, Escape, swipe-down) consumes that entry so
 * history doesn't accumulate ghost states.
 *
 * Wired into the two shared primitives (Modal, BottomSheet) so every
 * dialog in the app inherits the behavior at once.
 */
export function useHistoryDismiss(open: boolean, onClose: () => void) {
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    let poppedByUser = false;
    try {
      window.history.pushState({ __cgeOverlay: true }, "");
    } catch {
      return; // History unavailable (rare embedded contexts) — degrade quietly.
    }
    const onPop = () => {
      poppedByUser = true;
      closeRef.current();
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      // Closed via X/backdrop/Escape: pop our own entry — but only if
      // it is still the top of the stack (a route navigation may have
      // already replaced it, and back() would then undo that instead).
      if (
        !poppedByUser &&
        (window.history.state as { __cgeOverlay?: boolean } | null)?.__cgeOverlay
      ) {
        window.history.back();
      }
    };
  }, [open]);
}
