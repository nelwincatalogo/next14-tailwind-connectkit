'use client';

import { hookstate, useHookstate } from '@hookstate/core';
import { devtools } from '@hookstate/devtools';

export const globalState = hookstate(
  {
    address: '',
    blockchain: null as any,
    contracts: null as any,
    balance: {
      gas: {
        decimals: 18,
        formatted: '0',
        symbol: 'tBNB',
        value: 0,
      },
      usdt: {
        decimals: 6,
        formatted: '0',
        symbol: 'USDT',
        value: 0,
      },
    },
  },
  devtools({ key: 'globalState' }),
);

export const useGlobalState = () => useHookstate(globalState);
