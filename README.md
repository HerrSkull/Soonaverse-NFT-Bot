# Soonaverse-NFT-Bot v1.2

Features
* Track funds of a list of Wallets
* Calculate Treasury/NoNFTS
* Grant Holders of a NFT Collection roles according to the number of nfts they hold
* maintain NFT-Holders -> Role Members

In order to get verified you have to provide your Discordtag and Shimmeraddress in your Soonaverseprofile holding the NFT. Then you can register your account with "/registersoonaverseprofile" to allow the bot to fetch the nfts of your linked Shimmer address.
The Roles of NFT-Holders and the treasury gets updated every few minutes.

Discord Bot permissions requirements:
* Server member intent
* Manage roles
* Applications.commands scope
* Bot role needs to be ranked above the role it assigns
* If the server admin account is 2FA enabled, the botowner account needs to be too

Changelog v1.2:
* Shimmer native nft support added
* Added Slashcommand "/registersoonaverseprofile" to link Shimmer addresses to discordtags
* Added MongoDB as database backend
* Breaking changes in config!
* Example Api paths updated in config

Changelog v1.1:
* Breaking changes in config
* Support for rolelist added
