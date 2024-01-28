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
            current_word: '',
            current_joke: null,
            current_joke_player: null
        },
        canPlayAudio: false,
        audioEngine: {
            bgmTitle: new Audio('/static/mp3/bgm-title.mp3'),
            bgmJokes: new Audio('/static/mp3/bgm-jokes.mp3'),
            bgmVoting: new Audio('/static/mp3/bgm-voting.mp3'),
            bgmWin: new Audio('/static/mp3/bgm-win.mp3'),
            bgmLose: new Audio('/static/mp3/bgm-lose.mp3'),

            sfxPlayerEntered: new Audio('/static/mp3/sfx-player-entered.mp3'),
            sfxGameStarted: new Audio('/static/mp3/sfx-game-started.mp3'),
            sfxGameCountdown: new Audio('/static/mp3/sfx-game-countdown.mp3'),
            sfxJokeSubmitted: new Audio('/static/mp3/sfx-joke-submitted.mp3'),
        },
        nameSent: null,
        jokeSubmission: null,
        canVote: true,
        resultsYesText: 0,
        resultsNoText: 0,
        roundText: null,

        init() {
            window.addEventListener('mouseover', () => {
                if (this.canPlayAudio === false) {
                    this.canPlayAudio = true;
                    console.log('Allowed to play sound')
                    console.log('Calling playSound from windowEvent')
                    this.playSound('bgmTitle', true, 0.75)
                }
            })
            this.socket = io()
            this.socket.on('connect', () => {
                this.currentScreen = 'title'
                // if the display accidentally refreshes, come back to the game
                if (this.isDisplay()) {
                    this.promptGameState()
                }
            })
            this.socket.on('disconnect', () => {
                alert('Goodbye friend!')
                window.location.reload(true)
            })
            this.socket.on('event_game_state_update', (json) => {
                this.gameState = json.gameState
                if (json.sound) {
                    json.sound.forEach((element) => {
                        console.log('Element: ' + JSON.stringify(element))
                        switch(element.action) {
                            case 'play':
                                console.log('canPlayAudio: ' + this.canPlayAudio)
                                console.log('calling playSound from event_game_state_update')
                                this.playSound(element['name'], element['loop'] || false, element['volume'] || 1.0)
                                break;
                            case 'stop':
                                this.stopAllSound()
                                break;
                            default:
                                console.log('Invalid sound data: ')
                                console.log(element)
                        }
                    })
                }
                if (this.gameState.started)
                    this.currentScreen = 'game-screen'
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
                this.stopAllSound()
                this.playSound('sfxGameStarted', false, 1.0)
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
                    this.playSound('sfxGameCountdown', false, 0.5)
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
                if (this.playerData.id == json.player.id) {
                    this.roundText = "You are a very punny friend!<br>Congratulations!"
                    this.playerData = json.player
                } else {
                    this.roundText = `<b>${json.player.name}</b> is a very punny friend!`
                }
                this.currentScreen = 'round-win'
                this.resultsYesText = 0
                this.resultsNoText = 0
                this.jokeSubmission = null
                if (this.isDisplay()) {
                    await this.sleep(2000)
                    // Show scores
                    this.$refs.scoreDialog.showModal()
                    await this.sleep(5000)
                    this.$refs.scoreDialog.close()
                }
                if (this.isController()) {
                    await this.sleep(7000)
                    this.loadNextLevel()
                }
            })
            this.socket.on('event_round_lose', (json) => {
                if (this.playerData.id == json.player.id) {
                    this.roundText = "You are not a very punny friend..."
                    this.playerData = json.player
                    this.jokeSubmission = null
                } else {
                    this.roundText = `<b>${json.player.name}</b> is a very punny friend!`
                }
                this.currentScreen = 'round-lose'
                this.jokeSubmission = null
                this.resultsYesText = 0
                this.resultsNoText = 0
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
            if (!this.isController()) {
                return
            }
            this.jokeSubmission = null
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
            let variance = Math.floor(Math.random() * 80)
            voteCounter.classList.add(
                good ? 'text-green-500' : 'text-red-500', 
                'vote-count', 'absolute', 'font-bold', 'text-[32px]', '-top-10')
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
        playSound(sound, loop=false, volume=1.0) {
            if (!this.isDisplay() || 
                !this.canPlayAudio) {
                    console.log('Not playing sound.')
                    console.log('Arguments:')
                    console.log(arguments)
                    console.log('Values')
                    console.log(`${!this.isDisplay()} ${!this.canPlayAudio}`)
                return
            }
            if (!this.audioEngine[sound].paused) {
                this.audioEngine[sound].pause()
            }
            try {
                this.audioEngine[sound].loop = loop
                this.audioEngine[sound].volume = volume
                this.audioEngine[sound].currentTime = 0
                let playing = false;
                while (!this.audioEngine[sound].paused) {

                }
                this.audioEngine[sound].play()
                console.log(`Playing ${sound}`)
            } catch(err) {
                console.log(err)
            }
        },
        stopAllSound() {
            for (sound of Object.values(this.audioEngine)) {
                sound.pause()
                sound.currentTime = 0
            }
        },
        pad(num, size) {
            let negative = num < 0
            num = num.toString().replace('-', '');
            while (num.length < size - 1) num = "0" + num;
            num = (negative ? '-' : '0') + num;
            return num;
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
        },
    }))
})