var Web3 = require('web3');
var web3 = new Web3();

web3.setProvider(new web3.providers.HttpProvider('http://localhost:8545'));

var c4_ABI = [{"constant":false,"inputs":[],"name":"initGame","outputs":[{"name":"","type":"bool"}],"type":"function"},{"constant":false,"inputs":[],"name":"kill","outputs":[],"type":"function"},{"constant":true,"inputs":[],"name":"player2","outputs":[{"name":"","type":"address"}],"type":"function"},{"constant":true,"inputs":[{"name":"","type":"uint256"}],"name":"filled","outputs":[{"name":"","type":"uint8"}],"type":"function"},{"constant":true,"inputs":[],"name":"lastMoveCol","outputs":[{"name":"","type":"uint8"}],"type":"function"},{"constant":false,"inputs":[{"name":"col","type":"uint8"}],"name":"move","outputs":[{"name":"","type":"bool"}],"type":"function"},{"constant":false,"inputs":[{"name":"p2","type":"address"}],"name":"setPlayer2","outputs":[{"name":"","type":"bool"}],"type":"function"},{"constant":true,"inputs":[{"name":"","type":"uint256"},{"name":"","type":"uint256"}],"name":"board","outputs":[{"name":"","type":"uint8"}],"type":"function"},{"constant":true,"inputs":[],"name":"turn","outputs":[{"name":"","type":"address"}],"type":"function"},{"constant":true,"inputs":[],"name":"lastMoveRow","outputs":[{"name":"","type":"uint8"}],"type":"function"},{"constant":false,"inputs":[{"name":"player","type":"address"}],"name":"getPlayerNumber","outputs":[{"name":"","type":"uint8"}],"type":"function"},{"constant":true,"inputs":[],"name":"player1","outputs":[{"name":"","type":"address"}],"type":"function"},{"constant":true,"inputs":[],"name":"winner","outputs":[{"name":"","type":"uint8"}],"type":"function"},{"constant":true,"inputs":[],"name":"end","outputs":[{"name":"","type":"bool"}],"type":"function"},{"constant":false,"inputs":[{"name":"p1","type":"address"}],"name":"setPlayer1","outputs":[{"name":"","type":"bool"}],"type":"function"},{"inputs":[],"type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"name":"c4","type":"address"},{"indexed":false,"name":"player","type":"string"},{"indexed":false,"name":"col","type":"uint8"},{"indexed":false,"name":"row","type":"uint8"}],"name":"PlayerMoved","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"c4","type":"address"},{"indexed":true,"name":"nextPlayer","type":"address"},{"indexed":false,"name":"player","type":"string"}],"name":"newTurn","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"c4","type":"address"},{"indexed":true,"name":"winner","type":"address"},{"indexed":false,"name":"player","type":"string"}],"name":"GameEnd","type":"event"}];
var p_ABI = [{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"type":"function"},{"constant":true,"inputs":[],"name":"c4","outputs":[{"name":"","type":"address"}],"type":"function"},{"constant":false,"inputs":[],"name":"move","outputs":[{"name":"","type":"bool"}],"type":"function"},{"constant":false,"inputs":[],"name":"kill","outputs":[],"type":"function"},{"constant":false,"inputs":[{"name":"col","type":"uint8"}],"name":"manualMove","outputs":[{"name":"","type":"bool"}],"type":"function"},{"constant":false,"inputs":[{"name":"_c4","type":"address"}],"name":"setConnect4","outputs":[{"name":"","type":"bool"}],"type":"function"},{"inputs":[{"name":"_name","type":"string"},{"name":"_c4","type":"address"}],"type":"constructor"}];

/* Note: in this demo app, the c4 of both player1 and player2 must have been set through the constructor and match the address in c4_addr */
var c4_addr = "0x322287eafe437f49dbafc4b7afab5a2ef98a694c"; // e.g.: "0x09b59ca92fa68e8cdc65beddb6c7c09623f45bc8";
var p1_addr = "0x4fed13610f2fbad7327eab5bb54c8b87962aae88"; // e.g.: "0xb7e2c5c509b0a69ff8b17d90e38576e23daf6945";
var p2_addr = "0x90e09ddfefbf0eca02f802c4c337ace8b054de32"; // e.g.: "0xfd13abe1eb815a65a9b3b132f24b0d9132690f49";

var p1Transactions = [];
var p2Transactions = [];

var c4 = web3.eth.contract(c4_ABI).at(c4_addr);
var p1 = web3.eth.contract(p_ABI).at(p1_addr);
var p2 = web3.eth.contract(p_ABI).at(p2_addr);

var p1_name = "Player1";
var p2_name = "Player2";

/* Set player1 */							    
c4.setPlayer1(p1.address, {from:web3.eth.accounts[0], gas:99999999}, function(error,result) {
	
	if(!error) {
		console.log("["+p1_name+" set]");

		/* Set player2 */
		c4.setPlayer2(p2.address, {from:web3.eth.accounts[0], gas:99999999}, function(error,result) {

			if(!error) {
				console.log("["+p2_name+" set]");

				/* Init game */
				c4.initGame({from:web3.eth.accounts[0], gas:99999999}, function(error,result) {

					if (!error) {
						console.log("[Game begin]");

						/* Create filters */
						var filterPlayerMoved = c4.PlayerMoved();
						var filterNewTurn = c4.newTurn();
						var filterGameEnd = c4.GameEnd();   							    

						filterPlayerMoved.watch(function (error, result) {

							if(!error) {
								if(result.args.c4 == c4.address) {
									if (result.args.player == "Player1") {
										console.log("[Player moved] "+p1_name+" moved ("+result.args.col+","+result.args.row+").");
									} else {
										console.log("[Player moved] "+p2_name+" moved ("+result.args.col+","+result.args.row+").");
									}
								}
							} else {
								console.log("[Player moved] "+error);
							}
						});

						filterNewTurn.watch(function (error, result) {

							if(!error) {
								if(result.args.c4 == c4.address) {
									if(result.args.player == "Player1") {
										console.log("[New turn] It is now "+p1_name+"'s turn.");
										var t = p1.move({from:web3.eth.accounts[0], gas:999999999});
										console.log("(DEBUG) "+p1_name+" sent move transacion: "+t);
										p1Transactions.push(t);
									} else {
										console.log("[New turn] It is now "+p2_name+"'s turn.");
										var t = p2.move({from:web3.eth.accounts[0], gas:999999999});
										console.log("(DEBUG) "+p2_name+" sent move transacion: "+t);
										p2Transactions.push(t);
									}
								}
							} else {
								console.log("[New turn] "+error);
							}
						});

						filterGameEnd.watch(function (error, result) {

							if(!error) {
								if(result.args.c4 == c4.address) {
									if(result.args.player == "Player1") {
										console.log("[Game end] "+p1_name+" won.");
									} else if (result.args.player == "Player2") {
										console.log("[Game end] "+p2_name+" won.");
									} else {
										console.log("[Game end] Tie.");
									}
								}
							} else {
								console.log("[Game end] "+error);
							}

							totalGasP1=0;
							for (i=0; i<p1Transactions.length; i++) {
								receipt = web3.eth.getTransactionReceipt(p1Transactions[i]);
								totalGasP1+=receipt.gasUsed;
							}

							totalGasP2=0;
							for (i=0; i<p2Transactions.length; i++) {
								receipt = web3.eth.getTransactionReceipt(p2Transactions[i]);
								totalGasP2+=receipt.gasUsed;
							}

							console.log("Total gas used by "+p1_name+": "+totalGasP1);
							console.log("Total gas used by "+p2_name+": "+totalGasP2);
							process.exit();
						});
					}
				})
			}
		})
	}
})
