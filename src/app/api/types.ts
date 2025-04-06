// app/api/types.ts
export interface User {
    id: string;
    name: string;
    isHost: boolean;
  }
  
  export interface Room {
    id: string;
    createdAt: string;
    users: User[];
    active: boolean;
  }