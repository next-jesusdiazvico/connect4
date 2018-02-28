pragma solidity ^0.4.17;

/**
 * @title Connect4.sol
 * Authors (alphabetically ordered by surname):
 * @author Jesus Diaz Vico (BEEVA)
 * @author Daniel Garrote Gonzalez (BEEVA)
 * @author Roberto Santiago Devora (BEEVA)
 * Basic logic for a Connect4 game and board representation.
 */
contract Connect4 {
	
	/** 
	 * @dev The game board.
	 * @dev A square to 0 means 'empty', a square to '1' means occupied by player 1,
	 *  a square to 2 means occupied by player 2.
	 */
	uint8[6][7] public board;

	/**
	 * @dev Auxiliar variable, points to the next row ot be filled per column.
	 */
	uint8[7] public filled;

	/**
	 * @dev Address of player1's contract.
	 */
	address public player1;

	/** 
	 * @dev Address of player2's contract.
	 */
	address public player2;

	/**
	 * @dev Defines which player moves next.
	 */
	address public turn;

	/** 
	 * @dev End of game flag.
	 */
	bool public end;

	/**
	 * @dev Winner flag (0: tie, 1: player1, 2: player2).
	 */	
	uint8 public winner;

	/**
	 * @dev Convenience variable: indicates the column of the last movement. 
     *  Set to 255 when no move has been made. 
     */
	uint8 public lastMoveCol;

	/**
	 * @dev Convenience variable: indicates the row of the last movement.
	 * Set to 255 when no move has been made. 
	 */
	uint8 public lastMoveRow;

	/** 
	 * @dev Owner of the Connect4 contract.
	 */
	address owner;

	/**
	 * @dev PlayerMoved event, triggered each time a player moves.
	 * @param c4 The address of the board this event is related to.
	 * @param player "Player1" if the player who moved was player1, "Player2" 
	 *  if it was player2.
	 * @param col The column \in [0,6].
	 * @param row The row \in [0,5].	 
	 */
	event PlayerMoved(address indexed c4, string player, uint8 col, uint8 row);

	
	/**
	 * @dev NewTurn event, triggered each time the turn is changed
	 * @param c4 The address of the board this event is related to.
	 * @param nextPlayerAddr The address of the player who has to make the next move.
	 * @param nextPlayerName "Player1" if the player who has to make the next move is 
	 *  player1, "Player2" if it is player2.	 
	 */
	event NewTurn(address indexed c4, address indexed nextPlayerAddr, string nextPlayerName);

	
	/**
	 * @dev GameEnd, event triggered when the game has ended
	 * @param c4 The address of the board this event is related to.
	 * @param winner The address of the player who has to make the next move.
	 * @param player "Player1" if the player who has to make the next move is 
	 *  player1, "Player2" if it is player2.	 
	 */		
	event GameEnd(address indexed c4, address indexed winner, string player);

	/** 
	 * @dev Constructor. 
	 * @dev Initializes the owner of the contract.
	 */
	function Connect4() public {

		owner = msg.sender;

	}

	/**
	 * @dev Sets the player1 for this Connect4 game.
	 * @dev Only the contract owner can execute this function.
	 * @param p1 The address of the new player1.
	 * @return bool True if success, false otherwise.
	 */
	function setPlayer1(address p1) public returns (bool) {

		if (msg.sender != owner) return false;
		player1 = p1;

		return true;

	}

	/**
	 * @dev Sets the player2 for this Connect4 game.
	 * @dev Only the contract owner can execute this function.
	 * @param p2 The address of the new player2.
	 * @return bool True if success, false otherwise.
	 */
	function setPlayer2(address p2) public returns (bool) {

		if (msg.sender != owner) return false;
		player2 = p2;

		return true;

	}

	/**
	 * @dev Returns the address of player1
	 * @return address The address of player1
	 */
	function getPlayer1() public view returns (address) {
		return player1;
	}

	/**
	 * @dev Returns the address of player2
	 * @return address The address of player2
	 */
	function getPlayer2() public view returns (address) {
		return player2;
	}

	/**
	 * @dev Returns the addresses of the players in the game
	 * @return address The addresses of both players, as an array
	 */	
	function getPlayers() public view returns (address[2]) {
		return [player1, player2];
	}

	/**
	 * @dev Once both players have been set, initializes the game.
	 * @dev Only the contract owner can execute this function.
	 * @return bool True if the operation succeeded, false otherwise.
	 */
	function initGame() public returns (bool) {

		if (msg.sender != owner) return false;

		/* Set convenience variables */
		end = false;
		winner = 0;
		lastMoveCol = 255;
		lastMoveRow = 255;

		/* Reset board */
		for(uint8 col=0; col<=6; col++) {
			for(uint8 row=0; row<=5; row++) {
				board[col][row] = 0;
			}
			filled[col] = 0;
		}

		/* Do not initialize the turn until both players have joined */
		if (player1 != 0 && player2 != 0) {

			/* Initializes the turn 'randomly', based on the hash of the previous block */
			uint8 r = uint8(uint256(block.blockhash(block.number-1))*now)%2;
			if (r == 0)  { turn = player1; NewTurn(this, player1, "Player1"); }
			else { turn = player2; NewTurn(this, player2, "Player2"); }

			return true;
		} 

		return false;

	}

	/**
	 * @dev Convenience function for checking whether a given address is
	 *  associated to player1 or to player2.
	 * @param player An address (presumably, either from player1 or player2).
	 * @return uint8 1 if player equals the address of player1, 2 if player 
	 *  equals the address of player2; 0 otherwise.
	 */
	function getPlayerNumber(address player) public view returns (uint8) {
		if (player == player1) return 1;
		if (player == player2) return 2;
		return 0;
	}

	/**
	 * @dev Given the coordinates of the last move, checks if some player has 
	 *  achieved 4 in a row, horizontally.
	 * @param col The column of the last move.
	 * @param row The row of the last move.
	 * @return uint8 1 if player1 has made 4 in a row, 2 if player2 has made 
	 *  4 in a row; 0 otherwise.
	 */
	function checkHorizontalWin(uint8 col, uint8 row) internal view returns(uint8) {
		
		/* Horizontal win: same row, across columns */
		for (uint8 i=0; i<=3; i++) {

			/* Ensure limits */
			if (i > col) continue;
			if (col-i+3 > 6) continue;

			/* Player1 wins */
			if (board[col-i][row] == 1 && board[col-i+1][row] == 1 && 
				board[col-i+2][row] == 1 && board[col-i+3][row] == 1) {
				return 1;
			}

			/* Player 2 wins */
			if (board[col-i][row] == 2 && board[col-i+1][row] == 2 && 
				board[col-i+2][row] == 2 && board[col-i+3][row] == 2) {
				return 2;
			}

		}

		return 0;

	}

	/**
	 * @dev Given the coordinates of the last move, checks if some player has 
	 *  achieved 4 in a row, vertically.
	 * @param col The column of the last move.
	 * @param row The row of the last move.
	 * @return uint8 1 if player1 has made 4 in a row, 2 if player2 has made 
	 *  4 in a row; 0 otherwise.
	 */
	function checkVerticalWin(uint8 col, uint8 row) internal view returns(uint8) {
		
		/* Vertical win: same column, across rows */
		for (uint8 i=0; i<=3; i++) {		

			/* Ensure limits */
			if (i > row) continue;
			if (row-i+3 > 5) continue;

			/* Player1 wins */
			if (board[col][row-i] == 1 && board[col][row-i+1] == 1 && 
				board[col][row-i+2] == 1 && board[col][row-i+3] == 1) {
				return 1;
			}

			/* Player 2 wins */
			if (board[col][row-i] == 2 && board[col][row-i+1] == 2 && 
				board[col][row-i+2] == 2 && board[col][row-i+3] == 2) {
				return 2;
			}			

		}

		return 0;

	}	


	/**
	 * @dev Given the coordinates of the last move, checks if some player has 
	 *  achieved 4 in a row, diagonally.
	 * @param col The column of the last move.
	 * @param row The row of the last move.
	 * @return uint8 1 if player1 has made 4 in a row, 2 if player2 has made 
	 *  4 in a row; 0 otherwise.
	 */
	function checkDiagonalWin(uint8 col, uint8 row) internal view returns(uint8) {
		
		uint8 i;
		uint8 maxRowInc = 5 - row;

		if (maxRowInc > 3) maxRowInc = 3;
		
		/* NW-SE win */
		for (i=0; i<=maxRowInc; i++) {

			/* Ensure limits */
			if (col < i) continue;
			if (row + i < 3) continue;
			if (col - i > 3) continue;
			if (row + i > 5) continue;
			
			if (board[col-i][row+i] == 1 && board[col-i+1][row+i-1] == 1 &&
				board[col-i+2][row+i-2] == 1 && board[col-i+3][row+i-3] == 1) {
				return 1;
			}

			if (board[col-i][row+i] == 2 && board[col-i+1][row+i-1] == 2 &&
				board[col-i+2][row+i-2] == 2 && board[col-i+3][row+i-3] == 2) {
				return 2;
			}

		}

		/* NE-SW win */
		for (i=0; i<=maxRowInc; i++) {

			/* Ensure limits */
			if (col + i > 6) continue;
			if (row + i > 6) continue;
			if (col + i < 3) continue;
			if (row + i < 3) continue;

			if (board[col+i][row+i] == 1 && board[col+i-1][row+i-1] == 1 &&
				board[col+i-2][row+i-2] == 1 && board[col+i-3][row+i-3] == 1) {
				return 1;
			}

			if (board[col+i][row+i] == 2 && board[col+i-1][row+i-1] == 2 &&
				board[col+i-2][row+i-2] == 2 && board[col+i-3][row+i-3] == 2) {
				return 2;
			}

		}		

		return 0;

	}	

	/**
	 * @dev Given the coordinates of the last move, checks if some player has 
	 *  achieved 4 in a row.
	 * @param col The column of the last move.
	 * @param row The row of the last move.
	 * @return uint8 1 if player1 has made 4 in a row, 2 if player2 has made 
	 *  4 in a row; 0 otherwise.
	 */
	function checkWin(uint8 col, uint8 row) internal view returns(uint8) {

		uint8 _winner;

		/* Invalid move */
		if (col > 6 || row > 5) {
			return 0;
		}

		/* Check horizontal win */
		_winner = checkHorizontalWin(col, row);
		if (winner != 0) return _winner;

		/* Check vertical win */
		_winner = checkVerticalWin(col, row);
		if (_winner != 0) return _winner;

		/* Check diagonal win */
		_winner = checkDiagonalWin(col, row);
		if (_winner != 0) return _winner;

		return 0;

	}

	/**
	 * @dev Inserts a chip in the specified column.
	 * @param col The column to insert the chip in.
	 * @return bool true if the move was valid, false otherwise (e.g., if the player
	 *  who moved was not the holder of the turn, if col is not in [0,6] or if
	 *  the specified column is filled.
	 */
	function move(uint8 col) public returns(bool) {

		/* Check if it is the caller's turn */
	    if (msg.sender != turn) return false;

	    /* Check if game has not ended */
	    if (end == true) return false;	    

	    /* Check column is in range. Since col is uint8, if col < 0 then it should 
	       be > 6 (unless it accidentally falls into 0,6, which we could possibly
	       control somehow, but this is just a game...). */
	    if (col > 6)  {
	    	/* Invalid move, request new one */
	    	if (turn == player1) { NewTurn(this, player1, "Player1"); }
	    	else { NewTurn(this, player2, "Player2"); }
	    	return false;
	    }

		/* Checks if the column still has room */
		uint8 row = filled[col];
		if (row >= 6)  {
	    	/* Invalid move, request new one */
	    	if (turn == player1) { NewTurn(this, player1, "Player1"); }
	    	else { NewTurn(this, player2, "Player2"); }
			return false;
		}
		
		/* Not filled, occupy the highest possible square */
		if (turn == player1) {
		    board[col][row] = 1;
		    PlayerMoved(this, "Player1", col, row);
			turn = player2;
		} else {
		    board[col][row] = 2;
 		    PlayerMoved(this, "Player2", col, row);
		    turn = player1;
		}

		/* Update last movement */
		lastMoveCol = col;
		lastMoveRow = row;

		/* Update filled auxiliary array */
        filled[col] = row+1;        

		/* Check if this move was a win move */
		winner = checkWin(col, row);
		if (winner != 0) {
			end = true;
			if (winner == 1) GameEnd(this, player1, "Player1");
			if (winner == 2) GameEnd(this, player2, "Player2");
			return true;
		}

		/* Check for ties */
		bool f=true;
		for (uint8 c=0; c<7; c++) {
			if (filled[c]<6) {
				f=false;
				break;
			}
		}

		if(f) {
			end = true;
			GameEnd(this, 0x0, "Tie");
			winner = 0;
			return true;
		}

		/* Trigger a new turn event */
		if (turn == player1) {
			NewTurn(this, player1, "Player1");
		} else { 
			NewTurn(this, player2, "Player2");
		}

		return true;

	}

	/**
	 * @dev Terminates the contract. Only the owner can do this. 
	 */
	function kill() public {
		if (msg.sender == owner) selfdestruct(owner);
	}

}
