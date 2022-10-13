import { BOT_TOKEN, SOONAVERSE_COLLECTION_IDS, SMR_COLLECTION_IDS, GUILD_ID, API_ADDRESS, GRANT_ROLES_TO_NFT_HOLDERS, SHOW_TREASURY_INFO, ROLES_TABLE, WALLET_LIST, SMR_API, USE_SMR_NATIVE_COLLECTIONS, USE_SOONAVERSE_COLLECTIONS, MONGODB_URI, MONGODB_COLLECTION, MONGODB_DATABASE} from "./config.js";
import { Client, Intents } from "discord.js";
import { Soon } from "soonaverse";
import  { TreasuryManager } from "./modules/treasuryManager.js";
import { NftRoleManager } from "./modules/nftRoleManager.js";
import { SmrNftHolderManager } from "./modules/smrNftHolderManager.js";
import { DatabaseManager } from "./modules/DatabaseManager.js";

let intents = new Intents(Intents.NON_PRIVILEGED);

intents.add('GUILDS');
intents.add('GUILD_MEMBERS');

const client = new Client({intents : intents});
const soon = new Soon();

var interval = 180 * 1000;
var timeout = 0;
var treasuryManager = new TreasuryManager(API_ADDRESS, WALLET_LIST);
var databaseManager = new DatabaseManager(MONGODB_URI, MONGODB_DATABASE, MONGODB_COLLECTION);
var nftRoleManager = new NftRoleManager(client, ROLES_TABLE, GUILD_ID, databaseManager, USE_SOONAVERSE_COLLECTIONS, USE_SMR_NATIVE_COLLECTIONS);
var smrNftHolderManager = new SmrNftHolderManager(soon, SOONAVERSE_COLLECTION_IDS, SMR_COLLECTION_IDS, SMR_API, databaseManager, USE_SOONAVERSE_COLLECTIONS, USE_SMR_NATIVE_COLLECTIONS);

function round(input){
    return (Math.round((input + Number.EPSILON) * 100) / 100);
}

async function update() {
    if(timeout > 0){
        setTimeout(update, timeout);
        console.log("TIMEOUT: " + timeout);
        timeout = 0;
    } else {
        if(GRANT_ROLES_TO_NFT_HOLDERS) {
            await smrNftHolderManager.updateNftCount();
            nftRoleManager.updateRoles();
        };
        if(SHOW_TREASURY_INFO) { updateAppearance() };
        setTimeout(update, interval);
    }
}

async function registerSlashCommands(){
    client.api.applications(client.user.id).guilds(GUILD_ID).commands.post({data: {
        name: 'registersoonaverseprofile',
        description: 'Registers the submitted soonaverse profile to enable usage of the rolebot.',
        type: '1',
        default_member_permissions: 1,
        options : [
            {
                name : 'ethaddress',
                description : 'The Metamask address used in your soonaverse profile.',
                type : 3,
                require : true
            }
        ]
    }});
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
    registerSlashCommands();
    ROLES_TABLE.sort((a,b) => {
		return a.reqNFTs - b.reqNFTs
	})
    update();
});

client.on('interactionCreate', async interaction => {
    if(!interaction.isCommand()) return;
    if(interaction.commandName === 'registersoonaverseprofile'){
        let ethaddress = interaction.options.getString("ethaddress", true);
        await smrNftHolderManager.registerMetamaskAddress(interaction, ethaddress);
    }
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
