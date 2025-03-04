// Main script to initialize the Truco game
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the UI
    const ui = new UI();
    ui.initialize();
    
    // Check if we're coming back from a game via URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('room');
    
    if (roomId) {
        // Auto-fill the room code input
        document.getElementById('room-code-input').value = roomId;
        
        // Auto-join the room if we have a player name
        if (localStorage.getItem('playerName')) {
            setTimeout(() => {
                document.getElementById('join-room-btn').click();
            }, 500);
        }
    }
    
    // Add methods to handle game actions
    
    // Call truco (raise the stakes)
    UI.prototype.callTruco = function() {
        if (!this.currentRoom || !this.currentRoom.game) return;
        
        const gameRef = firebase.database().ref(`games/${this.currentRoom.roomId}/actions`).push();
        gameRef.set({
            type: 'callTruco',
            playerId: this.playerId,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
    };
    
    // Run away (forfeit the round)
    UI.prototype.runAway = function() {
        if (!this.currentRoom || !this.currentRoom.game) return;
        
        if (confirm('Tem certeza que deseja correr desta rodada?')) {
            const gameRef = firebase.database().ref(`games/${this.currentRoom.roomId}/actions`).push();
            gameRef.set({
                type: 'runAway',
                playerId: this.playerId,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
        }
    };
    
    // Show truco dialog when opponent calls truco
    UI.prototype.showTrucoDialog = function(trucoValue) {
        this.trucoDialogActive = true;
        
        // Create dialog
        const dialog = document.createElement('div');
        dialog.className = 'truco-dialog';
        dialog.innerHTML = `
            <div class="truco-message">Truco chamado! Valor: ${trucoValue}</div>
            <div class="truco-options">
                <button class="btn-action accept-btn">Aceitar</button>
                <button class="btn-action raise-btn">Aumentar</button>
                <button class="btn-action decline-btn">Correr</button>
            </div>
        `;
        
        // Add to game screen
        this.gameScreen.appendChild(dialog);
        
        // Add event listeners
        dialog.querySelector('.accept-btn').addEventListener('click', () => {
            this.respondToTruco('accept');
            dialog.remove();
            this.trucoDialogActive = false;
        });
        
        dialog.querySelector('.raise-btn').addEventListener('click', () => {
            this.respondToTruco('raise');
            dialog.remove();
            this.trucoDialogActive = false;
        });
        
        dialog.querySelector('.decline-btn').addEventListener('click', () => {
            this.respondToTruco('decline');
            dialog.remove();
            this.trucoDialogActive = false;
        });
    };
    
    // Respond to a truco call
    UI.prototype.respondToTruco = function(response) {
        if (!this.currentRoom || !this.currentRoom.game) return;
        
        const gameRef = firebase.database().ref(`games/${this.currentRoom.roomId}/actions`).push();
        gameRef.set({
            type: 'respondToTruco',
            playerId: this.playerId,
            response: response,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
    };
    
    // Play a card
    UI.prototype.playCard = function(cardIndex) {
        if (!this.currentRoom || !this.currentRoom.game) return;
        
        const gameRef = firebase.database().ref(`games/${this.currentRoom.roomId}/actions`).push();
        gameRef.set({
            type: 'playCard',
            playerId: this.playerId,
            cardIndex: cardIndex,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
    };
    
    // Show game over screen
    UI.prototype.showGameOver = function(gameData) {
        // Determine winner
        const winnerTeam = gameData.scores[0] >= 12 ? 0 : 1;
        const playerIndex = gameData.players.findIndex(p => p.id === this.playerId);
        const playerTeam = playerIndex % 2;
        
        // Update winner display
        if (winnerTeam === playerTeam) {
            this.winnerDisplay.textContent = 'Sua equipe venceu!';
        } else {
            this.winnerDisplay.textContent = 'Sua equipe perdeu!';
        }
        
        // Update final scores
        this.finalTeam1Score.textContent = gameData.scores[0];
        this.finalTeam2Score.textContent = gameData.scores[1];
        
        // Show game over screen
        this.showScreen(this.gameOverScreen);
    };
    
    // Start a new game
    UI.prototype.startNewGame = function() {
        if (!this.currentRoom) return;
        
        // Reset the room and start a new game
        const roomId = this.currentRoom.roomId;
        const playerId = this.playerId;
        const playerName = this.playerName;
        
        // Clean up listeners
        firebase.database().ref(`games/${roomId}`).off();
        firebase.database().ref(`players/${playerId}`).off();
        
        // Create a new room with the same players
        Room.createRoom(playerId, playerName)
            .then(room => {
                this.currentRoom = room;
                this.roomCodeDisplay.textContent = room.roomId;
                this.showScreen(this.waitingRoom);
                this.listenForRoomChanges();
                
                // Share the new room code
                alert(`Nova sala criada! Compartilhe o código: ${room.roomId}`);
            })
            .catch(error => {
                alert('Erro ao criar nova sala: ' + error.message);
            });
    };
    
    // Return to home screen
    UI.prototype.returnToHome = function() {
        // Clean up any listeners
        if (this.currentRoom) {
            this.currentRoom.stopListening();
        }
        
        firebase.database().ref(`games/${this.currentRoom?.roomId}`).off();
        firebase.database().ref(`players/${this.playerId}`).off();
        
        this.currentRoom = null;
        this.currentGame = null;
        
        // Show welcome screen
        this.showScreen(this.welcomeScreen);
    };
    
    // Listen for game actions
    firebase.database().ref('games').on('child_added', snapshot => {
        const gameData = snapshot.val();
        if (!gameData || !gameData.actions) return;
        
        // Process game actions
        Object.values(gameData.actions).forEach(action => {
            if (action.processed) return;
            
            // Process the action based on type
            switch (action.type) {
                case 'playCard':
                    // Handle play card action
                    break;
                case 'callTruco':
                    // Handle call truco action
                    break;
                case 'respondToTruco':
                    // Handle respond to truco action
                    break;
                case 'runAway':
                    // Handle run away action
                    break;
            }
            
            // Mark action as processed
            firebase.database().ref(`games/${gameData.roomId}/actions/${action.key}/processed`).set(true);
        });
    });
});