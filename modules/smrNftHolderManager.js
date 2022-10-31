import { chunk, stripPrefix, fromHex } from "./util.js";
import { Converter } from "@iota/util.js";
import fetch from "node-fetch";
import { SoonaverseApiManager } from "./soonaverseApiManager.js";

export class SmrNftHolderManager{
    constructor(soonaverseCollectionIds, smrCollectionIds, api_endpoint, databaseManager, useSoonaverseCollection, useSmrCollection){
        this.soonaverseCollectionIds = soonaverseCollectionIds;
        this.smrCollectionIds = smrCollectionIds;
        this.API_ENDPOINT = api_endpoint;
        this.databaseManager = databaseManager;
        this.useSoonaverseCollection = useSoonaverseCollection;
        this.useSmrCollection = useSmrCollection;
    }

    async registerMetamaskAddress(interaction, MMAddr){
        await interaction.deferReply({ephemeral: true});
        let soonMembers = await SoonaverseApiManager.getMemberById(MMAddr);
        if(soonMembers.length === 0){
            await interaction.editReply({content: "Submitted Metamask address is not a soonaverse member!", ephemeral : true});
            return
        }
        let soonMember = soonMembers[0]
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
            addresses.push(identity.mmAddr);
        })
        let updatedIdentities = new Array();
        await Promise.all(addresses.map(async (profileId) => {
            const member = await SoonaverseApiManager.getMemberById(profileId);
                if(member.discord){
                    updatedIdentities.push({mmAddr: member.uid, discordtag: member.discord});
                }
        }));
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
        
        await Promise.all(identities.map(async identity => {
            const smrAddress = identity.smrAddr;
            const nfts = await this.getSmrNftsOfAddress(smrAddress);
            
            await Promise.all(nfts.map(async nftOutput => {
                const nftDetails = await this.getSmrNftDetails(nftOutput);
                if(this.smrCollectionIds.indexOf(nftDetails.collectionId) != -1){
                    if(smrNftCount.has(smrAddress)){
                        smrNftCount.set(smrAddress, 1);
                    }
                    else {
                        smrNftCount.set(smrAddress, (smrNftCount.get(smrAddress) + 1));
                    }
                }
            }))
        }))
        await this.databaseManager.updateBulkSmrNftCount(smrNftCount);
    }

    async countSoonaverseNfts(){
        let ethNftCount = new Map();
        await Promise.all(this.soonaverseCollectionIds.map(async (collection) => {
            const nfts = await SoonaverseApiManager.getNftsByCollection(collection);
            for(let i = 0; i < nfts.length; i++) {
                if(ethNftCount.has(nfts[i]["owner"])){
                    ethNftCount.set(nfts[i]["owner"], 1);
                }
                else {
                    ethNftCount.set(nfts[i]["owner"], (ethNftCount.get(nfts[i]["owner"]) + 1));
                }
            }
        }));
        await this.databaseManager.clearSoonaverseNftCount();
        await this.databaseManager.updateBulkSoonaverseNftCount(ethNftCount);     
    }

    async getSmrNftsOfAddress(walletAddress) {
        return fetch(this.API_ENDPOINT + "api/indexer/v1/outputs/nft?address=" + walletAddress)
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

    async getSmrNftDetails(outputAddress){
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
}