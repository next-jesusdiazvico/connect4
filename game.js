#!/usr/bin/env node

var cmdArgs = require('command-line-args');
var CmdUsage = require('command-line-usage');
var Web3 = require('web3');
const fs = require('fs');
const Q = require('q');
const readline = require('readline');

var options;
var accounts;
var games = {};
var players = {};
//var web3 = new Web3();

function processParams () {
	
	var cmdOptions = [
			{ 
				name: 'help', 
				alias: 'h', 
				type: Boolean, 
				description: "Tool usage information." 
			},
			{ 
				name: 'connect4', 
				alias: 'c', 
				type: String,
				defaultValue: './build/contracts/Connect4.json', 
				description: "Connect4 contract data (defaults to 'build/contracts/Connect4.json')." 
			},			
			{ 
				name: 'gas', 
				alias: 'g', 
				type: Number,
				defaultValue: 4712388,
				description: "Gas (defaults to)." 
			},
			{ 
				name: 'gasPrice', 
				alias: 'G', 
				type: Number,
				defaultValue: 100000000000, 
				description: "gasPrice (defaults to 2)." 
			},
			{ 
				name: 'player', 
				alias: 'P', 
				type: String,
				defaultValue: './build/contracts/Player.json', 
				description: "Player contract data (defaults to 'build/contracts/Player.json')." 
			},	
			{ 
				name: 'provider', 
				alias: 'p', 
				type: String, 
				defaultValue: "ws://localhost:8545", 
				description: "Web3 provider URL (defaults to ws://localhost:8545)."
			},			
		];

	var options = cmdArgs(cmdOptions);

	/* Print usage if requested */
	if (options.help) {
		console.log(CmdUsage([ 
		{
			header: 'Connect4.',
			content: 'Play Connect4 in Ethereum (through the command line!)'
		},
		{
			header: 'Options',
			optionList: cmdOptions
		} 
		]));
		process.exit(0);
	}

	return options;

}

function createGame() {

	var deferred = Q.defer();

	/* Parse the Connect4 contract */
	var connect4 = JSON.parse(fs.readFileSync(options.connect4, 'utf8'));

	/* Get a contract instance */
	var connect4Instance = new web3.eth.Contract(connect4.abi);
	connect4Instance.deploy({ data: connect4.bytecode })
	.send({from: accounts[0], gas: options.gas, gasPrice: options.gasPrice})
	.then(function(c4) {		
		games[c4.options.address] = c4;
		deferred.resolve(c4.options.address);
	});

	return deferred.promise;

}

function createPlayer() {

	var deferred = Q.defer();

	/* Parse the Connect4 contract */
	var player = JSON.parse(fs.readFileSync(options.player, 'utf8'));
	var info = {};

	const rlp = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
		terminal: false,
	});	

	rlp.question('Player name> ', function(args) {
		info.name = args;
		console.log("Name is: "+info.name);
		rlp.question('Game address> ', function(args) {
			info.game = args;
			console.log("Game is: "+info.game);
			rlp.close();

			/* Get a contract instance */
			var playerInstance = new web3.eth.Contract(player.abi);
			playerInstance.deploy({ 
				data: player.bytecode, 
				arguments: [info.name, info.game] 
			})
			.send({from: accounts[0], gas: options.gas, gasPrice: options.gasPrice})
			.on('error', (error) => {
				console.log(error);
			})
			.then(function(p) {
				players[p.options.address] = p;
				deferred.resolve(p.options.address);
			});			
		});
	});

	return deferred.promise;

}

function listGames() {
	console.log("==== List of games ====");
	for (var addr in games) {
		console.log(addr);
	}
}

function selectGame() {

	var deferred = Q.defer();
	
	const rlp = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
		terminal: false,
	});

	rlp.question('Game address> ', function(addr) {
		rlp.close();
		console.log("Game address is: "+addr);
		games[addr]["gasUsed"] = {};
		deferred.resolve(games[addr]);
	});

	return deferred.promise;

}

function getGasUsed(event) {

	var deferred = Q.defer();

	web3.eth.getTransactionReceipt(event.transactionHash, (error, receipt) => {
		if (error) {
			console.log(error);
		} else {
			// console.log("Receipt! gasUsed: "+receipt.gasUsed);
			// console.log("___________________");
			// console.log(receipt);
			// console.log("___________________");
			event.gasUsed = receipt.gasUsed;
			deferred.resolve(event);
		}
	});

	return deferred.promise;

}

function subscribeGameEvents(game) {

	/* Subscribe to events */
	var eventPlayerMoved = game.events.PlayerMoved()
	.on('data', function(event) {
		c4 = event.returnValues.c4;
		if(c4 == game.options.address) {
			player = event.returnValues.player;
			col = event.returnValues.col;
			row = event.returnValues.row;
			console.log("[PlayerMoved] "+player+" played ("+col+","+row+")");
		}
	}).on('changed', function(event) {
		console.log("[PlayerMoved] Changed Wololooooooo");
	}).on('error', function(event) {
		console.log("[PlayerMoved] Error Wololooooooo");
	});

	var eventNewTurn = game.events.NewTurn()
	.on('data', function(event) {
		c4 = event.returnValues.c4;
		nextPlayerName = event.returnValues.nextPlayerName;
		if(c4 == game.options.address) {
			console.log("[New turn] It is now "+nextPlayerName+"'s turn.");
			getGasUsed(event)
			.then( (event) => {				
				nextPlayerAddr = event.returnValues.nextPlayerAddr;
				game["gasUsed"][nextPlayerAddr] += event.gasUsed;				
				players[nextPlayerAddr].methods.move()
				.send({
					from: accounts[0],
					gas: options.gas,
					gasPrice: options.gasPrice
				});
			});
		}		
	}).on('changed', function(event) {
		console.log("[NewTurn] Changed Wololooooooo");		
	}).on('error', function(event) {
		console.log("[NewTurn] Error Wololooooooo");
	});
	
	var eventGameEnd = game.events.GameEnd()
	.on('data', function(event) {
		winner = event.returnValues.player;
		console.log("[GameEnd] Player "+winner+" won!");
		for (player in game["gasUsed"]) {
			console.log("Gas used by "+player+": "+game["gasUsed"][player]);
		}		
	}).on('changed', function(event) {
		console.log("[GameEnd] Changed Wololooooooo");
	}).on('error', function(event) {
		console.log("[GameEnd] Error Wololooooooo");
	});

	return game;

}

function setPlayer1(game) {

	var deferred = Q.defer();
	
	const rlp = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
		terminal: false,
	});

	rlp.question('Player1 address> ', function(addr) {
		rlp.close();

		console.log("Player1 address is: "+addr);
		game.p1 = addr;
		game["gasUsed"][addr] = 0;

		game.methods.setPlayer1(addr).send({
			from: accounts[0],
			gas: options.gas,
			gasPrice: options.gasPrice
		}).on('error', (error) => {
			console.log(error);
			deferred.reject(error);
		}).on('confirmation', (confirmationNumber, receipt) => {
			deferred.resolve(game);
		});

	});

	return deferred.promise;

}

function setPlayer2(game) {

	var deferred = Q.defer();
	
	const rlp = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
		terminal: false,
	});

	rlp.question('Player2 address> ', function(addr) {
		rlp.close();

		console.log("Player2 address is: "+addr);
		game.p2 = addr;
		game["gasUsed"][addr] = 0;

		game.methods.setPlayer2(addr).send({
			from: accounts[0],
			gas: options.gas,
			gasPrice: options.gasPrice
		}).on('error', (error) => {
			console.log(error);
			deferred.reject(error);
		}).on('confirmation', (confirmationNumber, receipt) => {
			console.log("Player2 set; confirmation number: "+confirmationNumber);
			deferred.resolve(game);
		});

	});

	return deferred.promise;

}

function initGame(game) {
	
	var deferred = Q.defer();

	game.methods.initGame().send({
		from: accounts[0],
		gas: options.gas,
		gasPrice: options.gasPrice
	}).on('error', (error) => {
		console.log(error);
		deferred.reject(error);
	}).on('confirmation', (confirmationNumber, receipt) => {
		console.log("Confirmation Number: "+confirmationNumber);
		deferred.resolve("WOLOLOOOOO");
	});

	return deferred.promise;
}

function playGame() {

	var deferred = Q.defer();

	selectGame()
	.then(subscribeGameEvents)
	.then(setPlayer1)
	.then(setPlayer2)
	.then(initGame)
	.catch((error) => { 
		console.log("WOLOLOOOO catch"); 
		console.log(error); 
	});

	return deferred.promise;

}

function parseCommand() {

	/* Prepare interface */
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
		terminal: false,
	});		

	rl.question('C4> ', (answer) => {
		rl.close();		
		switch(answer.trim()) {
			case 'createGame': 
				console.log("createGame");
				Q.fcall(createGame)
				.then((address) => {
					console.log("Deployed game at address: "+address);
				})
				.then(parseCommand)
				.catch((error) => {
					console.log(error);
				});
				break;
			case 'createPlayer':
				console.log("createPlayer");
				Q.fcall(createPlayer)
				.then((address) => {
					console.log("Deployed player at address: "+address);
				})
				.then(parseCommand)
				.catch((error) => {
					console.log(error);
				});				
				break;
			case 'listGames':
				console.log("listGames");
				Q.fcall(listGames)
				.then(parseCommand)
				.catch((error) => {
					console.log(error);
				});
				break;
			case 'playGame':
				console.log("playGame")
				Q.fcall(playGame)
				.then(parseCommand)
				.catch((error) => {
					console.log("WOLOLOOO playGame");
					console.log(error);
				});
				break;				
			case 'exit':
				console.log("exit");
				break;
			default:
				console.log("Options: createGame, createPlayer, listGames, playGame, exit");
				parseCommand();
				break;
		}
	});

}

options = processParams();

/* Connect to the Web3 provider */
var web3 = new Web3(new Web3.providers.WebsocketProvider(options.provider));

/* Parse the Player contract */
web3.eth.getAccounts().then(_accounts => {
	accounts = _accounts;
	parseCommand();	
});