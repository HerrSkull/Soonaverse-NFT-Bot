export class NftRoleManager {
    constructor(client, rolesTable, guildId, databaseManager, useSoonaverseNftCount, useSmrNftCount){
        this.client = client;
        this.rolesTable = rolesTable;
        this.guildId = guildId;
        this.databaseManager = databaseManager;
        this.useSoonaverseNftCount = useSoonaverseNftCount;
        this.useSmrNftCount = useSmrNftCount;
    }

    async updateRoles(){
        const identities = await this.databaseManager.getIdentities();
        this.client.guilds.fetch(this.guildId).then(async guild => {
            guild.members.fetch().then(async members => {
                members.forEach( member => {
                    let memberRoles = member.roles.cache;
                    const accounts = identities.filter(e => e.discordtag === member.user.tag);
                    if (accounts.length > 0) {
                        let nftCount = 0;
                        let roleId;
                        accounts.forEach(account => {
                            if(this.useSoonaverseNftCount){
                                nftCount += account.soonaverseNftCount;
                            }
                            if(this.useSmrNftCount){
                                nftCount += account.smrNftCount;
                            }
                        })
                        for(let j = 0; j < this.rolesTable.length;j++){
                            if(this.rolesTable[j].reqNFTs == 0 && !member.roles.cache.has(this.rolesTable[j].roleid)){
                                member.roles.add(this.rolesTable[j].roleid, "NFT-Holder").then((member) => {
                                    console.log(member.user.tag + " - added generic NFT-Holder-Role; " + this.rolesTable[j].roleid);
                                })
                            }
                            if(this.rolesTable[j].reqNFTs <= nftCount){
                                roleId = this.rolesTable[j].roleid;
                            }
                        }

                        if(!member.roles.cache.has(roleId)){
                            member.roles.add(roleId, "NFT-Holder").then( (member) => {
                                console.log(member.user.tag + " - added role: " + roleId);
                            })
                        }
                        memberRoles.forEach((role) => {
                            this.rolesTable.forEach( entry => {
                                if(role.id == entry.roleid && role.id != roleId && entry.reqNFTs != 0){
                                    member.roles.remove(entry.roleid);
                                    console.log(member.user.tag + " - removed role: " + entry.roleid + "   " + roleId);
                                }
                            })
                        })
                    } else {
                        memberRoles.forEach((role) => {
                            this.rolesTable.forEach(entry => {
                                if(role.id == entry.roleid){
                                    member.roles.remove(entry.roleid);
                                    console.log(member.user.tag + " - removed role: " + entry.roleid);
                                }
                            })
                        })
                    }
                })
            })
        })
    }
}