import { ethers } from 'ethers';
import { EtherscanProvider, TransactionReceipt } from '@ethersproject/providers';
import { timer } from '../src/utils/helper'
import abi from "./utils/erc20_abi.json";

class EthAddressDetails {
    address: string;
    provider: EtherscanProvider

    constructor(eth_address: string) {
        this.address = eth_address;
        this.provider = new ethers.providers.EtherscanProvider('ropsten');
    }

    private erc20ContractInstance(contractAddress: string) {
        return new ethers.Contract(contractAddress, abi, this.provider);
    }

    async getTokensHeldByThisAddress() {
        try {
            let history = await this.provider.getHistory(this.address);
            let allReciepts = [] as TransactionReceipt[];
            // just the first 30
            for (const data of history.slice(0, 30)) {
                try {
                    // for etherscan api rate limit
                    await timer(200)
                    const reciept = await this.provider.getTransactionReceipt(data.hash);
                    allReciepts = [...allReciepts, reciept];
                } catch (error) {
                    console.log("error ==>", error);

                }
            }

            let tokenAddresses = allReciepts.reduce<any>((allHistories, singleHistory) => {
                if (singleHistory.to && singleHistory.logs.length) {
                    allHistories.add(singleHistory.to);
                }
                return allHistories;
            }, new Set());

            let userTokens: Array<{ name: string, balance: string }> = [];

            for (const token of Array.from(tokenAddresses)) {
                const contract = this.erc20ContractInstance(token as string)
                const tokenName = await contract.functions.name();
                const tokenBalance = await contract.functions.balanceOf(this.address);
                const calculateUserTokenBalance = ethers.utils.formatUnits(tokenBalance[0]);
                userTokens = [...userTokens, { name: tokenName[0], balance: calculateUserTokenBalance }]
            }

            return userTokens;

        } catch (error) {
            console.log("error ==>", error);

        }
    }

}

new EthAddressDetails("0xD18d08DbFCf9b280D990e8073D28a947a40DB584").getTokensHeldByThisAddress()