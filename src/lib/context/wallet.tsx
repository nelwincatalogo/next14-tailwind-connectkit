'use client';

import { toast } from '@/components/ui/use-toast';
import { createContext, useContext, useEffect, useState } from 'react';
import { useGlobalState } from '../store';
import { WagmiConfig, configureChains, createConfig } from 'wagmi';
import { publicProvider } from 'wagmi/providers/public';
import config, { currentMode } from '../config';
import { jsonRpcProvider } from 'wagmi/providers/jsonRpc';
import { ConnectKitProvider } from 'connectkit';
import axios, { BLOCKCHAIN } from '@/lib/api';
import { InjectedConnector, fetchBalance, getContract, getPublicClient, getWalletClient } from '@wagmi/core';
import { MetaMaskConnector } from '@wagmi/core/connectors/metaMask';
import { WalletConnectConnector } from '@wagmi/core/connectors/walletConnect';
import { shortenAddress } from '../utils';

const { chains, publicClient, webSocketPublicClient } = configureChains(
  config.setting.supported_chains,
  currentMode === 0
    ? [
        jsonRpcProvider({
          rpc: (chain) => ({
            http: `https://endpoints.omniatech.io/v1/bsc/testnet/public`,
          }),
        }),
        publicProvider(),
      ]
    : [publicProvider()],
);

const _config = createConfig({
  autoConnect: false,
  connectors: [
    new InjectedConnector({ chains }),
    new MetaMaskConnector({
      chains,
    }),
    new WalletConnectConnector({
      chains,
      options: {
        projectId: `${process.env.NEXT_PUBLIC_PROJECT_ID}`,
        showQrModal: false,
      },
    }),
  ],
  publicClient,
  webSocketPublicClient,
});

export const WalletContext = createContext<any>({});
export const useWalletContext = () => useContext(WalletContext);

export function WalletProvider({ children }) {
  const gState = useGlobalState();
  const [ctxContract, setCtxContract] = useState(null as any);

  /**
   * LISTENERS & LIFE CYCLE =======================================================
   */

  const onLoad = async () => {
    await fetchBlockchain();
    await loadContract();
  };

  const onConnect = async (data) => {
    console.log('onConnect: ', data);
    gState.address.set(data.address);

    await loadContract();

    // get balance
    const balance = await getBalance(data.address);
    gState.balance.set(balance);

    toast({
      title: 'Connected',
      description: shortenAddress(data.address),
    });
  };

  const onDisconnect = async () => {
    gState.address.set('');
    onLoad();

    toast({
      title: 'Disconnected',
      description: 'Wallet Disconnected',
    });
  };

  /**
   * CALLABLE FUNCTIONS ===========================================================
   */

  const fetchBlockchain = async () => {
    try {
      const blockchainData = await axios.get(BLOCKCHAIN).then((res) => res.data.data);
      gState['blockchain'].set(blockchainData);

      const busd = {
        address: blockchainData.config.busd_address,
        abi: blockchainData.config.busd_abi,
      };

      gState['contracts'].set({ busd });
    } catch (error) {
      console.error('fetchBlockchain: ', error);
    }
  };

  const loadContract = async () => {
    try {
      const publicClient = getPublicClient();
      const walletClient = await getWalletClient();

      const busd = getContract({
        ...gState['contracts']['busd'].get({ noproxy: true }),
        publicClient,
        walletClient,
      });

      setCtxContract({
        busd,
      });
    } catch (error) {
      console.error('loadContract: ', error);
    }
  };

  const getBalance = async (address) => {
    try {
      const gas: any = await fetchBalance({
        address,
      });
      const usdt: any = await fetchBalance({
        address,
        token: gState['contracts']['busd']['address'].value,
      });

      gas.value = `${gas.value}`;
      usdt.value = `${usdt.value}`;

      return {
        gas,
        usdt,
      };
    } catch (e) {
      console.error('getBalance: ', e.message);
      toast({
        variant: 'destructive',
        title: 'Error Getting Balance',
        description: e.message,
      });
    }
  };

  const getMyBalance = async () => {
    const balance = await getBalance(gState.address.value);
    gState.balance.set(balance);
  };

  /**
   * DON'T TOUCH THE FOLLOWING ====================================================
   */

  useEffect(() => {
    onLoad();

    const orig = window.console.error;
    window.console.error = function (...args) {
      if (args[0]?.name === 'ChainDoesNotSupportContract') return;
      orig.apply(window.console, args);
    };
  }, []);

  return (
    <WalletContext.Provider
      value={{
        toast,
        ctxContract,
        getBalance,
        getMyBalance,
      }}
    >
      <WagmiConfig config={_config}>
        <ConnectKitProvider onConnect={onConnect} onDisconnect={onDisconnect}>
          {children}
        </ConnectKitProvider>
      </WagmiConfig>
    </WalletContext.Provider>
  );
}
