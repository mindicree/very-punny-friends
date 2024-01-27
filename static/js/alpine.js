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
                console.log(json)
                this.gameState = json
            })
            this.socket.on('event_new_player_added_successfully', (json) => {
                this.playerData = json
                this.currentScreen = 'lobby'
            })
            this.socket.on('event_controller_set_successfully', (json) => {
                this.currentScreen = this.gameState.started ? 'game-sreen' : 'lobby'
            })
            this.socket.on('event_game_start', (json) => {
                this.currentScreen = 'game-screen'
                this.loadNextLevel()
            })
        },
        createAndJoinLobby() {
            this.currentScreen = 'loading'
            this.socket.emit('event_create_new_player', {
                name: this.playerEnteredName
            })
            this.nameSent = true
        },
        controlGame() {
            this.currentScreen = 'loading'
            this.socket.emit('event_control_game')
        },
        startGame() {
            this.socket.emit('event_start_game')
        },
        loadNextLevel() {
            this.socket.emit('event_load_next_level')
        },
        isController() {
            return window.location.href.includes('controller')
        },
        isDisplay() {
            return window.location.href.includes('display')
        },
        isPlayer() {
            return !this.isController() && !this.isDisplay()
        },
    }))
})