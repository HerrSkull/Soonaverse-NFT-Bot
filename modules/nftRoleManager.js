export class NftRoleManager {
    constructor(collectionIds, soon, client, rolesTable, guildId){
        this.collectionIds = collectionIds;
        this.soon = soon;
        this.client = client;
        this.rolesTable = rolesTable;
        this.discordToEth = new Map();
        this.guildId = guildId;
    }

    updateCurrentHolders() {
        const chunkSize = 10;
        this.soon.getNftsByCollections(this.collectionIds).then(async (obj) => {
            let ethNftCount = new Map();
            let owner_addresses = new Array();
            for(var i = 0; i < obj.length; i++) 
            {
                if(owner_addresses.indexOf(obj[i]["owner"]) === -1){
                    owner_addresses.push(obj[i]["owner"]);
                    ethNftCount.set(obj[i]["owner"], 1);
                }
                else {
                    ethNftCount.set(obj[i]["owner"], (ethNftCount.get(obj[i]["owner"]) + 1));
                }
            }
            
            let chunked = new Array();
            for (let i = 0; i < owner_addresses.length; i += chunkSize) {
                chunked.push(owner_addresses.slice(i, i + chunkSize));
            }
            
            const nftHolders = new Map();
            await Promise.all(chunked.map(async (addresses) => {
                const members = await this.soon.getMemberByIds(addresses);
                members.forEach( (member) => {
                    if(member.discord){
                        let altNftCount = nftHolders.get(member.discord);
                        if(altNftCount){
                            nftHolders.set(member.discord, (ethNftCount.get(member.uid) + altNftCount));
                        } else {
                            nftHolders.set(member.discord, ethNftCount.get(member.uid));
                            this.discordToEth.set(member.discord, member.uid);
                        }
                    }    
                });
            }));
            syncBatchRoles(this.rolesTable, nftHolders, this.guildId, this.client);
        });
    }
}

function syncBatchRoles(rolesArr, nftHolders, guildId, client){
    client.guilds.fetch(guildId).then(async (guild) => {
        guild.members.fetch().then(async (members) => {
            members.forEach( (member) => {
                let memberRoles = member.roles.cache;
                if(nftHolders.has(member.user.tag)){
                    let nftCount = nftHolders.get(member.user.tag);
                    let roleId;
                    for(let i = 0; i < rolesArr.length;i++){
                        if(rolesArr[i].reqNFTs == 0 && !member.roles.cache.has(rolesArr[i].roleid)){
                            member.roles.add(rolesArr[i].roleid, "NFT-Holder").then((member) => {
                                console.log(member.user.tag + " - added generic NFT-Holder-Role; " + rolesArr[i].roleid);
                            })
                        }
						if(rolesArr[i].reqNFTs <= nftCount){
							roleId = rolesArr[i].roleid;
						}
					}
                    
                    if(!member.roles.cache.has(roleId)){
                        member.roles.add(roleId, "NFT-Holder").then( (member) => {
                            console.log(member.user.tag + " - added role: " + roleId);
                        })
                    }
                    memberRoles.forEach((role) => {
                        rolesArr.forEach( entry => {
                            if(role.id == entry.roleid && role.id != roleId && entry.reqNFTs != 0){
                                member.roles.remove(entry.roleid);
                                console.log(member.user.tag + " - removed role: " + entry.roleid);
                            }
                        })
                    })
                }
                else {
                    memberRoles.forEach((role) => {
                        rolesArr.forEach(entry => {
                            if(role.id == entry.roleid){
                                member.roles.remove(entry.roleid);
                                console.log(member.tag.tag + " - removed role: " + entry.roleid);
                            }
                        })
                    })
                }
            })
        })
    })
}