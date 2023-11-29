'use client';

import { bscTestnet } from 'wagmi/chains';

export const currentMode = Number(process.env.NEXT_PUBLIC_ENV) || 0;
export const config = [
  // dev mode
  {
    api_url: 'https://stg-api.cryptosheesh.net/',
    supported_chains: [bscTestnet],
  },
  // prod mode
  {
    api_url: 'https://example.com/api',
  },
];

export default {
  project: 'next14_tailwind_connectkit',
  setting: config[currentMode],
  isTestnet: Number(currentMode) === 0,
};
