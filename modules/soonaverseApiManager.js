import fetch from "node-fetch";

const API_ENDPOINT = "https://soonaverse.com/api/";

export class SoonaverseApiManager{

    constructor(){

    }
    
    static async getNftsByCollection(collectionId){
        return fetch(API_ENDPOINT + "getMany?collection=nft&fieldName=collection&fieldValue=" + collectionId)
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
    
    static async getMemberById(memberId){
        return fetch(API_ENDPOINT + "getById?collection=member&uid=" + memberId)
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