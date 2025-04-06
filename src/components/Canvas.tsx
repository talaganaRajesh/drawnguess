'use client'

import React from 'react'
import { useEffect,useState,useRef } from 'react'

function Canvas() {
    const canvasRef = useRef<HTMLCanvasElement | null >(null);
    const ctxRef=useRef<CanvasRenderingContext2D | null>(null);
    const [drawing, setDrawing] = useState(false);
    const [color, setColor] = useState("#000000");
    const [brushSize, setBrushSize] = useState(5);

    useEffect(()=>{
        const canvas=canvasRef.current;

        if(!canvas) return;

        canvas.width=800;
        canvas.height=500;
        const ctx=canvas.getContext("2d");

        if(ctx){
            ctx.lineCap="round";
            ctx.lineJoin="round";
            ctx.strokeStyle=color;
            ctx.lineWidth=brushSize;
            ctxRef.current=ctx;
        }
    },[color,brushSize]);


    const startDrawing=(e:React.MouseEvent)=>{
        setDrawing(true);
        ctxRef.current?.beginPath();
        ctxRef.current?.moveTo(e.nativeEvent.offsetX,e.nativeEvent.offsetY);
    };

    const draw=(e:React.MouseEvent)=>{
        if(!drawing || !ctxRef.current) return;
        ctxRef.current.lineTo(e.nativeEvent.offsetX,e.nativeEvent.offsetY);
        ctxRef.current.stroke();
    }

    const stopDrawing=()=>{
        setDrawing(false);
        ctxRef.current?.closePath();
    };



  return (
    <div className="flex flex-col items-center">
      <canvas
        ref={canvasRef}
        className="border-2 border-gray-300 rounded-lg"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
      />
      <div className="flex gap-3 mt-3">
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />
        <input
          type="range"
          min="1"
          max="20"
          value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
        />
      </div>
    </div>
  )
}

export default Canvas