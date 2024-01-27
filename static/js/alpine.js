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
            players_sorted: [],
            current_word: null,
            current_joke: null,
            current_joke_player: null
        },
        nameSent: null,
        jokeSubmission: null,
        canVote: true,
        resultsYesText: 0,
        resultsNoText: 0,

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
            this.socket.on('event_vote_submitted', json => {
                if (!this.isDisplay()) {
                    return
                }
                this.createVoteAnimation(json.good)
            })
            this.socket.on('event_count_results', async (json) => {
                if (!this.isDisplay()) {
                    return
                }
                let maximum = Math.max(this.gameState.votes_yes, this.gameState.votes_no)
                let timeout = 1500 / maximum

                while (this.resultsYesText < this.gameState.votes_yes || this.resultsNoText < this.gameState.votes_no) {
                    if (this.resultsYesText < this.gameState.votes_yes) {
                        this.resultsYesText++;
                    }
                    if (this.resultsNoText < this.gameState.votes_no) {
                        this.resultsNoText++;
                    }
                    await this.sleep(timeout)
                }
                await this.sleep(1000)
                this.socket.emit('event_counting_complete')
            })
            this.socket.on('event_round_win', async (json) => {
                this.currentScreen = 'round-win'
                if (this.playerData.id == json.player.id) {
                    this.playerData = json.player
                }
                this.resultsYesText = 0
                this.resultsNoText = 0
                if (this.isDisplay()) {
                    await this.sleep(3000)
                    // Show scores
                    this.$refs.scoreDialog.showModal()
                    await this.sleep(10000)
                    this.$refs.scoreDialog.close()
                    this.loadNextLevel()
                }
            })
            this.socket.on('event_round_lose', (json) => {
                this.currentScreen = 'round-lose'
                this.resultsYesText = 0
                this.resultsNoText = 0
                if (this.playerData.id == json.player.id) {
                    this.playerData = json.player
                }
            })
        },
        sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
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
        continueGame() {

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
        sendVote(good) {
            if (!this.canVote) {
                return
            }
            this.canVote = false
            this.socket.emit('event_vote_submission', {
                good: good
            })
            this.createVoteAnimation(good)
            setTimeout(() => {
                this.canVote = true
            }, 100)
            
        },
        createVoteAnimation(good) {
            let voteCounter = document.createElement('span')
            let variance = Math.floor(Math.random() * 5) + 3
            voteCounter.classList.add(
                good ? 'text-green-500' : 'text-red-500', 
                'vote-count', 'absolute', 'font-bold')
            if (good) {
                voteCounter.style.left = `${variance}px`
            } else {
                voteCounter.style.right = `${variance}px`
            }
            voteCounter.innerHTML = "+1"
            this.$refs.voteContainer.appendChild(voteCounter)
            setTimeout(() => {
                voteCounter.remove()
            }, 1500)
        },
        promptGameState() {
            this.socket.emit('event_prompt_game_state')
        },
        promptSkipLevel() {
            if (confirm('Are you sure you want to skip this level?')) {
                this.loadNextLevel()
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