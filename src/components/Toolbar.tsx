"use client";

const Toolbar = ({
  setColor,
  setBrushSize,
}: {
  setColor: (color: string) => void;
  setBrushSize: (size: number) => void;
}) => {
  return (
    <div className="flex gap-3 p-2 bg-gray-200 rounded-lg">
      <input type="color" onChange={(e) => setColor(e.target.value)} />
      <input type="range" min="1" max="20" onChange={(e) => setBrushSize(Number(e.target.value))} />
    </div>
  );
};

export default Toolbar;
