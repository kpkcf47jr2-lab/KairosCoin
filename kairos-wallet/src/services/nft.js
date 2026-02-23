// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — NFT Service
//  Fetch ERC-721 + ERC-1155 NFTs via block explorer APIs
//  Superior: supports both NFT standards
// ═══════════════════════════════════════════════════════

import { ethers } from 'ethers';
import { CHAINS } from '../constants/chains';
import { getProvider } from './blockchain';

// Minimal ERC-721 ABI
const ERC721_ABI = [
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function balanceOf(address owner) view returns (uint256)',
];

// ERC-1155 ABI
const ERC1155_ABI = [
  'function uri(uint256 id) view returns (string)',
  'function balanceOf(address account, uint256 id) view returns (uint256)',
];

// Explorer API keys (free tier — register for better limits)
const API_KEYS = {
  56: 'YourApiKeyToken',   // BscScan — https://bscscan.com/myapikey
  1: 'YourApiKeyToken',    // Etherscan — https://etherscan.io/myapikey
  137: 'YourApiKeyToken',  // PolygonScan — https://polygonscan.com/myapikey
  42161: 'YourApiKeyToken', // Arbiscan
  8453: 'YourApiKeyToken',  // BaseScan
};

// NOTE: Replace 'YourApiKeyToken' with real keys for production.
// Free tier without keys has ~1 req/5s limit which is very slow.

// Cache NFTs per address+chain
const nftCache = {};
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

/**
 * Fetch NFTs for an address using block explorer API
 * Falls back to moralis-like approach if available
 */
export async function getNFTs(chainId, address) {
  const key = `${chainId}_${address.toLowerCase()}`;
  const cached = nftCache[key];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.data;

  const chain = CHAINS[chainId];
  if (!chain?.blockExplorerApiUrl) return [];

  const nfts = [];

  try {
    // Fetch ERC-721 token transfers (to find NFTs owned)
    const url = `${chain.blockExplorerApiUrl}?module=account&action=tokennfttx&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${API_KEYS[chainId] || ''}`;
    const resp = await fetch(url);
    const json = await resp.json();

    if (json.status === '1' && json.result) {
      // Group by contract+tokenId, track ownership
      const ownedMap = new Map();

      for (const tx of json.result) {
        const nftKey = `${tx.contractAddress}_${tx.tokenID}`;
        const isOwner = tx.to.toLowerCase() === address.toLowerCase();

        if (isOwner) {
          if (!ownedMap.has(nftKey)) {
            ownedMap.set(nftKey, {
              contractAddress: tx.contractAddress,
              tokenId: tx.tokenID,
              name: tx.tokenName || 'NFT',
              symbol: tx.tokenSymbol || 'NFT',
              blockNumber: parseInt(tx.blockNumber),
            });
          }
        } else {
          // Transferred away
          ownedMap.delete(nftKey);
        }
      }

      // Resolve metadata for owned NFTs (limit to first 20)
      const ownedList = Array.from(ownedMap.values()).slice(0, 20);

      for (const nft of ownedList) {
        try {
          const metadata = await getNFTMetadata(chainId, nft.contractAddress, nft.tokenId);
          nfts.push({
            ...nft,
            image: metadata?.image || null,
            nftName: metadata?.name || `${nft.name} #${nft.tokenId}`,
            description: metadata?.description || '',
            attributes: metadata?.attributes || [],
          });
        } catch {
          nfts.push({
            ...nft,
            image: null,
            nftName: `${nft.name} #${nft.tokenId}`,
            description: '',
            attributes: [],
          });
        }
      }
    }
  } catch (err) {
    console.error('Error fetching NFTs:', err);
  }

  // ── Also fetch ERC-1155 tokens ──
  try {
    const url1155 = `${chain.blockExplorerApiUrl}?module=account&action=token1155tx&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${API_KEYS[chainId] || ''}`;
    const resp1155 = await fetch(url1155);
    const json1155 = await resp1155.json();

    if (json1155.status === '1' && json1155.result) {
      const owned1155 = new Map();

      for (const tx of json1155.result) {
        const nftKey = `${tx.contractAddress}_${tx.tokenID}`;
        const isOwner = tx.to.toLowerCase() === address.toLowerCase();

        if (isOwner) {
          if (!owned1155.has(nftKey)) {
            owned1155.set(nftKey, {
              contractAddress: tx.contractAddress,
              tokenId: tx.tokenID,
              name: tx.tokenName || 'ERC-1155',
              symbol: tx.tokenSymbol || 'ERC-1155',
              blockNumber: parseInt(tx.blockNumber),
              tokenType: 'ERC-1155',
              tokenValue: tx.tokenValue || '1',
            });
          }
        } else {
          owned1155.delete(nftKey);
        }
      }

      const ownedList1155 = Array.from(owned1155.values()).slice(0, 15);

      for (const nft of ownedList1155) {
        try {
          // Verify actual balance on-chain
          const provider = getProvider(chainId);
          const contract = new ethers.Contract(nft.contractAddress, ERC1155_ABI, provider);
          const balance = await contract.balanceOf(address, nft.tokenId);
          if (balance === 0n) continue;

          const metadata = await get1155Metadata(chainId, nft.contractAddress, nft.tokenId);
          nfts.push({
            ...nft,
            balance: balance.toString(),
            image: metadata?.image || null,
            nftName: metadata?.name || `${nft.name} #${nft.tokenId}`,
            description: metadata?.description || '',
            attributes: metadata?.attributes || [],
          });
        } catch {
          nfts.push({
            ...nft,
            balance: nft.tokenValue,
            image: null,
            nftName: `${nft.name} #${nft.tokenId}`,
            description: '',
            attributes: [],
          });
        }
      }
    }
  } catch (err) {
    console.error('Error fetching ERC-1155 NFTs:', err);
  }

  const result = nfts;
  nftCache[key] = { data: result, timestamp: Date.now() };
  return result;
}

/**
 * Get NFT metadata from tokenURI (ERC-721)
 */
async function getNFTMetadata(chainId, contractAddress, tokenId) {
  try {
    const provider = getProvider(chainId);
    const contract = new ethers.Contract(contractAddress, ERC721_ABI, provider);
    let uri = await contract.tokenURI(tokenId);
    return await resolveMetadataUri(uri);
  } catch {
    return null;
  }
}

/**
 * Get NFT metadata from uri (ERC-1155)
 */
async function get1155Metadata(chainId, contractAddress, tokenId) {
  try {
    const provider = getProvider(chainId);
    const contract = new ethers.Contract(contractAddress, ERC1155_ABI, provider);
    let uri = await contract.uri(tokenId);
    // ERC-1155 uses {id} placeholder in URIs
    uri = uri.replace('{id}', BigInt(tokenId).toString(16).padStart(64, '0'));
    return await resolveMetadataUri(uri);
  } catch {
    return null;
  }
}

/**
 * Resolve a metadata URI (IPFS, data:, https:) to JSON
 */
async function resolveMetadataUri(uri) {
  if (!uri) return null;

  try {
    // Handle IPFS URIs
    if (uri.startsWith('ipfs://')) {
      uri = uri.replace('ipfs://', 'https://ipfs.io/ipfs/');
    }

    // Handle data URIs (base64 encoded JSON)
    if (uri.startsWith('data:application/json;base64,')) {
      const json = atob(uri.split(',')[1]);
      return JSON.parse(json);
    }

    if (uri.startsWith('data:application/json')) {
      const json = uri.split(',').slice(1).join(',');
      return JSON.parse(decodeURIComponent(json));
    }

    const resp = await fetch(uri, { signal: AbortSignal.timeout(10000) });
    const metadata = await resp.json();

    // Fix IPFS image URLs
    if (metadata.image?.startsWith('ipfs://')) {
      metadata.image = metadata.image.replace('ipfs://', 'https://ipfs.io/ipfs/');
    }

    return metadata;
  } catch {
    return null;
  }
}

/**
 * Clear NFT cache for a specific address+chain
 */
export function clearNFTCache(chainId, address) {
  const key = `${chainId}_${address.toLowerCase()}`;
  delete nftCache[key];
}
