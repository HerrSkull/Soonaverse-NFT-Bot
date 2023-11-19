import { chunk, stripPrefix, fromHex } from "./util.js";
import { Converter } from "@iota/util.js";
import fetch from "node-fetch";
import { SoonaverseApiManager } from "./soonaverseApiManager.js";
import { Bech32Helper, ED25519_ADDRESS_TYPE } from "@iota/iota.js-stardust";
import { SmrEvmHolderManager } from "./evmHolderManager.js";

export class SmrNftHolderManager{
    constructor(soonaverseCollectionIds, smrIssuerAddresses, api_endpoint, databaseManager, useSoonaverseCollection, useSmrCollection, useSMREVMCollection, smrEVMContractAddresses, SOONAVERSE_API_KEY){
        this.soonaverseCollectionIds = soonaverseCollectionIds;
        this.API_ENDPOINT = api_endpoint;
        this.databaseManager = databaseManager;
        this.useSoonaverseCollection = useSoonaverseCollection;
        this.useSmrCollection = useSmrCollection;
        this.smrIssuerAddresses = smrIssuerAddresses;
        this.useSMREVMCollection = useSMREVMCollection;
        this.smrEVMHolderManager = new SmrEvmHolderManager(smrEVMContractAddresses);
        this.soonaverseApiManager = new SoonaverseApiManager(SOONAVERSE_API_KEY);
    }

    async registerMetamaskAddress(interaction, soonaverseID){
        await interaction.deferReply({ephemeral: true});
        let soonMember = await this.soonaverseApiManager.getMemberById(soonaverseID);
        let discordTag = interaction.member.user.username;
        if(soonMember.discord != discordTag){
            await interaction.editReply({content: "The discordtag of the submitted Soonaverse user does not match your discordtag!"})
            return
        }
        this.databaseManager.updateIdentity({soonaverseID: soonaverseID, discordtag: soonMember.discord, smrAddr: soonMember.validatedAddress.smr, iotaAddr: soonMember.validatedAddress.iota});
        await interaction.editReply({content: "Succesfully registered!\r\nsoonaverseID: " + soonaverseID + "\r\nsmrAddr: " + soonMember.validatedAddress.smr + "\r\niotaAddr: " + soonMember.validatedAddress.iota, ephemeral: true})
        return
    }

    async updateSoonaverseProfiles(){
        const identities = await this.databaseManager.getIncompleteIdentities();
        const addresses = new Array();
        identities.forEach(identity => {
            if(identity.soonaverseID != null){
                addresses.push(identity.soonaverseID);
            }
        })
        let updatedIdentities = new Array();
        for(let i = 0; i < addresses.length; i++){
            const member = await this.soonaverseApiManager.getMemberById(addresses[i]);
                if(member.discord){
                    updatedIdentities.push({soonaverseID: member.uid, discordtag: member.discord});
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
        if(this.useSMREVMCollection){
            await this.countSMREVMNfts();
        }
    }

    async countSMREVMNfts(){
        const smrEVMNftCount = new Map();
        const contractInformation = await this.smrEVMHolderManager.getAllEvmHolders();
        for (const collection of contractInformation){
            for (const tokenholder of collection.tokenHolders){
                let walletAddressLowerCase = tokenholder.walletAddress.toLowerCase();
                if(!smrEVMNftCount.has(walletAddressLowerCase)){
                    smrEVMNftCount.set(walletAddressLowerCase, Number(tokenholder.value));
                } else {
                    smrEVMNftCount.set(walletAddressLowerCase, (smrEVMNftCount.get(walletAddressLowerCase) + Number(tokenholder.value)));
                }
            }
        }
        await this.databaseManager.updateBulksevmNftCount(smrEVMNftCount);
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
                        smrNftCount.set(bech32Addr, (smrNftCount.get(bech32Addr) + 1));
                    }
                } //nft owned by nft
            }
        }))
        await this.databaseManager.updateBulkSmrNftCount(smrNftCount)
    }

    async countSoonaverseNfts(){
        let soonaverseNftCount = new Map();
        for(let j = 0; j < this.soonaverseCollectionIds.length; j++){
            const nfts = await this.soonaverseApiManager.getNftsByCollection(this.soonaverseCollectionIds[j]);
            for(let i = 0; i < nfts.length; i++) {
                if(soonaverseNftCount.has(nfts[i]["owner"])){
					soonaverseNftCount.set(nfts[i]["owner"], (soonaverseNftCount.get(nfts[i]["owner"]) + 1));
                }
                else {
                    soonaverseNftCount.set(nfts[i]["owner"], 1);
                }
            }
        }
        await this.databaseManager.clearSoonaverseNftCount();
        await this.databaseManager.updateBulkSoonaverseNftCount(soonaverseNftCount);     
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

    async getSmrNftsByIssuerPage(issuerAddress, cursor) {
        return fetch(this.API_ENDPOINT + "api/indexer/v1/outputs/nft?issuer=" + issuerAddress + "&cursor=" + cursor)
            .then(async res => {
                const isJson = res.headers.get('content-type')?.includes('application/json');
                const data = isJson ? await res.json() : null;
    
                if (!res.ok) {
                    const err = (data && data.message) || res.status;
                    return Promise.reject(err);
                }
            
                return data
            })
            .catch(error => {
                console.log(error);
                return Promise.reject(error);
            })
    }

    async getSmrNftsByIssuer(issuerAddress){
		return new Promise( (resolve, reject) => {
			let results = new Array();
			fetch(this.API_ENDPOINT + "api/indexer/v1/outputs/nft?issuer=" + issuerAddress)
			.then(async res => {
                const isJson = res.headers.get('content-type')?.includes('application/json');
                let data = isJson ? await res.json() : null;
    
                if (!res.ok) {
                    const err = (data && data.message) || res.status;
                    return reject(err);
                }
                results.push(...data.items);
				while(data.hasOwnProperty('cursor')){
					data = await this.getSmrNftsByIssuerPage(issuerAddress, data.cursor);
                    results.push(...data.items);
				}
				return resolve(results);
            })
            .catch(error => {
                console.log("Error while getting Nfts by issuer: " + issuerAddress + " Error: " + error);
                return reject(error);
            })
		})
    }
	
	static async getNftsByCollectionPage(issuerAddress, cursor){
        return fetch(API_ENDPOINT + "getMany?collection=nft&fieldName=collection&fieldValue=" + issuerAddress + "&cursor=" + cursor)
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
                console.log("Error while getting page of Nfts of Collection: " + issuerAddress + " Error: " + error);
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