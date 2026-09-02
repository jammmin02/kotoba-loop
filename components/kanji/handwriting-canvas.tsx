"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { HandwritingStroke } from "@/types/handwriting";

import type { PointerEvent as ReactPointerEvent } from "react";

interface HandwritingCanvasProps {
  onRecognize: (strokes: HandwritingStroke[], width: number, height: number) => void;
  recognizing: boolean;
}

interface Point {
  x: number;
  y: number;
  t: number;
}

const STROKE_COLOR = "#1a1a1a";
const LINE_WIDTH = 6;

/** Freehand ink capture for kanji lookup — draws to a canvas while recording stroke
 *  coordinates in the {x[], y[], t[]} shape lib/handwriting/google-input-tools.ts sends on. */
export function HandwritingCanvas({ onRecognize, recognizing }: HandwritingCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Point[][]>([]);
  const drawingRef = useRef(false);
  const startTimeRef = useRef(0);
  const sizeRef = useRef(280);
  const [hasInk, setHasInk] = useState(false);

  const redraw = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    const size = sizeRef.current;
    if (!ctx) return;
    ctx.clearRect(0, 0, size, size);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = STROKE_COLOR;
    ctx.lineWidth = LINE_WIDTH;
    for (const stroke of strokesRef.current) {
      if (stroke.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (const point of stroke.slice(1)) ctx.lineTo(point.x, point.y);
      ctx.stroke();
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function applySize(size: number) {
      const canvas = canvasRef.current;
      if (!canvas || size <= 0) return;
      const dpr = window.devicePixelRatio || 1;
      sizeRef.current = size;
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      canvas.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
      redraw();
    }

    // Reads the size immediately (covers the common case) and also watches via
    // ResizeObserver, since a `window.resize` listener alone would miss both the
    // initial layout and any change driven by something other than the window itself
    // (sidebar toggling, font load reflow, container query changes, etc).
    applySize(container.clientWidth);
    const observer = new ResizeObserver(([entry]) => {
      if (entry) applySize(entry.contentRect.width);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [redraw]);

  function getPoint(e: ReactPointerEvent<HTMLCanvasElement>): Point {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      t: performance.now() - startTimeRef.current,
    };
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    if (strokesRef.current.length === 0) startTimeRef.current = performance.now();
    drawingRef.current = true;
    strokesRef.current.push([getPoint(e)]);
    setHasInk(true);
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    e.preventDefault();
    strokesRef.current[strokesRef.current.length - 1].push(getPoint(e));
    redraw();
  }

  function handlePointerUp(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  }

  function handleUndo() {
    strokesRef.current = strokesRef.current.slice(0, -1);
    setHasInk(strokesRef.current.length > 0);
    redraw();
  }

  function handleClear() {
    strokesRef.current = [];
    setHasInk(false);
    redraw();
  }

  function handleRecognizeClick() {
    const strokes: HandwritingStroke[] = strokesRef.current
      .filter((stroke) => stroke.length >= 2)
      .map((stroke) => ({
        x: stroke.map((p) => Math.round(p.x)),
        y: stroke.map((p) => Math.round(p.y)),
        t: stroke.map((p) => Math.round(p.t)),
      }));
    if (strokes.length === 0) return;
    onRecognize(strokes, sizeRef.current, sizeRef.current);
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={containerRef}
        className="aspect-square w-full max-w-xs self-center border-2 border-pixel-ink bg-background shadow-bevel-sunken"
      >
        <canvas
          ref={canvasRef}
          className="touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
      </div>

      <div className="flex justify-center gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={handleUndo}
          disabled={!hasInk || recognizing}
        >
          되돌리기
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={handleClear}
          disabled={!hasInk || recognizing}
        >
          지우기
        </Button>
        <Button
          type="button"
          onClick={handleRecognizeClick}
          disabled={!hasInk}
          loading={recognizing}
        >
          인식하기
        </Button>
      </div>
    </div>
  );
}
