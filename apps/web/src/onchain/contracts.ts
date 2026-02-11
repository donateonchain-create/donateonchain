import CONTRACTS from '../contracts/addresses'
import DonateOnChainAbi from '../contracts/DonateOnChain.abi.json'
import { ROLES } from '../contracts/index'

export const addresses = CONTRACTS

export const abis = {
  DonateOnChain: DonateOnChainAbi,
}

export const roles = ROLES

export type AddressMap = typeof addresses
