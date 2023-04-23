import { chunk, stripPrefix, fromHex } from "./util.js";
import { Converter } from "@iota/util.js";
import fetch from "node-fetch";
import { SoonaverseApiManager } from "./soonaverseApiManager.js";
import { Bech32Helper, ED25519_ADDRESS_TYPE } from "@iota/iota.js-stardust";

export class SmrNftHolderManager{
    constructor(soonaverseCollectionIds, smrCollectionIds, api_endpoint, databaseManager, useSoonaverseCollection, useSmrCollection){
        this.soonaverseCollectionIds = soonaverseCollectionIds;
        this.smrCollectionIds = smrCollectionIds;
        this.API_ENDPOINT = api_endpoint;
        this.databaseManager = databaseManager;
        this.useSoonaverseCollection = useSoonaverseCollection;
        this.useSmrCollection = useSmrCollection;
        this.smrIssuerAddresses = ["smr1qr5tw7cprnx2cf46uztkvu5vddgayh8g9c3t7c0q2q4g9m50vgph58zmqm6"];
    }

    async registerMetamaskAddress(interaction, MMAddr){
        await interaction.deferReply({ephemeral: true});
        let soonMember = await SoonaverseApiManager.getMemberById(MMAddr);
        let discordTag = interaction.member.user.username + "#" + interaction.member.user.discriminator;
        if(soonMember.discord != discordTag){
            await interaction.editReply({content: "The discordtag of the submitted Soonaverse user does not match your discordtag!"})
            return
        }
        this.databaseManager.updateIdentity({mmAddr: MMAddr, discordtag: soonMember.discord, smrAddr: soonMember.validatedAddress.smr});
        await interaction.editReply({content: "Succesfully registered!\r\nMMAddr: " + MMAddr + "\r\nsmrAddr: " + soonMember.validatedAddress.smr, ephemeral: true})
        return
    }

    async updateSoonaverseProfiles(){
        const identities = await this.databaseManager.getIncompleteIdentities();
        const addresses = new Array();
        identities.forEach(identity => {
            if(identity.mmAddr != null){
                addresses.push(identity.mmAddr);
            }
        })
        let updatedIdentities = new Array();
        for(let i = 0; i < addresses.length; i++){
            const member = await SoonaverseApiManager.getMemberById(addresses[i]);
                if(member.discord){
                    updatedIdentities.push({mmAddr: member.uid, discordtag: member.discord});
                }
        }
        await this.databaseManager.updateBulkIdentity(updatedIdentities);
    }

    async updateNftCount(){
        if(this.useSoonaverseCollection){
            await this.countSoonaverseNfts();
            await this.updateSoonaverseProfiles();
        }
        if(this.useSmrCollection){
            await this.countSmrNfts();
        }
    }

    async countSmrNfts(){
        const identities = await this.databaseManager.getMMSmrAddressPairs();
        let smrNftCount = new Map();
        await Promise.all(this.smrIssuerAddresses.map(async issuerAddress => {
            const nftOutputs = await this.getSmrNftsByIssuer(issuerAddress);
            for(let i = 0; i < nftOutputs.length; i++){
                const nftDetails = await this.getSmrNftDetails(nftOutputs[i]);
                //encode unlockaddress bech32
                // nft owned by wallet
                if(nftDetails.output.unlockConditions[0].address.type === 0){
                    const bech32Addr = Bech32Helper.toBech32(ED25519_ADDRESS_TYPE, Converter.hexToBytes(stripPrefix(nftDetails.output.unlockConditions[0].address.pubKeyHash)), "smr")
                    if(!smrNftCount.has(bech32Addr)){
                        smrNftCount.set(bech32Addr, 1);
                    } else {
                        console.log(smrNftCount);
                        smrNftCount.set(bech32Addr, (smrNftCount.get(bech32Addr) + 1));
                        console.log(smrNftCount);
                    }
                } //nft owned by nft
            }
        }))
        await this.databaseManager.updateBulkSmrNftCount(smrNftCount)
    }

    async countSoonaverseNfts(){
        let ethNftCount = new Map();
        for(let j = 0; j < this.soonaverseCollectionIds.length; j++){
            const nfts = await SoonaverseApiManager.getNftsByCollection(this.soonaverseCollectionIds[j]);
            for(let i = 0; i < nfts.length; i++) {
                if(ethNftCount.has(nfts[i]["owner"])){
					ethNftCount.set(nfts[i]["owner"], (ethNftCount.get(nfts[i]["owner"]) + 1));
                }
                else {
                    ethNftCount.set(nfts[i]["owner"], 1);
                }
            }
        }
        await this.databaseManager.clearSoonaverseNftCount();
        await this.databaseManager.updateBulkSoonaverseNftCount(ethNftCount);     
    }

    async getSmrNftsOfAddress(walletAddress) {
        return fetch(this.API_ENDPOINT + "api/indexer/v1/outputs/nft?address=" + walletAddress)
            .then(async res => {
                const isJson = res.headers.get('content-type')?.includes('application/json');
                const data = isJson ? await res.json() : null;
    
                if (!res.ok) {
                    const err = (data && data.message) || res.status;s
                    return Promise.reject(err);
                }
            
                return data.items
            })
            .catch(error => {
                console.log(error);
                return Promise.reject(error);
            })
    }

    async getSmrNftsByIssuer(issuerAddress) {
        return fetch(this.API_ENDPOINT + "api/indexer/v1/outputs/nft?issuer=" + issuerAddress)
            .then(async res => {
                const isJson = res.headers.get('content-type')?.includes('application/json');
                const data = isJson ? await res.json() : null;
    
                if (!res.ok) {
                    const err = (data && data.message) || res.status;
                    return Promise.reject(err);
                }
            
                return data.items
            })
            .catch(error => {
                console.log(error);
                return Promise.reject(error);
            })
    }

    async getSmrNftMetadata(outputAddress){
        return fetch(this.API_ENDPOINT + "api/core/v2/outputs/" + outputAddress)
            .then(async res => {
                const isJson = res.headers.get('content-type')?.includes('application/json');
                const data = isJson ? await res.json() : null;
    
                if (!res.ok) {
                    const err = (data && data.message) || res.status;
                    return Promise.reject(err);
                }
                return JSON.parse(Converter.hexToUtf8(stripPrefix(data.output.immutableFeatures[1].data)));
            })
            .catch(error => {
                console.log(error);
                return Promise.reject(error);
            })
    }

    async getNftOwner(outputAddress){
        return fetch(this.API_ENDPOINT + "api/core/v2/outputs/" + outputAddress)
            .then(async res => {
                const isJson = res.headers.get('content-type')?.includes('application/json');
                const data = isJson ? await res.json() : null;
    
                if (!res.ok) {
                    const err = (data && data.message) || res.status;
                    return Promise.reject(err);
                }
                return JSON.parse(Converter.hexToUtf8(stripPrefix(data.output.unlockConditions.data)));
            })
            .catch(error => {
                console.log(error);
                return Promise.reject(error);
            })
    }

    async getSmrNftDetails(outputAddress){
        return fetch(this.API_ENDPOINT + "api/core/v2/outputs/" + outputAddress)
            .then(async res => {
                const isJson = res.headers.get('content-type')?.includes('application/json');
                const data = isJson ? await res.json() : null;
    
                if (!res.ok) {
                    const err = (data && data.message) || res.status;
                    return Promise.reject(err);
                }
                return data;
            })
            .catch(error => {
                console.log(error);
                return Promise.reject(error);
            })
    }
}