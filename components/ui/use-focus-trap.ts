"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE_SELECTORS =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Focusable descendants that are actually rendered (skips display:none branches). */
function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
  ).filter((el) => el.getClientRects().length > 0);
}

interface UseFocusTrapOptions {
  /** Called when Escape is pressed while the trap is active. */
  onEscape?: () => void;
}

/**
 * Dialog focus management, mirroring the patterns in `modal.tsx`:
 * - Traps Tab / Shift+Tab cycling within `containerRef`
 * - Moves focus into the container on activation (first focusable element,
 *   falling back to the container itself)
 * - Restores focus to the previously focused element on deactivation
 * - Invokes `onEscape` when Escape is pressed
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
  options: UseFocusTrapOptions = {}
) {
  const onEscapeRef = useRef(options.onEscape);
  useEffect(() => {
    onEscapeRef.current = options.onEscape;
  }, [options.onEscape]);

  useEffect(() => {
    if (!active) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onEscapeRef.current?.();
        return;
      }

      // Focus trap: handle Tab / Shift+Tab
      if (e.key === "Tab" && containerRef.current) {
        const focusable = getFocusable(containerRef.current);
        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const activeElement = document.activeElement;

        if (e.shiftKey) {
          // Shift+Tab: if at first element (or focus escaped), wrap to last
          if (activeElement === first || !containerRef.current.contains(activeElement)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          // Tab: if at last element (or focus escaped), wrap to first
          if (activeElement === last || !containerRef.current.contains(activeElement)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    // Move focus into the dialog on open
    const raf = requestAnimationFrame(() => {
      const container = containerRef.current;
      if (!container || container.contains(document.activeElement)) return;
      const focusable = getFocusable(container);
      if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        container.focus();
      }
    });

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [active, containerRef]);
}
