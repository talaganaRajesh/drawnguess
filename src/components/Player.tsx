"use client";

const Players = ({ players }: { players: { name: string; score: number }[] }) => {
  return (
    <div className="w-full p-4 bg-gray-100 rounded-lg shadow-lg">
      <h3 className="text-lg font-bold mb-2">Players</h3>
      <ul>
        {players.map((player, index) => (
          <li key={index} className="flex justify-between">
            <span>{player.name}</span>
            <span>{player.score} pts</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Players;
