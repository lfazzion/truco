// UI class to handle the user interface for the Truco game
class UI {
    constructor() {
        // Screen elements
        this.welcomeScreen = document.getElementById('welcome-screen');
        this.waitingRoom = document.getElementById('waiting-room');
        this.gameScreen = document.getElementById('game-screen');
        this.gameOverScreen = document.getElementById('game-over');
        
        // Welcome screen elements
        this.createRoomBtn = document.getElementById('create-room-btn');
        this.joinRoomBtn = document.getElementById('join-room-btn');
        this.roomCodeInput = document.getElementById('room-code-input');
        
        // Waiting room elements
        this.roomCodeDisplay = document.getElementById('room-code-display');
        this.copyCodeBtn = document.getElementById('copy-code-btn');
        this.playersList = document.getElementById('players-list');
        this.waitingMessage = document.getElementById('waiting-message');
        this.startGameBtn = document.getElementById('start-game-btn');
        this.leaveRoomBtn = document.getElementById('leave-room-btn');
        
        // Game screen elements
        this.team1Score = document.getElementById('team1-score');
        this.team2Score = document.getElementById('team2-score');
        this.trucoValueDisplay = document.getElementById('truco-value');
        this.currentPlayerDisplay = document.getElementById('current-player');
        this.trucoBtn = document.getElementById('truco-btn');
        this.runBtn = document.getElementById('run-btn');
        this.playedCardsContainer = document.querySelector('.played-cards');
        this.viraCardContainer = document.querySelector('.vira-card');
        
        // Game over screen elements
        this.winnerDisplay = document.getElementById('winner-display');
        this.finalTeam1Score = document.getElementById('final-team1-score');
        this.finalTeam2Score = document.getElementById('final-team2-score');
        this.newGameBtn = document.getElementById('new-game-btn');
        this.returnHomeBtn = document.getElementById('return-home-btn');
        
        // Game state
        this.currentRoom = null;
        this.currentGame = null;
        this.playerId = localStorage.getItem('playerId') || generatePlayerId();
        this.playerName = localStorage.getItem('playerName') || '';
        this.playerTeam = null;
        this.trucoDialogActive = false;
        
        // Save player ID to local storage
        localStorage.setItem('playerId', this.playerId);
    }
    
    // Initialize the UI
    initialize() {
        // If player name is not set, prompt for it
        if (!this.playerName) {
            this.promptForPlayerName();
        }
        
        // Set up event listeners
        this.setupEventListeners();
    }
    
    // Prompt user for their name
    promptForPlayerName() {
        let name = prompt('Digite seu nome:', '');
        if (name) {
            this.playerName = name.trim();
            localStorage.setItem('playerName', this.playerName);
        } else {
            // Generate a default name if none provided
            this.playerName = 'Jogador ' + Math.floor(Math.random() * 1000);
            localStorage.setItem('playerName', this.playerName);
        }
    }
    
    // Set up all event listeners
    setupEventListeners() {
        // Welcome screen buttons
        this.createRoomBtn.addEventListener('click', () => this.createRoom());
        this.joinRoomBtn.addEventListener('click', () => this.joinRoom());
        
        // Waiting room buttons
        this.copyCodeBtn.addEventListener('click', () => this.copyRoomCode());
        this.startGameBtn.addEventListener('click', () => this.startGame());
        this.leaveRoomBtn.addEventListener('click', () => this.leaveRoom());
        
        // Game screen buttons
        this.trucoBtn.addEventListener('click', () => this.callTruco());
        this.runBtn.addEventListener('click', () => this.runAway());
        
        // Game over screen buttons
        this.newGameBtn.addEventListener('click', () => this.startNewGame());
        this.returnHomeBtn.addEventListener('click', () => this.returnToHome());
    }
    
    // Show a specific screen and hide others
    showScreen(screen) {
        this.welcomeScreen.classList.remove('active');
        this.waitingRoom.classList.remove('active');
        this.gameScreen.classList.remove('active');
        this.gameOverScreen.classList.remove('active');
        
        screen.classList.add('active');
    }
    
    // Create a new room
    createRoom() {
        if (!this.playerName) {
            this.promptForPlayerName();
            if (!this.playerName) return; // User cancelled
        }
        
        Room.createRoom(this.playerId, this.playerName)
            .then(room => {
                this.currentRoom = room;
                this.roomCodeDisplay.textContent = room.roomId;
                this.showScreen(this.waitingRoom);
                this.listenForRoomChanges();
            })
            .catch(error => {
                alert('Erro ao criar sala: ' + error.message);
            });
    }
    
    // Join an existing room
    joinRoom() {
        if (!this.playerName) {
            this.promptForPlayerName();
            if (!this.playerName) return; // User cancelled
        }
        
        const roomCode = this.roomCodeInput.value.trim().toUpperCase();
        if (!roomCode) {
            alert('Por favor, digite o código da sala.');
            return;
        }
        
        Room.joinRoom(roomCode, this.playerId, this.playerName)
            .then(room => {
                this.currentRoom = room;
                this.roomCodeDisplay.textContent = room.roomId;
                this.showScreen(this.waitingRoom);
                this.listenForRoomChanges();
            })
            .catch(error => {
                alert('Erro ao entrar na sala: ' + error.message);
            });
    }
    
    // Copy room code to clipboard
    copyRoomCode() {
        const roomCode = this.roomCodeDisplay.textContent;
        navigator.clipboard.writeText(roomCode)
            .then(() => {
                alert('Código copiado para a área de transferência!');
            })
            .catch(err => {
                console.error('Erro ao copiar: ', err);
            });
    }
    
    // Start the game
    startGame() {
        if (!this.currentRoom) return;
        
        this.currentRoom.startGame()
            .then(game => {
                this.currentGame = game;
                this.showScreen(this.gameScreen);
                this.listenForGameChanges();
            })
            .catch(error => {
                alert('Erro ao iniciar jogo: ' + error.message);
            });
    }
    
    // Leave the current room
    leaveRoom() {
        if (!this.currentRoom) return;
        
        this.currentRoom.removePlayer(this.playerId)
            .then(() => {
                this.currentRoom.stopListening();
                this.currentRoom = null;
                this.showScreen(this.welcomeScreen);
            })
            .catch(error => {
                alert('Erro ao sair da sala: ' + error.message);
            });
    }
    
    // Listen for changes in the room
    listenForRoomChanges() {
        this.currentRoom.listenForPlayerChanges(players => {
            this.updatePlayersList(players);
        });
        
        this.currentRoom.listenForStatusChanges(status => {
            if (status.gameStarted) {
                // Game has been started by another player
                this.showScreen(this.gameScreen);
                this.listenForGameChanges();
            }
        });
    }
    
    // Update the players list in the waiting room
    updatePlayersList(players) {
        this.playersList.innerHTML = '';
        players.forEach(player => {
            const li = document.createElement('li');
            li.textContent = player.name;
            this.playersList.appendChild(li);
        });
        
        // Update waiting message
        this.waitingMessage.textContent = `Aguardando jogadores... (${players.length}/4)`;
        
        // Enable start button if we have 4 players
        this.startGameBtn.disabled = players.length !== 4;
    }
    
    // Listen for changes in the game
    listenForGameChanges() {
        const gameRef = firebase.database().ref(`games/${this.currentRoom.roomId}`);
        gameRef.on('value', snapshot => {
            const gameData = snapshot.val();
            if (!gameData) return;
            
            this.updateGameUI(gameData);
            
            // Check if game is finished
            if (gameData.gameState === 'finished') {
                this.showGameOver(gameData);
            }
        });
        
        // Listen for player-specific data (cards)
        const playerRef = firebase.database().ref(`players/${this.playerId}`);
        playerRef.on('value', snapshot => {
            const playerData = snapshot.val();
            if (!playerData || !playerData.hand) return;
            
            this.updatePlayerHand(playerData.hand);
        });
    }
    
    // Update the game UI based on game state
    updateGameUI(gameData) {
        // Update scores
        this.team1Score.textContent = gameData.scores[0];
        this.team2Score.textContent = gameData.scores[1];
        
        // Update truco value
        this.trucoValueDisplay.textContent = gameData.trucoValue;
        
        // Find current player's index
        const playerIndex = gameData.players.findIndex(p => p.id === this.playerId);
        this.playerTeam = playerIndex % 2; // 0 or 1
        
        // Update current turn display
        const currentPlayerName = gameData.players[gameData.currentTurn].name;
        this.currentPlayerDisplay.textContent = currentPlayerName;
        
        // Highlight current player
        document.querySelectorAll('.opponent, .current-player').forEach(el => {
            el.classList.remove('active-turn');
        });
        
        const currentPlayerElement = document.getElementById(`player${gameData.currentTurn}`);
        if (currentPlayerElement) {
            currentPlayerElement.classList.add('active-turn');
        }
        
        // Update opponent card counts
        for (let i = 0; i < gameData.players.length; i++) {
            if (i !== playerIndex) {
                const opponentElement = document.getElementById(`player${i}`);
                if (opponentElement) {
                    const cardCountElement = opponentElement.querySelector('.player-cards-count');
                    if (cardCountElement) {
                        cardCountElement.textContent = gameData.players[i].handCount;
                    }
                }
            }
        }
        
        // Update played cards
        this.updatePlayedCards(gameData.playedCards);
        
        // Update vira card
        this.updateViraCard(gameData.vira);
        
        // Enable/disable truco button based on turn and state
        this.trucoBtn.disabled = gameData.currentTurn !== playerIndex || 
                                 gameData.trucoState === 1 || 
                                 (gameData.trucoState === 3 && gameData.trucoValue === 12);
        
        // Show truco dialog if needed
        if (gameData.trucoState === 1 && gameData.lastTrucoTeam !== this.playerTeam && !this.trucoDialogActive) {
            this.showTrucoDialog(gameData.pendingTrucoValue);
        }
    }
    
    // Update the player's hand display
    updatePlayerHand(handData) {
        const playerCardsContainer = document.querySelector('#player0 .player-cards');
        playerCardsContainer.innerHTML = '';
        
        // Create card objects from data
        const cards = handData.map(cardData => {
            const card = new Card(cardData.suit, cardData.rank, 0);
            if (cardData.manilha) card.setAsManilha();
            return card;
        });
        
        // Add cards to the display
        cards.forEach((card, index) => {
            const cardElement = card.createElement(true);
            cardElement.addEventListener('click', () => this.playCard(index));
            playerCardsContainer.appendChild(cardElement);
        });
    }
    
    // Update the played cards display
    updatePlayedCards(playedCardsData) {
        this.playedCardsContainer.innerHTML = '';
        
        if (!playedCardsData || playedCardsData.length === 0) return;
        
        playedCardsData.forEach(pcData => {
            const card = new Card(pcData.suit, pcData.rank, 0);
            const cardElement = card.createElement(true);
            
            // Position the card based on player position
            cardElement.classList.add(`player-${pcData.playerIndex}-card`);
            this.playedCardsContainer.appendChild(cardElement);
        });
    }
    
    // Update the vira card display
    updateViraCard(viraData) {
        this.viraCardContainer.innerHTML = '';
        
        if (!viraData) return;
        
        const vira = new Card(viraData.suit, viraData.rank, 0);
        const viraElement = vira.createElement(true);
        this.viraCardContainer.appendChild(viraElement);
    }
    
    // Play a card from the player's hand
    playCard(cardIndex) {
        if (!this.currentGame) return;
        
        // Find current player's index in the game
        const gameRef = firebase.database().ref(`games/${this.currentRoom.roomId}`);
        gameRef.once('value').then(snapshot => {
            const gameData = snapshot.val();
            if (!gameData) return;
            
            // Check if it's this player's turn
            const playerIndex = gameData.players.findIndex(p => p.id === this.playerId);
            if (playerIndex !== gameData.currentTurn) {
                alert('Não é sua vez de jogar!');
                return;
            }
            
            // Play the card
            const cardRef = firebase.database().ref(`games/${this.currentRoom.roomId}/actions`).push();
            cardRef.set({
                type: 'playCard',
                playerId: this.playerId,
                cardIndex: cardIndex,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
        });
    }
}