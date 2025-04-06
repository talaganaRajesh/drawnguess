"use client";

export default function WordPrompt() {
  // Later this can be conditionally rendered only for Drawer
  const word = "Elephant";

  return (
    <div className="bg-yellow-100 p-4 rounded-md text-center font-bold text-lg">
      Draw: {word}
    </div>
  );
}
