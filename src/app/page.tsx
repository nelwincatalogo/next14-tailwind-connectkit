'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWalletContext } from '@/lib/context/wallet';
import { useGlobalState } from '@/lib/store';
import { useHookstate } from '@hookstate/core';
import { ConnectKitButton } from 'connectkit';
import { isAddress, parseEther, parseUnits } from 'viem';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { getAccount, getNetwork, getWalletClient, sendTransaction, waitForTransaction } from '@wagmi/core';

export default function Home() {
  const { toast, getBalance, ctxContract, getMyBalance } = useWalletContext();
  const gState = useGlobalState();

  const loading = useHookstate(false);
  const address = useHookstate('');
  const addressBal = useHookstate({
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
  });
  const toSend = useHookstate({
    tBNB: 0,
    USDT: 0,
  });

  const checkBal = async () => {
    try {
      loading.set(true);
      if (!isAddress(address.value)) {
        throw new Error('Invalid Address');
      }

      const balance = await getBalance(address.value);
      addressBal.set(balance);

      // check if how much to topup
      const tBNB = 1 - Number(addressBal.gas.formatted.value);
      const USDT = 100 - Number(addressBal.usdt.formatted.value);
      toSend.set({
        tBNB,
        USDT,
      });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Error Getting Balance',
        description: e.message,
      });
    } finally {
      loading.set(false);
    }
  };

  const onTopup = async () => {
    try {
      loading.set(true);

      // send tBNB
      if (toSend.tBNB.value > 0) {
        const sendtBNB = await sendTransaction({
          to: address.value,
          value: parseEther(toSend.tBNB.value.toString()),
        });
        await waitForTransaction({
          hash: sendtBNB.hash,
        });
      }

      // send USDT
      if (toSend.USDT.value > 0) {
        const { chain } = getNetwork();

        const sendUSDT = await ctxContract.busd.write.transfer(
          [address.value, parseUnits(toSend.USDT.value.toString(), gState.balance.usdt.decimals.value)],
          { chain },
        );
        await waitForTransaction({
          hash: sendUSDT,
        });
      }

      await Promise.all([getMyBalance(), checkBal()]);

      toast({
        variant: 'success',
        title: 'Topup Success',
        description: 'Transaction Sent',
      });
    } catch (e) {
      console.error(e);
      toast({
        variant: 'destructive',
        title: 'Topup Error',
        description: e.message,
      });
    } finally {
      loading.set(false);
    }
  };

  return (
    <main className="bg-gray-200">
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <h1 className="text-4xl font-bold text-red-500">Next-Tailwind Starter Template</h1>

        <ConnectKitButton />

        {gState.address.value && (
          <div>
            {/* Balance */}
            <div className="flex items-center gap-2">
              <div className="text-green-600">Balance:</div>
              <div className="space-x-1">
                <Badge variant="secondary">
                  {gState.balance.gas.symbol.value}: {Number(gState.balance.gas.formatted.value).toLocaleString()}
                </Badge>
                <Badge variant="secondary">
                  {gState.balance.usdt.symbol.value}: {Number(gState.balance.usdt.formatted.value).toLocaleString()}
                </Badge>
              </div>
            </div>

            <div className="pt-6">
              <Input
                type="text"
                placeholder="Address"
                value={address.value}
                onChange={(e) => address.set(e.target.value)}
              />
              <div className="space-x-1 pt-1">
                <Badge variant="secondary">
                  {addressBal.gas.symbol.value}: {Number(addressBal.gas.formatted.value).toLocaleString()}
                </Badge>
                <Badge variant="secondary">
                  {addressBal.usdt.symbol.value}: {Number(addressBal.usdt.formatted.value).toLocaleString()}
                </Badge>
              </div>

              <div className="pt-4">
                <div className="text-red-500 font-semibold">To Send:</div>
                <div className="space-x-1 pt-1">
                  <Badge variant="secondary">
                    {addressBal.gas.symbol.value}: {Number(toSend.tBNB.value).toLocaleString()}
                  </Badge>
                  <Badge variant="secondary">
                    {addressBal.usdt.symbol.value}: {Number(toSend.USDT.value).toLocaleString()}
                  </Badge>
                </div>
              </div>

              <div className="pt-6 space-x-2">
                <Button variant="outline" className="border-gray-300" onClick={checkBal} disabled={loading.value}>
                  {loading.value ? 'Loading...' : 'Check Balance'}
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      className="border-gray-300"
                      disabled={loading.value || (toSend.tBNB.value <= 0 && toSend.USDT.value <= 0)}
                    >
                      {loading.value ? 'Loading...' : 'Send Balance'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action will transfer 1 tBNB and 100 USDT to the specified address if it has zero balance.
                        Otherwise, it will top up the balance to reach a total of 1 tBNB and 100 USDT.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={onTopup}>Continue</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
