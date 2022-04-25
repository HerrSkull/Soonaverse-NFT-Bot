import { BOT_TOKEN, TREASURY_HOTWALLET, COLLECTION_ID, TREASURY_ADDRESS, ROLE_ID, GUILD_ID, API_ADDRESS, GRANT_ROLES_TO_NFT_HOLDERS, SHOW_TREASURY_INFO} from "./config.js";
import { Client, Intents, RoleManager } from "discord.js";
import fetch from "node-fetch";
import { Soon } from "soonaverse";

let intents = new Intents(Intents.NON_PRIVILEGED);
intents.add('GUILDS');
intents.add('GUILD_MEMBERS');

const client = new Client({intents : intents});
const soon = new Soon();

var treasure = 0;
var NFTValue = 0;
var nickname;
var status;
var interval = 180 * 1000;
var timeout = 0;
var owner_addresses = new Array();

function getTreasure(api, addr) {
    return fetch(api + addr)
        .then(res => {
            return res.json()
        })
        .then(data => {
            return data["data"]["balance"]/1000000
        })
}

function getNFTValue() {
    return treasure/1074
}

function getTreasuryInfos() {
    getTreasure(API_ADDRESS, TREASURY_ADDRESS).then(value => {
        treasure = value;
        getTreasure(API_ADDRESS, TREASURY_HOTWALLET).then(value => {
            treasure += value;
            nickname = "Treasury " + (Math.round( (((treasure)/1000) + Number.EPSILON) * 100 ) / 100) + " Gi";
            NFTValue = getNFTValue();
            status = "NFT floor : " + (Math.round((NFTValue + Number.EPSILON) * 100) / 100) + "Mi";   
            try {
                client.user.setActivity(status, {type: "WATCHING"});
                console.log(status);
                client.user.setUsername(nickname);
                console.log(nickname);
            } catch (error) {
                console.debug(error);
                update();
            }
        });
    });
}

function update() {
    if(timeout > 0){
        setTimeout(update, timeout);
        console.log("TIMEOUT: " + timeout);
        timeout = 0;
    } else {
        if(GRANT_ROLES_TO_NFT_HOLDERS) { updateCurrentHolders() };
        if(SHOW_TREASURY_INFO) { getTreasuryInfos() };
        setTimeout(update, interval);
    }
}

function updateCurrentHolders() {
    soon.getNftsByCollections([COLLECTION_ID]).then(async (obj) => {
        for(var i = 0; i < obj.length; i++)
        {
            if(owner_addresses.indexOf(obj[i]["owner"]) === -1){
                owner_addresses.push(obj[i]["owner"]);
            }
        }
        
        const chunkSize = 10;
        let chunked = new Array();
        for (let i = 0; i < owner_addresses.length; i += chunkSize) {
            chunked.push(owner_addresses.slice(i, i + chunkSize));
        }
        let holdertags = new Array();
        await Promise.all(chunked.map(async (addresses) => {
            const discordtags = await soon.getDiscordbyEthAddr(addresses);
            const filtered = discordtags.filter(n => n);
            filtered.forEach((discordTag) => holdertags.push(discordTag));
        }));
        syncRoles(holdertags);
    });
}

function syncRoles(discordtags){
        client.guilds.fetch(GUILD_ID).then(async (guild) => {
            guild.members.fetch().then(async () => {
                let membersWithRole = (guild.roles.cache.get(ROLE_ID)).members;
                membersWithRole.forEach( (member) => {
                if(discordtags.includes(member.user.tag)){
                    discordtags = discordtags.filter(e => e !== member.user.tag );
                } else {
                    member.roles.remove(ROLE_ID).then( (member) => {
                        console.log(member.user.tag + " - removed");
                    })
                }});
                
                guild.members.fetch().then( (members) => {
                    discordtags.forEach( (discordtag) => {
                        members.forEach( (member) => {
                            if(member.user.tag == discordtag){
                                member.roles.add(ROLE_ID, "NFT-Owner").then( (member) => {
                                    console.log(member.user.tag + " - added");
                                })
                            }
                        })
                    })
                    
                }).catch((err) => console.log);
            })
        })
            
}

client.on("ready", () => {
    update();
});

client.on("rateLimit", (limit) => {
    timeout = limit.timeout;
    console.log(timeout);
});
client.on("warn", (warning) => console.log(warning));
client.on("error", console.error);

client.login(BOT_TOKEN);