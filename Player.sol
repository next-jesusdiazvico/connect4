/**
 * @title Player.sol
 * Authors (alphabetically ordered by surname):
 * @author Jesus Diaz Vico (BEEVA).
 * @author Daniel Garrote Gonzalez (BEEVA).
 * @author Roberto Santiago Devora (BEEVA).
 */

/* import "Connect4.sol"; */

/**
 * @dev Connect4 game interface. This is left here for making tests with the
 *  online compiler easy. For testing in other environments, just remove it.
 */
contract Connect4 {
	
	uint8[6][7] public board;
	uint8[7] public filled;
	address public player1;
	address public player2;
	address public turn;
	bool public end;
	uint8 public winner;
	uint8 public lastMoveCol;
	uint8 public lastMoveRow;	

	event PlayerMoved(address indexed c4, string player, uint8 col, uint8 row);
	event newTurn(address indexed c4, address indexed nextPlayer, string player);
	event GameEnd(address indexed c4, address indexed winner, string player);

	function Connect4() {}
	function setPlayer1(address p1) returns (bool) {}
	function setPlayer2(address p2) returns (bool) {}
	function initGame() returns (bool) {}
	function getPlayerNumber(address player) returns (uint8) {}
	function move(uint8 col) returns(bool) {}
	function kill() {}

}

contract Player {

	/** 
	 * @dev Owner of the contract.
	 */
	address owner;

	/**
	 * @dev Name of the player.
	 */
	string public name;

	/** 
	 * @dev Connect4 board contract.
	 */
	Connect4 public c4; 

	/**
	 * @dev Contract constructor
	 * @dev Initializes the owner and sets the name of the player.
	 * @param _name The name of the player.
	 * @param _c4 If other than 0, the Connect4 board for this player will be 
	 *  set to the specified address.
	 */
	function Player(string _name, address _c4) {
		owner = msg.sender;
	    name = _name;
	    if(_c4 != 0) {
	    	c4 = Connect4(_c4);
	    }
	}

	/**
	 * @dev Sets the Connect4 game. That is, associates this player to that game.
	 * @dev Only the owner of the Player contract can execute this function.
	 * @param _c4 The address of the Connect4 game.
	 * @return bool True if the operation succeeded, false otherwise.
	 */
	function setConnect4(address _c4) returns (bool) {
		if (msg.sender != owner) return false;
		c4 = Connect4(_c4);
		return true;
	}

	/** 
	 * @dev Automated move function. Decides what move to make next and sends
	 * it to the board. 
	 * @dev Only the owner of the Player contract can execute this function.
	 * @return bool True if the movement was applied correctly, false otherwise.
	 */
	function move() returns(bool) {		
		if (msg.sender != owner) return false;	
	    uint8 col = uint8((uint256(block.blockhash(block.number-1))*now)%7);
		return c4.move(col);
	}

	/**
	 * @dev Manual move function. Receives the next move and sends it to the board.
	 * @dev Only the owner of the Player contract can execute this function.
	 * @return bool True if the movement was applied correctly, false otherwise.
	 */
	function manualMove(uint8 col) returns(bool) {
		if (msg.sender != owner) return false;	
		return c4.move(col);
	}

	/**
	 * @dev Terminates the contract.
	 */
	function kill() {
		if (msg.sender == owner) suicide(owner);
	}

}