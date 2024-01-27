document.addEventListener('alpine:init', () => {
    Alpine.data('gameState', () => ({
        currentScreen: 'loading',
        playerEnteredName: null,
        playerData: {
            id: null,
            name: null,
            score: 0
        },
        gameState: {
            started: false,
            players: {},
            current_word: null,
        },
        nameSent: null,
        jokeSubmission: null,

        init() {
            this.socket = io()
            this.socket.on('connect', () => {
                this.currentScreen = 'title'
                console.log('connected!')
                // if the display accidentally refreshes, come back to the game
                if (this.isDisplay()) {
                    this.promptGameState()
                }
            })
            this.socket.on('disconnect', () => {
                alert('Goodbye friend!')
                location.reload()
            })
            this.socket.on('event_game_state_update', (json) => {
                console.log(json)
                this.gameState = json
                // also checking for disconnect
                if (this.gameState.started) {
                    this.currentScreen = 'game-screen'
                }
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
            this.socket.on('event_restarting', (json) => {
                this.socket.disconnect()
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
        submitJoke() {
            this.socket.emit('event_joke_submission', {
                'joke': this.jokeSubmission
            })
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
        promptGameState() {
            this.socket.emit('event_prompt_game_state')
        },
        promptSkipLevel() {
            if (confirm('Are you sure you want to skip this level?')) {
                this.socket.emit('event_load_next_level')
            }
        },
        promptShowScores() {
            if (confirm('Are you sure you want to show the scores?')) {
                alert('TODO; implement promptShowScores()')
            }
        },
        promptRestartGame() {
            if (confirm('Are you sure you want to restart the game?')) {
                this.socket.emit('event_restart_game')
            }
        }
    }))
})