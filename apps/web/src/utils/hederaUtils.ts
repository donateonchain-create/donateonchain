import { getAccountBalance, getAccountInfo, convertEvmAddressToAccountId } from '../config/hederaClient';

const isDev = import.meta.env.DEV;

export const getHederaBalanceForEvmAddress = async (evmAddress: string): Promise<string | null> => {
  try {
    const accountId = convertEvmAddressToAccountId(evmAddress);
    if (!accountId) {
      if (isDev) {
        // eslint-disable-next-line no-console
        console.warn('Could not convert EVM address to Hedera Account ID');
      }
      return null;
    }
    
    const balance = await getAccountBalance(accountId);
    return balance;
  } catch (error) {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.error('Error fetching Hedera balance for EVM address:', error);
    }
    return null;
  }
};

export const getHederaAccountInfoForEvmAddress = async (evmAddress: string) => {
  try {
    const accountId = convertEvmAddressToAccountId(evmAddress);
    if (!accountId) {
      if (isDev) {
        // eslint-disable-next-line no-console
        console.warn('Could not convert EVM address to Hedera Account ID');
      }
      return null;
    }
    
    const info = await getAccountInfo(accountId);
    return info;
  } catch (error) {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.error('Error fetching Hedera account info for EVM address:', error);
    }
    return null;
  }
};

export { convertEvmAddressToAccountId };

