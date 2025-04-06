"use client";

import { useEffect, useState } from "react";

const Timer = ({ duration = 60 }: { duration?: number }) => {
  const [time, setTime] = useState(duration);

  useEffect(() => {
    if (time === 0) return;
    const interval = setInterval(() => setTime((prev) => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [time]);

  return (
    <div className="text-xl font-bold text-red-500">{time} sec</div>
  );
};

export default Timer;
