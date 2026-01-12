// @ts-ignore external JS module without typings
import CONTRACTS from '../contracts/addresses.js'
import AdminRegistryAbi from '../contracts/AdminRegistry.sol.abi.json'
import NGORegistryAbi from '../contracts/NGORegistry.sol.abi.json'
import DesignerRegistryAbi from '../contracts/DesignerRegistry.sol.abi.json'
import FileManagerAbi from '../contracts/FileManager.sol.abi.json'
import CampaignRegistryAbi from '../contracts/CampaignRegistry.sol.abi.json'
import DonationManagerAbi from '../contracts/DonationManager.sol.abi.json'
import ProofNFTAbi from '../contracts/ProofNFT.sol.abi.json'
import DesignMarketplaceAbi from '../contracts/DesignMarketplace.sol.abi.json'

export const addresses = CONTRACTS

export const abis = {
  AdminRegistry: AdminRegistryAbi,
  NGORegistry: NGORegistryAbi,
  DesignerRegistry: DesignerRegistryAbi,
  FileManager: FileManagerAbi,
  CampaignRegistry: CampaignRegistryAbi,
  DonationManager: DonationManagerAbi,
  ProofNFT: ProofNFTAbi,
  DesignMarketplace: DesignMarketplaceAbi,
}

export type AddressMap = typeof addresses



