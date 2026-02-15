export type Transmission = {
  id: string;
  timestamp: string;
  title: string;
  body: string;
  expanded: boolean;
};

export const transmissions: Transmission[] = [
  {
    id: '001',
    timestamp: '2025.12.01 // 12:00:00',
    title: 'INITIAL BOOT SEQUENCE',
    body: 'Relay online. Calibrating signal. Stand by for transmissions.',
    expanded: false,
  },
];
