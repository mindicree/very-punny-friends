document.addEventListener('alpine:init', () => {
    Alpine.data('gameState', () => ({
        currentScreen: 'loading',
        playerEnteredName: null,
        playerData: null,
        gameState: {
            started: false,
            players: []
        },
        nameSent: null,

        init() {
            this.socket = io()
            this.socket.on('connect', () => {
                this.currentScreen = 'title'
                console.log('connected!')
            })
            this.socket.on('disconnect', () => {
                alert('Goodbye friend!')
                location.reload()
            })
            this.socket.on('event_game_state_update', (json) => {
                this.gameState = json
            })
            this.socket.on('event_new_player_added_successfully', (json) => {
                this.playerData = json
                this.currentScreen = 'lobby'
            })
        },

        createAndJoinLobby() {
            this.currentScreen = 'loading'
            this.socket.emit('event_create_new_player', {
                name: this.playerEnteredName
            })
            this.nameSent = true
        }
    }))
})