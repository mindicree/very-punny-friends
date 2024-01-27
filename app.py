from flask import Flask, render_template, request, make_response, jsonify, abort
from flask_socketio import SocketIO, emit
from time import sleep
import yaml
import secrets
import random

# configuration load
try:
    with open('config.yaml', 'r') as file:
        config = yaml.safe_load(file)
except Exception as e:
    print('Could not load config file. Using Default values')
    config = {
        'FLASK_HOST': '127.0.0.1',
        'FLASK_PORT': '5000',
        'FLASK_DEBUG': True,
        'FLASK_SECRET': 's3cr3t!'
    }

# app configuring
app = Flask(__name__)
app.config['SECRET_KEY'] = config['FLASK_SECRET']
socketio = SocketIO(app)

def initializeGameState():
    return {
        'started': False,
        'players': {},
        'players_sorted': [],
        'controller': None,
        'accepting_answers': False,
        'accepting_votes': False,
        'votes_yes': 0,
        'votes_no': 0,
        'current_word': None,
        'current_joke': None,
        'current_joke_player': None,
        'level_countdown': 4,
        'voting_countdown': 15,
        'showing_results': False,
    }

# game data
game_state = initializeGameState()

# words
words = []
try:
    with open('words.txt', 'r') as file:
        for line in file:
            words.append(line.strip())
except Exception as e:
    print('Could not load words.txt file.')
    exit()

@app.route("/")
def route_player():
    return render_template('player.html')

@app.route("/controller")
def route_controller():
    return render_template('controller.html')

@app.route("/display")
def route_display():
    return render_template('display.html')

@socketio.on('connect')
def socket_connect():
    print(f'i got a connection from {request.sid}!')

@socketio.on('disconnect')
def socket_disconnect():
    if request.sid in game_state['players']:
        game_state['players'].pop(request.sid)
        updateGameState()

    if request.sid == game_state['controller']:
        game_state['controller'] = None

@socketio.on('event_create_new_player')
def event_create_new_player(json):
    new_player = {
        'id': secrets.token_hex(16),
        'name': json['name'],
        'score': 0,
    }
    game_state['players'][request.sid] = new_player
    updateGameState()
    emit('event_new_player_added_successfully', new_player, to=request.sid)

@socketio.on('event_control_game')
def event_control_game():
    game_state['controller'] = request.sid
    updateGameState()
    sleep(1)
    emit('event_controller_set_successfully', to=request.sid)

@socketio.on('event_start_game')
def event_start_game():
    game_state['started'] = True
    updateGameState()
    sleep(1)
    emit('event_game_start', broadcast=True)

@socketio.on('event_prompt_game_state')
def event_prompt_game_state():
    updateGameState()

@socketio.on('event_load_next_level')
def event_load_next_level():
    resetRound()
    sleep(1)
    game_state['level_countdown'] = 3
    updateGameState()
    sleep(1)
    game_state['level_countdown'] = 2
    updateGameState()
    sleep(1)
    game_state['level_countdown'] = 1
    updateGameState()
    sleep(1)
    game_state['level_countdown'] = 0
    setAcceptingAnswers(True)
    updateGameState()
    sleep(1)

@socketio.on('event_joke_submission')
def event_joke_submission(json):
    if not game_state['accepting_answers']:
        return
    setAcceptingAnswers(False)
    setShowingResults(False)
    updateGameState()
    sleep(3)
    setJoke(json['joke'], request.sid)
    setAcceptingVotes(True)
    updateGameState()
    beginVotingCountDown()

@socketio.on('event_vote_submission')
def event_vote_submission(json):
    if not game_state['accepting_votes']:
        return
    score = 'votes_yes' if json['good'] else 'votes_no'
    game_state[score] += 1
    emit('event_vote_submitted', { 'good': json['good'] }, broadcast=True)

@socketio.on('event_counting_complete')
def event_counting_complete():
    if game_state['votes_yes'] > game_state['votes_no']:
        roundWin()
    else:
        roundLose()
    pass

@socketio.on('event_restart_game')
def event_restart_game():
    game_state = initializeGameState()
    updateGameState()
    emit('event_restarting', broadcast=True)

def updateGameState():
    emit('event_game_state_update', game_state, broadcast=True)

def getNewWord():
    game_state['current_word'] = random.choice(words)

def setAcceptingAnswers(isAccepting):
    game_state['accepting_answers'] = isAccepting

def setAcceptingVotes(isAccepting):
    game_state['accepting_votes'] = isAccepting

def setShowingResults(showing):
    game_state['showing_results'] = showing

def setJoke(joke, id):
    game_state['current_joke'] = joke
    game_state['current_joke_player'] = id

def beginVotingCountDown():
    game_state['votes_yes'] = 0
    game_state['votes_no'] = 0
    game_state['voting_countdown'] = 16
    while game_state['voting_countdown'] > 0:
        game_state['voting_countdown'] -= 1
        updateGameState()
        sleep(1)
    setShowingResults(True)
    setAcceptingVotes(False)
    updateGameState()
    sleep(2)
    emit('event_count_results', broadcast=True)
    sleep(1)
    
def roundWin():
    game_state['players'][game_state['current_joke_player']]['score'] += calculateVoteDifference()
    sortPlayers()
    updateGameState()
    emit('event_round_win', { 'player': game_state['players'][game_state['current_joke_player']] }, broadcast=True)
    sleep(5)
    emit('event_show_scores')
    clearJokes()
    pass

def roundLose():
    game_state['players'][game_state['current_joke_player']]['score'] += calculateVoteDifference()
    sortPlayers()
    updateGameState()
    emit('event_round_lose', { 'player': game_state['players'][game_state['current_joke_player']] }, broadcast=True)
    sleep(5)
    continueRound()
    pass

def calculateVoteDifference():
    sortPlayers()
    return game_state['votes_yes'] - game_state['votes_no']

def continueRound():
    setAcceptingAnswers(True)
    setAcceptingVotes(False)
    clearJokes()
    updateGameState()

def clearJokes():
    game_state['current_joke'] = None
    game_state['current_joke_player'] = None

def resetRound():
    game_state['level_countdown'] = 4
    # update new stuff here
    getNewWord()
    setAcceptingVotes(False)
    setAcceptingAnswers(False)
    setShowingResults(False)
    updateGameState()

def sortPlayers():
    playersSorted = sorted([player for player in game_state['players'].values()], key=lambda x: x['score'], reverse=True)
    game_state['players_sorted'] = playersSorted

if __name__ == "__main__":
    socketio.run(app, host=config['FLASK_HOST'], port=config['FLASK_PORT'], debug=config['FLASK_DEBUG'])