import React from 'react';
import { useStore } from '../store';
import { CHAINS, SUPPORTED_CHAIN_IDS } from '../config/chains';

export default function ChainSelector() {
  const { chainId, setChainId, provider } = useStore();

  const switchChain = async (targetChainId) => {
    if (targetChainId === chainId) return;
    setChainId(targetChainId);

    // Also request wallet to switch if connected
    if (window.ethereum) {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${targetChainId.toString(16)}` }],
        });
      } catch (err) {
        if (err.code === 4902) {
          const chain = CHAINS[targetChainId];
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${targetChainId.toString(16)}`,
              chainName: chain.name,
              rpcUrls: [chain.rpcUrl],
              nativeCurrency: chain.nativeCurrency,
              blockExplorerUrls: [chain.explorerUrl],
            }],
          });
        }
      }
    }
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap justify-center">
      {SUPPORTED_CHAIN_IDS.map((id) => {
        const chain = CHAINS[id];
        const isActive = id === chainId;
        return (
          <button
            key={id}
            onClick={() => switchChain(id)}
            className={isActive ? 'chain-pill-active' : 'chain-pill-inactive'}
          >
            <span className="mr-1">{chain.icon}</span>
            {chain.shortName}
          </button>
        );
      })}
    </div>
  );
}
