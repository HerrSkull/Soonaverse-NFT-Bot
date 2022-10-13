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
            const cursor = identities.find(query).project({mmAddr: 1, _id: 0});
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
            await identities.updateOne({mmAddr: identity.mmAddr}, { $set: {discordtag: identity.discordtag, smrAddr: identity.smrAddr}}, { upsert: true })
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
                return {updateOne:{filter:{mmAddr:identity.mmAddr}, update:{ $set: {discordtag: identity.discordtag}}}, options:{upsert: true}}
            });
            await identities.bulkWrite(operations);
        } finally {

        }
    }

    async updateSoonaverseNftCount(mmAddr, nftCount){
        try{
            const database = this.client.db(this.mongodbDatabase);
            const identities = database.collection(this.mongodbCollection);
            await identities.updateOne({mmAddr: mmAddr}, { $set: {soonaverseNftCount: nftCount}}, { upsert: true })
        } finally {
        }
    }

    async updateBulkSoonaverseNftCount(ethNftCount){
        if(ethNftCount.size === 0){
            return
        }
        try{
            const database = this.client.db(this.mongodbDatabase);
            const identities = database.collection(this.mongodbCollection);
            const operations = Array.from(ethNftCount).map((ethAddr, nftCount) => {
                return {updateOne:{filter:{mmAddr:ethAddr}, update:{ $set: {soonaverseNftCount: nftCount}}}, options:{upsert: true}}
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
            const operations = Array.from(smrNftCount).map((smrAddr, nftCount) => {
                return {updateOne:{filter:{smrAddr:smrAddr}, update:{ $set: {smrNftCount: nftCount}}}, options:{upsert: true}}
            });
            await identities.bulkWrite(operations);
        } finally {

        }
    }

    async clearSoonaverseNftCount(){
        try{
            const database = this.client.db(this.mongodbDatabase);
            const identities = database.collection(this.mongodbCollection);
            await identities.updateMany({soonaverseNftCount: { $ne: null}}, { $set: {smrNftCount: 0}});
        } finally {
        }
    }

}
