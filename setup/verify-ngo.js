import { Client, ContractExecuteTransaction, PrivateKey, ContractFunctionParameters, AccountId } from '@hashgraph/sdk';

// Load variables from root .env 
const operatorId = process.env.ACCOUNT_ID;
// You must provide the private key for the account that holds the COMPLIANCE_OFFICER_ROLE!
const operatorKey = process.env.COMPLIANCE_OFFICER_PRIVATE_KEY || process.env.PRIVATE_KEY;

// Contract ID from your web app config (.env)
const contractId = process.env.VITE_CONTRACT_ID || process.env.CONTRACT_ID || '0.0.7802966';

// The wallet address of the NGO you want to verify
const targetWalletAddress = process.argv[2];

if (!operatorId || !operatorKey) {
    console.error("Missing ACCOUNT_ID or PRIVATE_KEY in .env");
    process.exit(1);
}

async function verifyNgo() {
    console.log(`Verifying NGO wallet: ${targetWalletAddress} on contract ${contractId}...`);
    
    const client = Client.forTestnet();
    const cleanKey = operatorKey.replace('0x', '');
    client.setOperator(operatorId, PrivateKey.fromStringECDSA(cleanKey));

    try {
        console.log(`Calling verifyAccount on contract ${contractId}...`);
        console.log(`Note: The account executing this MUST have the COMPLIANCE_OFFICER_ROLE (from .env COMPLIANCE_OFFICER).`);
        // Execute the verifyAccount function on the smart contract
        // Function signature: verifyAccount(address _account)
        const tx = await new ContractExecuteTransaction()
            .setContractId(contractId)
            .setGas(500000)
            .setFunctionParameters(
                new ContractFunctionParameters().addAddress(targetWalletAddress)
            )
            .setFunction("verifyAccount")
            .execute(client);

        const receipt = await tx.getReceipt(client);
        console.log(`✅ NGO Verified Successfully! Status: ${receipt.status.toString()}`);
        console.log(`You can now refresh the web app, and the 'Campaigns' tab will appear in your Profile.`);
        
        process.exit(0);
    } catch (e) {
        console.error("❌ Failed to verify NGO:", e);
        if (e.message && e.message.includes("CONTRACT_REVERT_EXECUTED")) {
            console.error("\n===========================");
            console.error("🚨 REVERT EXPLANATION 🚨");
            console.error("The smart contract rejected the transaction because your Operator account does NOT have the COMPLIANCE_OFFICER_ROLE.");
            console.error("You must pass the Private Key of the Compliance Officer to run this script.");
            console.error("Usage: COMPLIANCE_OFFICER_PRIVATE_KEY=0x... node --env-file=.env setup/verify-ngo.js 0xYOUR_WALLET");
            console.error("===========================\n");
        }
        process.exit(1);
    }
}

verifyNgo();
