// Room class to manage game rooms and player connections
class Room {
    constructor(roomId = null) {
        this.roomId = roomId || generateRoomCode();
        this.players = [];
        this.maxPlayers = 4;
        this.gameStarted = false;
        this.game = null;
        this.database = firebase.database().ref(`rooms/${this.roomId}`);
        this.playersRef = this.database.child('players');
        this.statusRef = this.database.child('status');
    }

    // Initialize the room in the database
    initialize() {
        return this.database.set({
            roomId: this.roomId,
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            status: {
                gameStarted: false,
                playerCount: 0
            }
        });
    }

    // Add a player to the room
    addPlayer(playerId, playerName) {
        // Check if room is full
        if (this.players.length >= this.maxPlayers) {
            return Promise.reject('Room is full');
        }

        // Check if game has already started
        if (this.gameStarted) {
            return Promise.reject('Game has already started');
        }

        // Create player object
        const player = {
            id: playerId,
            name: playerName,
            joinedAt: firebase.database.ServerValue.TIMESTAMP,
            hand: [],
            isReady: false
        };

        // Add player to local array
        this.players.push(player);

        // Add player to database
        return this.playersRef.child(playerId).set(player)
            .then(() => {
                // Update player count
                return this.statusRef.update({
                    playerCount: this.players.length
                });
            })
            .then(() => player);
    }

    // Remove a player from the room
    removePlayer(playerId) {
        // Find player index
        const playerIndex = this.players.findIndex(p => p.id === playerId);
        if (playerIndex === -1) return Promise.resolve();

        // Remove player from local array
        this.players.splice(playerIndex, 1);

        // Remove player from database
        return this.playersRef.child(playerId).remove()
            .then(() => {
                // Update player count
                return this.statusRef.update({
                    playerCount: this.players.length
                });
            });
    }

    // Start the game
    startGame() {
        // Check if we have enough players
        if (this.players.length !== 4) {
            return Promise.reject('Need exactly 4 players to start');
        }

        // Create a new game
        this.game = new Game(this.roomId, this.players);
        this.gameStarted = true;

        // Update room status in database
        return this.statusRef.update({
            gameStarted: true,
            startedAt: firebase.database.ServerValue.TIMESTAMP
        })
        .then(() => {
            // Initialize the game
            this.game.initialize();
            return this.game;
        });
    }

    // Listen for player changes
    listenForPlayerChanges(callback) {
        this.playersRef.on('value', snapshot => {
            const playersData = snapshot.val() || {};
            this.players = Object.values(playersData);
            if (callback) callback(this.players);
        });
    }

    // Listen for room status changes
    listenForStatusChanges(callback) {
        this.statusRef.on('value', snapshot => {
            const status = snapshot.val() || {};
            this.gameStarted = status.gameStarted || false;
            if (callback) callback(status);
        });
    }

    // Stop listening for changes
    stopListening() {
        this.playersRef.off();
        this.statusRef.off();
    }

    // Check if room exists
    static checkRoomExists(roomId) {
        return firebase.database().ref(`rooms/${roomId}`).once('value')
            .then(snapshot => snapshot.exists());
    }

    // Join an existing room
    static joinRoom(roomId, playerId, playerName) {
        return Room.checkRoomExists(roomId)
            .then(exists => {
                if (!exists) {
                    throw new Error('Room does not exist');
                }
                const room = new Room(roomId);
                return room.addPlayer(playerId, playerName).then(() => room);
            });
    }

    // Create a new room
    static createRoom(playerId, playerName) {
        const room = new Room();
        return room.initialize()
            .then(() => room.addPlayer(playerId, playerName))
            .then(() => room);
    }
}