import { MongoClient, ServerApiVersion } from "mongodb";

export class DatabaseManager {

    constructor(uri, MONGODB_DATABASE, MONGODB_COLLECTION){
        this.client = new MongoClient(uri);
        this.mongodbDatabase = MONGODB_DATABASE;
        this.mongodbCollection = MONGODB_COLLECTION;
    }


    async getIdentities(){
        try{
            const database = this.client.db(this.mongodbDatabase);
            const identities = database.collection(this.mongodbCollection);
            const query = { discordtag: { $ne: null }};
            const cursor = identities.find(query);
            return await cursor.toArray(); 
        } finally {
        }
    }

    async getIncompleteIdentities(){
        try{
            const database = this.client.db(this.mongodbDatabase);
            const identities = database.collection(this.mongodbCollection);
            const query = { discordtag: { $eq: null }};
            const cursor = identities.find(query).project({soonaverseID: 1, _id: 0});
            return await cursor.toArray(); 
        } finally {
        }
    }

    async getMMSmrAddressPairs(){
        try{
            const database = this.client.db(this.mongodbDatabase);
            const identities = database.collection(this.mongodbCollection);
            const query = { smrAddr: { $ne: null }};
            const cursor = identities.find(query);
            return await cursor.toArray();
        } finally {
        }
    }

    async updateIdentity(identity){
        try{
            const database = this.client.db(this.mongodbDatabase);
            const identities = database.collection(this.mongodbCollection);
            await identities.updateOne({soonaverseID: identity.soonaverseID}, { $set: {discordtag: identity.discordtag, smrAddr: identity.smrAddr, iotaAddr: identity.iotaAddr}}, { upsert: true })
        } finally {
        }
    }

    async updateBulkIdentity(identityBulk){
        if(identityBulk.length === 0){
            return
        }
        try{
            const database = this.client.db(this.mongodbDatabase);
            const identities = database.collection(this.mongodbCollection);
            const operations = identityBulk.map((identity) => {
                return {updateOne:{filter:{soonaverseID:identity.soonaverseID}, update:{ $set: {discordtag: identity.discordtag}}, upsert: true}}
            });
            await identities.bulkWrite(operations);
        } finally {

        }
    }

    async updateSoonaverseNftCount(soonaverseID, nftCount){
        try{
            const database = this.client.db(this.mongodbDatabase);
            const identities = database.collection(this.mongodbCollection);
            await identities.updateOne({soonaverseID: soonaverseID}, { $set: {soonaverseNftCount: nftCount}}, { upsert: true })
        } finally {
        }
    }

    async updateBulkSoonaverseNftCount(soonaverseNftCount){
        if(soonaverseNftCount.size === 0){
            return
        }
        try{
            const database = this.client.db(this.mongodbDatabase);
            const identities = database.collection(this.mongodbCollection);
            const operations = Array.from(soonaverseNftCount).map((soonaverseIDMap) => {
                return {updateOne:{filter:{soonaverseID:soonaverseIDMap[0]}, update:{ $set: {soonaverseNftCount: soonaverseIDMap[1]}},upsert: true}}
            });
            await identities.bulkWrite(operations);
        } finally {

        }
    }

    async updateSmrNftCount(smrAddr, nftCount){
        try{
            const database = this.client.db(this.mongodbDatabase);
            const identities = database.collection(this.mongodbCollection);
            await identities.updateOne({smrAddr: smrAddr}, { $set: {smrNftCount: nftCount}})
        } finally {
        }
    }

    async updateBulkSmrNftCount(smrNftCount){
        if(smrNftCount.size === 0){
            return
        }
        try{
            const database = this.client.db(this.mongodbDatabase);
            const identities = database.collection(this.mongodbCollection);
            const operations = Array.from(smrNftCount).map((smrAddrMap) => {
                return {updateOne:{filter:{smrAddr:smrAddrMap[0]}, update:{ $set: {smrNftCount: smrAddrMap[1]}}, upsert: false}}
            });
            await identities.bulkWrite(operations);
        } finally {

        }
    }

    async clearSoonaverseNftCount(){
        try{
            const database = this.client.db(this.mongodbDatabase);
            const identities = database.collection(this.mongodbCollection);
            await identities.updateMany({soonaverseNftCount: { $ne: null}}, { $set: {soonaverseNftCount: 0}});
        } finally {
        }
    }

    async updateBulksevmNftCount(sevmNftCount){
        if(sevmNftCount.size === 0){
            return
        }
        try{
            const database = this.client.db(this.mongodbDatabase);
            const identities = database.collection(this.mongodbCollection);
            const operations = Array.from(sevmNftCount).map((sevmAddrMap) => {
                return {updateOne:{filter:{soonaverseID:sevmAddrMap[0]}, update:{ $set: {sevmNftCount: sevmAddrMap[1]}}, upsert: false}}
            });
            await identities.bulkWrite(operations);
        } finally {
        }
    }

}
