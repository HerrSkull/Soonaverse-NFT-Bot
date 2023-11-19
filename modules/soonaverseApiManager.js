import fetch from "node-fetch";

const API_ENDPOINT = "https://api.build5.com/api/";

export class SoonaverseApiManager{

    constructor(API_KEY){
        this.API_KEY = API_KEY;
    }
    
    async getNftsByCollection(collectionId){
		return new Promise( (resolve, reject) => {
			let results = new Array();
			fetch(API_ENDPOINT + "getMany?collection=nft&fieldName=collection&fieldValue=" + collectionId,{
                method: 'get',
                headers: new Headers({
                    'Authorization': 'Bearer ' + this.API_KEY
                })
            })
			.then(async res => {
                const isJson = res.headers.get('content-type')?.includes('application/json');
                const data = isJson ? await res.json() : null;
    
                if (!res.ok) {
                    const err = (data && data.message) || res.status;
                    return reject(err);
                }
                results.push(...data);
				let page = await this.getNftsByCollectionPage(collectionId, results.slice(-1)[0].id);
				while(page.length != 0){
					results.push(...page);
					page = await this.getNftsByCollectionPage(collectionId, page.slice(-1)[0].id);
				}
				return resolve(results);
            })
            .catch(error => {
                console.log("Error while getting Nfts of Collection: " + collectionId + " Error: " + error);
                return reject(error);
            })
		})
    }
	
	async getNftsByCollectionPage(collectionId, startAfter){
        return fetch(API_ENDPOINT + "getMany?collection=nft&fieldName=collection&fieldValue=" + collectionId + "&startAfter=" + startAfter,{
            method: 'get',
            headers: new Headers({
                'Authorization': 'Bearer ' + this.API_KEY
            })
        })
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
                console.log("Error while getting page of Nfts of Collection: " + collectionId + " Error: " + error);
                return Promise.reject(error);
            })
    }
    
    async getMemberById(memberId){
        return fetch(API_ENDPOINT + "getById?collection=member&uid=" + memberId,{
            method: 'get',
            headers: new Headers({
                'Authorization': 'Bearer ' + this.API_KEY
            })
        })
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
                console.log("Error while getting Soonaverse profile: " + memberId + " Error: " + error);
                return Promise.reject(error);
            })
    }
}