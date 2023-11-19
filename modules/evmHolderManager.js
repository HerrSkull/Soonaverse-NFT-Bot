import fetch from "node-fetch";

export class SmrEvmHolderManager{
    constructor(SMREVMContractAddresses){
        this.contractAddresses = SMREVMContractAddresses;
    }

    async getAllEvmHolders(){
        const contractInformation = [];
        for(const contractAddress of this.contractAddresses){
            const tokenHolders = await this.getEvmHolders(contractAddress);
            contractInformation.push({contractAddress,tokenHolders});
        }
        return contractInformation;
    }

    async getEvmHolders(contractAddr){
        const baseURL = `https://explorer.evm.shimmer.network/api/v2/tokens/${contractAddr}/holders`;
            let nextPageParams = undefined;
            const tokenHolders = [];
			while(true){
                const url = nextPageParams
                    ? `${baseURL}?address_hash=${nextPageParams.address_hash}&items_count=${nextPageParams.items_count}&value=${nextPageParams.value}`
                    : baseURL;
                const response = await fetch(url);
                const isJson = response.headers.get('content-type')?.includes('application/json');
                let data = isJson ? await response.json() : null;
                if (!response.ok) {
                    const err = (data && data.message) || response.status;
                    return reject(err);
                }
                if(data.items){
                    tokenHolders.push(
                        ...data.items.map((item) => ({
                            walletAddress: item.address.hash,
                            value: item.value
                        })),
                    );
                }

                nextPageParams = data.next_page_params;
                if(!nextPageParams){
                    break;
                }
            }

            return tokenHolders;
    }
}