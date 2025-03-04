// Game class to manage the Truco game logic
class Game {
    constructor(roomId, players) {
        this.roomId = roomId;
        this.players = players;  // Array of player objects
        this.deck = new Deck();
        this.currentRound = 1;
        this.currentTurn = 0;    // Index of the current player
        this.dealer = 0;         // Index of the dealer player
        this.vira = null;        // The card that determines manilhas
        this.playedCards = [];   // Cards played in the current hand
        this.roundWinner = null; // Winner of the current round
        this.scores = [0, 0];    // Scores for team 1 and team 2
        this.trucoValue = 1;     // Current value of the round (1, 3, 6, 9, 12)
        this.trucoState = 0;     // 0: no truco, 1: truco called, 2: accepted, 3: raised
        this.handWinners = [];   // Winners of each hand in the current round
        this.gameState = 'waiting'; // waiting, playing, finished
        this.teamCards = [[], []]; // Cards won by each team
        this.database = firebase.database().ref(`games/${roomId}`);
    }

    // Initialize the game
    initialize() {
        this.deck.reset();
        this.deck.shuffle();
        this.vira = this.deck.drawVira();
        this.dealCards();
        this.currentTurn = (this.dealer + 1) % 4; // First player after dealer starts
        this.gameState = 'playing';
        this.updateGameState();
    }

    // Deal cards to all players
    dealCards() {
        const hands = this.deck.dealCards(4);
        for (let i = 0; i < 4; i++) {
            this.players[i].hand = hands[i];
        }
    }

    // Play a card from a player's hand
    playCard(playerId, cardIndex) {
        const playerIndex = this.players.findIndex(p => p.id === playerId);
        
        // Check if it's this player's turn
        if (playerIndex !== this.currentTurn) return false;
        
        // Get the card from player's hand
        const card = this.players[playerIndex].hand[cardIndex];
        if (!card) return false;
        
        // Remove the card from player's hand
        this.players[playerIndex].hand.splice(cardIndex, 1);
        
        // Add the card to played cards with player info
        this.playedCards.push({
            card: card,
            playerId: playerId,
            playerIndex: playerIndex
        });
        
        // Move to next player's turn
        this.currentTurn = (this.currentTurn + 1) % 4;
        
        // Check if hand is complete (all players played a card)
        if (this.playedCards.length === 4) {
            this.evaluateHand();
        }
        
        this.updateGameState();
        return true;
    }

    // Evaluate the winner of the current hand
    evaluateHand() {
        let highestCard = this.playedCards[0];
        
        // Find the highest card played
        for (let i = 1; i < this.playedCards.length; i++) {
            if (this.playedCards[i].card.compareTo(highestCard.card) > 0) {
                highestCard = this.playedCards[i];
            }
        }
        
        // Record the winner of this hand
        const winnerIndex = highestCard.playerIndex;
        const winnerTeam = winnerIndex % 2; // 0 for team 1, 1 for team 2
        this.handWinners.push(winnerTeam);
        
        // Add played cards to the winner team's pile
        this.teamCards[winnerTeam] = this.teamCards[winnerTeam].concat(
            this.playedCards.map(pc => pc.card)
        );
        
        // Clear played cards for next hand
        this.playedCards = [];
        
        // Set the winner as the first player for the next hand
        this.currentTurn = winnerIndex;
        
        // Check if round is complete
        if (this.isRoundComplete()) {
            this.evaluateRound();
        }
    }

    // Check if the current round is complete
    isRoundComplete() {
        // A round is complete if one team has won 2 hands
        const team1Wins = this.handWinners.filter(winner => winner === 0).length;
        const team2Wins = this.handWinners.filter(winner => winner === 1).length;
        
        return team1Wins >= 2 || team2Wins >= 2 || this.handWinners.length >= 3;
    }

    // Evaluate the winner of the current round
    evaluateRound() {
        const team1Wins = this.handWinners.filter(winner => winner === 0).length;
        const team2Wins = this.handWinners.filter(winner => winner === 1).length;
        
        // Determine the winner team
        let winnerTeam;
        if (team1Wins > team2Wins) {
            winnerTeam = 0;
        } else if (team2Wins > team1Wins) {
            winnerTeam = 1;
        } else {
            // In case of a tie, the first team to win a hand wins the round
            winnerTeam = this.handWinners[0];
        }
        
        // Award points to the winner team
        this.scores[winnerTeam] += this.trucoValue;
        
        // Check if game is over
        if (this.scores[0] >= 12 || this.scores[1] >= 12) {
            this.gameState = 'finished';
        } else {
            // Prepare for next round
            this.prepareNextRound();
        }
        
        this.updateGameState();
    }

    // Prepare for the next round
    prepareNextRound() {
        this.currentRound++;
        this.dealer = (this.dealer + 1) % 4;
        this.handWinners = [];
        this.trucoValue = 1;
        this.trucoState = 0;
        this.teamCards = [[], []];
        
        // Reset and deal new cards
        this.deck.reset();
        this.deck.shuffle();
        this.vira = this.deck.drawVira();
        this.dealCards();
        
        // First player after dealer starts
        this.currentTurn = (this.dealer + 1) % 4;
    }

    // Call truco (raise the stakes)
    callTruco(playerId) {
        const playerIndex = this.players.findIndex(p => p.id === playerId);
        const playerTeam = playerIndex % 2;
        const opposingTeam = (playerTeam + 1) % 2;
        
        // Can only call truco on your turn or in response to opponent's truco
        if (playerIndex !== this.currentTurn && this.trucoState !== 1) return false;
        
        // Can't call truco if you already called it this round
        if (this.trucoState === 1 && this.lastTrucoTeam === playerTeam) return false;
        
        // Determine new truco value based on current state
        let newValue;
        switch (this.trucoValue) {
            case 1: newValue = 3; break;
            case 3: newValue = 6; break;
            case 6: newValue = 9; break;
            case 9: newValue = 12; break;
            default: return false; // Can't raise beyond 12
        }
        
        this.trucoState = 1; // Truco has been called
        this.lastTrucoTeam = playerTeam;
        this.pendingTrucoValue = newValue;
        
        this.updateGameState();
        return true;
    }

    // Respond to a truco call (accept, decline, or raise)
    respondToTruco(playerId, response) {
        const playerIndex = this.players.findIndex(p => p.id === playerId);
        const playerTeam = playerIndex % 2;
        
        // Only the opposing team can respond to a truco call
        if (playerTeam === this.lastTrucoTeam) return false;
        
        if (response === 'accept') {
            // Accept the truco
            this.trucoValue = this.pendingTrucoValue;
            this.trucoState = 2; // Truco accepted
        } else if (response === 'decline') {
            // Decline the truco, opposing team wins the round
            this.scores[this.lastTrucoTeam] += this.trucoValue;
            this.prepareNextRound();
        } else if (response === 'raise') {
            // Raise the truco (call a higher value)
            return this.callTruco(playerId);
        }
        
        this.updateGameState();
        return true;
    }

    // Run away from the round (forfeit)
    runAway(playerId) {
        const playerIndex = this.players.findIndex(p => p.id === playerId);
        const playerTeam = playerIndex % 2;
        const opposingTeam = (playerTeam + 1) % 2;
        
        // Award points to the opposing team
        this.scores[opposingTeam] += this.trucoValue;
        
        // Check if game is over
        if (this.scores[0] >= 12 || this.scores[1] >= 12) {
            this.gameState = 'finished';
        } else {
            // Prepare for next round
            this.prepareNextRound();
        }
        
        this.updateGameState();
        return true;
    }

    // Update the game state in the database
    updateGameState() {
        // Create a simplified state object to store in the database
        const gameState = {
            roomId: this.roomId,
            players: this.players.map(p => ({
                id: p.id,
                name: p.name,
                handCount: p.hand.length
            })),
            currentRound: this.currentRound,
            currentTurn: this.currentTurn,
            vira: this.vira ? {
                suit: this.vira.suit,
                rank: this.vira.rank
            } : null,
            playedCards: this.playedCards.map(pc => ({
                suit: pc.card.suit,
                rank: pc.card.rank,
                playerIndex: pc.playerIndex
            })),
            scores: this.scores,
            trucoValue: this.trucoValue,
            trucoState: this.trucoState,
            lastTrucoTeam: this.lastTrucoTeam,
            pendingTrucoValue: this.pendingTrucoValue,
            handWinners: this.handWinners,
            gameState: this.gameState,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };
        
        // Update the game state in the database
        this.database.set(gameState);
        
        // Send player-specific information (their cards) separately
        this.players.forEach((player, index) => {
            const playerRef = firebase.database().ref(`players/${player.id}`);
            playerRef.set({
                hand: player.hand.map(card => ({
                    suit: card.suit,
                    rank: card.rank,
                    manilha: card.manilha
                })),
                gameId: this.roomId,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
        });
    }

    // Get the current state of the game
    getGameState() {
        return {
            roomId: this.roomId,
            players: this.players,
            currentRound: this.currentRound,
            currentTurn: this.currentTurn,
            vira: this.vira,
            playedCards: this.playedCards,
            scores: this.scores,
            trucoValue: this.trucoValue,
            handWinners: this.handWinners,
            gameState: this.gameState
        };
    }
}