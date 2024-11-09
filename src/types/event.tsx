export type EventType = {
  id: number;
  organizer: string;
  name: string;
  date: string;
  location: string;
  maxCapacity: number;
  stakeAmount: number;
  tokenType: string;
  participants: string[];
  stakes: number[];
  attendance: string[];
};
