"use client"
import { useState, useRef, useEffect, useCallback } from "react";
 
// --- Types ---
 
type ToolType = "pen" | "rect" | "ellipse" | "line";
 
interface BaseShape {
  id: string;
  color: string;
  width: number;
}
 
interface PenShape extends BaseShape {
  type: "pen";
  points: [number, number][];
}
 
interface RectShape extends BaseShape {
  type: "rect";
  x: number;
  y: number;
  w: number;
  h: number;
}
 
interface EllipseShape extends BaseShape {
  type: "ellipse";
  x: number;
  y: number;
  w: number;
  h: number;
}
 
interface LineShape extends BaseShape {
  type: "line";
  x: number;
  y: number;
  w: number;
  h: number;
}
 
type Shape = PenShape | RectShape | EllipseShape | LineShape;
 
// --- Constants ---
 
const COLORS: string[] = ["#1a1a1a", "#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6"];
const TOOLS: ToolType[] = ["pen", "rect", "ellipse", "line"];
 
// --- Drawing ---
 
function drawShape(ctx: CanvasRenderingContext2D, shape: Shape): void {
  ctx.strokeStyle = shape.color;
  ctx.lineWidth = shape.width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
 
  if (shape.type === "pen") {
    if (shape.points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(shape.points[0][0], shape.points[0][1]);
    for (let i = 1; i < shape.points.length; i++) {
      ctx.lineTo(shape.points[i][0], shape.points[i][1]);
    }
    ctx.stroke();
  }
 
  if (shape.type === "rect") {
    ctx.strokeRect(shape.x, shape.y, shape.w, shape.h);
  }
 
  if (shape.type === "ellipse") {
    ctx.beginPath();
    ctx.ellipse(
      shape.x + shape.w / 2,
      shape.y + shape.h / 2,
      Math.abs(shape.w / 2),
      Math.abs(shape.h / 2),
      0, 0, Math.PI * 2
    );
    ctx.stroke();
  }
 
  if (shape.type === "line") {
    ctx.beginPath();
    ctx.moveTo(shape.x, shape.y);
    ctx.lineTo(shape.x + shape.w, shape.y + shape.h);
    ctx.stroke();
  }
}
 
// --- Component ---
 
export default function Whiteboard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentStroke = useRef<Shape | null>(null);
  const startPos = useRef<[number, number]>([0, 0]);
  const isDrawing = useRef<boolean>(false);
 
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [tool, setTool] = useState<ToolType>("pen");
  const [color, setColor] = useState<string>("#1a1a1a");
  const [strokeWidth, setStrokeWidth] = useState<number>(2);
  const [history, setHistory] = useState<Shape[]>([]);
 
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    shapes.forEach(shape => drawShape(ctx, shape));
  }, [shapes]);
 
  const getPos = (e: React.MouseEvent | React.TouchEvent): [number, number] => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    return [clientX - rect.left, clientY - rect.top];
  };
 
  const onMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    isDrawing.current = true;
    const pos = getPos(e);
    startPos.current = pos;
 
    if (tool === "pen") {
      currentStroke.current = {
        id: crypto.randomUUID(),
        type: "pen",
        points: [pos],
        color,
        width: strokeWidth,
      };
    } else {
      currentStroke.current = {
        id: crypto.randomUUID(),
        type: tool,
        x: pos[0],
        y: pos[1],
        w: 0,
        h: 0,
        color,
        width: strokeWidth,
      };
    }
  }, [tool, color, strokeWidth]);
 
  const onMouseMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current || !currentStroke.current) return;
 
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
 
    const pos = getPos(e);
 
    if (currentStroke.current.type === "pen") {
      currentStroke.current.points.push(pos);
    } else {
      (currentStroke.current as RectShape | EllipseShape | LineShape).w = pos[0] - startPos.current[0];
      (currentStroke.current as RectShape | EllipseShape | LineShape).h = pos[1] - startPos.current[1];
    }
 
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    shapes.forEach(shape => drawShape(ctx, shape));
    drawShape(ctx, currentStroke.current);
  }, [shapes]);
 
  const onMouseUp = useCallback(() => {
    if (!isDrawing.current || !currentStroke.current) return;
    isDrawing.current = false;
    const shape = currentStroke.current;

    // Commit — this is where socket.emit("shape", currentStroke.current) goes later
    setShapes(prev => [...prev, shape]);
    setHistory([]);


    currentStroke.current = null;
  }, []);
 
  const undo = () => {
    if (shapes.length === 0) return;
    const last = shapes[shapes.length - 1];
    setHistory(prev => [last, ...prev]);
    setShapes(prev => prev.slice(0, -1));
  };
 
  const redo = () => {
    if (history.length === 0) return;
    const next = history[0];
    setShapes(prev => [...prev, next]);
    setHistory(prev => prev.slice(1));
  };
 
  const clear = () => {
    setShapes([]);
    setHistory([]);
  };
 
  return (
    <div style={styles.root}>
      <div style={styles.toolbar}>
        <div style={styles.toolGroup}>
          {TOOLS.map(t => (
            <button
              key={t}
              onClick={() => setTool(t)}
              style={{ ...styles.toolBtn, ...(tool === t ? styles.toolBtnActive : {}) }}
            >
              {t}
            </button>
          ))}
        </div>
 
        <div style={styles.toolGroup}>
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{
                ...styles.colorBtn,
                background: c,
                outline: color === c ? `2px solid #fff` : "none",
                outlineOffset: 2,
              }}
            />
          ))}
        </div>
 
        <div style={styles.toolGroup}>
          <label style={styles.label}>size</label>
          <input
            type="range"
            min={1}
            max={20}
            value={strokeWidth}
            onChange={e => setStrokeWidth(Number(e.target.value))}
            style={{ width: 80 }}
          />
          <span style={styles.label}>{strokeWidth}px</span>
        </div>
 
        <div style={styles.toolGroup}>
          <button onClick={undo} style={styles.actionBtn} disabled={shapes.length === 0}>undo</button>
          <button onClick={redo} style={styles.actionBtn} disabled={history.length === 0}>redo</button>
          <button onClick={clear} style={{ ...styles.actionBtn, color: "#e74c3c" }}>clear</button>
        </div>
      </div>
 
      <canvas
        ref={canvasRef}
        width={1200}
        height={700}
        style={styles.canvas}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onMouseDown}
        onTouchMove={onMouseMove}
        onTouchEnd={onMouseUp}
      />
 
      <div style={styles.debug}>
        {shapes.length} shape{shapes.length !== 1 ? "s" : ""} in state
      </div>
    </div>
  );
}
 
const styles: Record<string, React.CSSProperties> = {
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    background: "#111",
    fontFamily: "monospace",
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    gap: 24,
    padding: "10px 16px",
    background: "#1e1e1e",
    borderBottom: "1px solid #333",
    flexWrap: "wrap",
  },
  toolGroup: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  toolBtn: {
    padding: "4px 10px",
    background: "#2a2a2a",
    color: "#aaa",
    border: "1px solid #444",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  toolBtnActive: {
    background: "#fff",
    color: "#111",
    borderColor: "#fff",
  },
  colorBtn: {
    width: 20,
    height: 20,
    borderRadius: "50%",
    border: "none",
    cursor: "pointer",
  },
  actionBtn: {
    padding: "4px 10px",
    background: "transparent",
    color: "#888",
    border: "1px solid #333",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: 12,
  },
  label: {
    color: "#555",
    fontSize: 11,
  },
  canvas: {
    flex: 1,
    display: "block",
    background: "#fff",
    cursor: "crosshair",
  },
  debug: {
    padding: "4px 16px",
    background: "#1e1e1e",
    color: "#444",
    fontSize: 11,
  },
};
 