import fetch from "node-fetch";

export class TreasuryManager{
    constructor(api, addrList){
        this.api = api;
        this.addrList = addrList;
        this.treasury = 0;
        this.nftCount = 1074;
    }

    async getTreasuryInfos(){
        return new Promise(async (resolve, reject) => {
            this.treasury = 0;
            await Promise.all(this.addrList.map(async (addr) => {
                const val = await getTreasury(this.api, addr);
                this.treasury += val;;
            }))
            resolve(this.treasury);
        })
    }

    getNFTValue() {
        return this.treasury/this.nftCount
    }

}

export async function getTreasury(api, addr) {
    return fetch(api + addr)
        .then(async res => {
            const isJson = res.headers.get('content-type')?.includes('application/json');
            const data = isJson ? await res.json() : null;

            if (!res.ok) {
                const err = (data && data.message) || response.status;
                return Promise.reject(error);
            }
        
            return data["data"]["balance"]/1000000
        })
        .catch(error => {
            console.log(error);
        })
}