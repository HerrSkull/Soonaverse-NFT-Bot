import { BOT_TOKEN, COLLECTION_IDS, GUILD_ID, API_ADDRESS, GRANT_ROLES_TO_NFT_HOLDERS, SHOW_TREASURY_INFO, ROLES_TABLE, WALLET_LIST} from "./config.js";
import { Client, Intents} from "discord.js";
import { Soon } from "soonaverse";
import  { TreasuryManager } from "./modules/treasuryManager.js";
import { NftRoleManager } from "./modules/nftRoleManager.js";

let intents = new Intents(Intents.NON_PRIVILEGED);

intents.add('GUILDS');
intents.add('GUILD_MEMBERS');

const client = new Client({intents : intents});
const soon = new Soon();

var interval = 180 * 1000;
var timeout = 0;
var treasuryManager = new TreasuryManager(API_ADDRESS, WALLET_LIST);
var nftRoleManager = new NftRoleManager(COLLECTION_IDS, soon, client, ROLES_TABLE, GUILD_ID);

function round(input){
    return (Math.round((input + Number.EPSILON) * 100) / 100);
}

function update() {
    if(timeout > 0){
        setTimeout(update, timeout);
        console.log("TIMEOUT: " + timeout);
        timeout = 0;
    } else {
        if(GRANT_ROLES_TO_NFT_HOLDERS) { nftRoleManager.updateCurrentHolders() };
        if(SHOW_TREASURY_INFO) { updateAppearance() };
        setTimeout(update, interval);
    }
}


async function updateAppearance(){
    let t = await treasuryManager.getTreasuryInfos();
    let nickname = "Treasury " + round(t/1000) + " Gi";
    let status = "NFT floor : " + round(treasuryManager.getNFTValue()) + "Mi";
    client.guilds.fetch(GUILD_ID).then(async (guild) => {
        guild.me.setNickname(nickname);
    });
    try {
        client.user.setActivity(status, {type: "WATCHING"});
        console.log(status + " " + nickname);
    } catch (error) {
        console.debug(error);
    }
}


client.once("ready", () => {
    ROLES_TABLE.sort((a,b) => {
		return a.reqNFTs - b.reqNFTs
	})
    update();
});


client.on("rateLimit", (limit) => {
    timeout = limit.timeout;
    console.log("[TIMEOUT]: " + timeout);
});
client.on("warn", (warning) => console.log(warning));
client.on("error", console.error);

process.on('unhandledRejection', error => {
    console.log('Error:', error);
});

client.login(BOT_TOKEN);
