const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

// Game state
let players = {}; // Store ws connection by username
let grid = [];
let foundWords = new Set();
let scoreboard = {};
let gameInProgress = false;
let gameTimer = 100;
let timerInterval;

// Smaller, more common word list for 7x7 grid
const wordList = new Set([
    'cat', 'dog', 'sun', 'run', 'fun', 'big', 'red', 'blue', 'tree', 'fish',
    'bird', 'moon', 'star', 'play', 'jump', 'sing', 'read', 'book', 'door', 'open',
    'close', 'hand', 'foot', 'head', 'eyes', 'nose', 'mouth', 'ears', 'hair', 'walk',
    'talk', 'love', 'like', 'good', 'bad', 'happy', 'sad', 'cold', 'hot', 'warm',
    'cool', 'fast', 'slow', 'loud', 'soft', 'dark', 'light', 'true', 'false', 'yes',
    'no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
    'ten', 'zero', 'home', 'work', 'city', 'town', 'park', 'road', 'path', 'way',
    'time', 'day', 'night', 'week', 'year', 'hour', 'minute', 'second', 'water', 'fire',
    'wind', 'earth', 'food', 'eat', 'drink', 'sleep', 'dream', 'wake', 'live', 'die',
    'life', 'death', 'hope', 'fear', 'brave', 'kind', 'mean', 'help', 'give', 'take',
    'make', 'do', 'go', 'come', 'see', 'look', 'find', 'lose', 'win', 'game',
    'team', 'ball', 'sport', 'score', 'point', 'start', 'end', 'new', 'old', 'young',
    'grow', 'fall', 'rise', 'sit', 'stand', 'run', 'walk', 'fly', 'swim', 'drive',
    'ride', 'ship', 'boat', 'car', 'bus', 'train', 'plane', 'bike', 'road', 'street',
    'house', 'room', 'bed', 'chair', 'table', 'desk', 'lamp', 'book', 'pen', 'paper',
    'write', 'read', 'learn', 'teach', 'study', 'school', 'class', 'test', 'exam', 'grade',
    'pass', 'fail', 'work', 'job', 'boss', 'money', 'pay', 'earn', 'spend', 'save',
    'bank', 'cash', 'card', 'shop', 'buy', 'sell', 'cost', 'price', 'sale', 'deal',
    'free', 'busy', 'wait', 'hurry', 'slow', 'fast', 'quick', 'late', 'early', 'soon',
    'now', 'then', 'here', 'there', 'where', 'when', 'why', 'how', 'what', 'who',
    'which', 'this', 'that', 'these', 'those', 'them', 'us', 'me', 'you', 'he',
    'she', 'it', 'we', 'they', 'my', 'your', 'his', 'her', 'its', 'our', 'their',
    'mine', 'yours', 'hers', 'ours', 'theirs', 'and', 'but', 'or', 'nor', 'for',
    'yet', 'so', 'if', 'then', 'else', 'when', 'where', 'why', 'how', 'what',
    'who', 'whom', 'whose', 'which', 'that', 'this', 'these', 'those', 'am', 'is',
    'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do',
    'does', 'did', 'can', 'could', 'will', 'would', 'shall', 'should', 'may', 'might',
    'must', 'of', 'to', 'in', 'on', 'at', 'by', 'with', 'from', 'up',
    'down', 'out', 'in', 'off', 'on', 'over', 'under', 'about', 'above', 'across',
    'after', 'against', 'along', 'among', 'around', 'as', 'at', 'before', 'behind', 'below',
    'beneath', 'beside', 'between', 'beyond', 'but', 'by', 'concerning', 'despite', 'down', 'during',
    'except', 'for', 'from', 'in', 'inside', 'into', 'like', 'near', 'of', 'off',
    'on', 'onto', 'out', 'outside', 'over', 'past', 'regarding', 'since', 'through', 'throughout',
    'to', 'toward', 'under', 'underneath', 'until', 'up', 'upon', 'with', 'within', 'without'
]);

function broadcast(message) {
    const data = JSON.stringify(message);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
}

wss.on('connection', ws => {
    let username; // Use a local variable to track the username for this connection

    ws.on('message', message => {
        const data = JSON.parse(message);

        switch (data.type) {
            case 'join':
                username = data.username;
                players[username] = ws;
                scoreboard[username] = 0;

                broadcast({ type: 'userList', users: Object.keys(players) });

                if (gameInProgress) {
                    // If game is in progress, send the current state to the new player
                    ws.send(JSON.stringify({ type: 'gameStart', grid }));
                    ws.send(JSON.stringify({ type: 'timer', time: gameTimer }));
                    ws.send(JSON.stringify({ type: 'scoreboard', scoreboard }));
                    ws.send(JSON.stringify({ type: 'foundWords', words: [...foundWords] }));
                    ws.send(JSON.stringify({ type: 'remainingWords', words: [...getRemainingWords()] }));
                } else if (Object.keys(players).length >= 1) {
                    // If they are the first player, start the game
                    startGame();
                }
                break;

            case 'submitWord':
                if (gameInProgress && username) {
                    const { word } = data;
                    if (isValidWord(word) && !foundWords.has(word)) {
                        foundWords.add(word);
                        scoreboard[username] += word.length;
                        broadcast({ type: 'wordFound', word, player: username });
                        broadcast({ type: 'scoreboard', scoreboard });
                        broadcast({ type: 'remainingWords', words: [...getRemainingWords()] });
                    } else {
                        ws.send(JSON.stringify({ type: 'error', message: 'Invalid or already found word.' }));
                    }
                }
                break;
        }
    });

    ws.on('close', () => {
        if (username) {
            delete players[username];
            // Don't remove from scoreboard, so they can see their final score
            broadcast({ type: 'userList', users: Object.keys(players) });

            if (Object.keys(players).length === 0 && gameInProgress) {
                // If all players leave, end the game
                endGame(true);
            }
        }
    });
});

function startGame() {
    gameInProgress = true;
    grid = generateGrid(7, 7);
    foundWords.clear();
    gameTimer = 100;

    // Reset scores for all known players
    for (const user in scoreboard) {
        scoreboard[user] = 0;
    }

    broadcast({ type: 'gameStart', grid });
    broadcast({ type: 'scoreboard', scoreboard });
    broadcast({ type: 'remainingWords', words: [...getRemainingWords()] });

    timerInterval = setInterval(() => {
        gameTimer--;
        broadcast({ type: 'timer', time: gameTimer });
        if (gameTimer <= 0) {
            endGame();
        }
    }, 1000);
}

function endGame(force = false) {
    clearInterval(timerInterval);
    gameInProgress = false;
    if (!force) {
        broadcast({ type: 'gameOver', scoreboard });
    }
    // Reset for next game
    scoreboard = {};
    players = {};
}

function generateGrid(rows, cols) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let newGrid = Array(rows).fill(0).map(() => Array(cols).fill(''));

    // Sort wordList by length in descending order to prioritize longer words
    const sortedWordList = Array.from(wordList).sort((a, b) => b.length - a.length);

    const directions = [
        [0, 1], [1, 0], [0, -1], [-1, 0], // Horizontal and Vertical
        [1, 1], [1, -1], [-1, 1], [-1, -1] // Diagonal
    ];

    // Attempt to place each word from the sorted list
    sortedWordList.forEach(word => {
        const wordUpper = word.toUpperCase();
        let placed = false;
        let attempts = 0;
        while (!placed && attempts < 100) { // Limit attempts per word
            const startRow = Math.floor(Math.random() * rows);
            const startCol = Math.floor(Math.random() * cols);
            const directionIndex = Math.floor(Math.random() * 8);
            const [dr, dc] = directions[directionIndex];

            let canPlace = true;
            let tempGrid = JSON.parse(JSON.stringify(newGrid)); // Deep copy

            for (let k = 0; k < wordUpper.length; k++) {
                const r = startRow + k * dr;
                const c = startCol + k * dc;

                if (r < 0 || r >= rows || c < 0 || c >= cols || (tempGrid[r][c] !== '' && tempGrid[r][c] !== wordUpper[k])) {
                    canPlace = false;
                    break;
                }
                tempGrid[r][c] = wordUpper[k];
            }

            if (canPlace) {
                newGrid = tempGrid;
                placed = true;
            }
            attempts++;
        }
    });

    // Fill remaining empty cells with random letters
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            if (newGrid[i][j] === '') {
                newGrid[i][j] = alphabet[Math.floor(Math.random() * alphabet.length)];
            }
        }
    }
    return newGrid;
}

function isValidWord(word) {
    return wordList.has(word.toLowerCase()) && findWordInGrid(word.toUpperCase());
}

function findWordInGrid(word) {
    for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length; c++) {
            if (search(word, r, c)) {
                return true;
            }
        }
    }
    return false;
}

function search(word, row, col) {
    const directions = [
        [0, 1], [1, 0], [0, -1], [-1, 0],
        [1, 1], [1, -1], [-1, 1], [-1, -1]
    ];

    if (grid[row][col] !== word[0]) {
        return false;
    }

    for (const [dr, dc] of directions) {
        let r = row;
        let c = col;
        let found = true;
        for (let i = 0; i < word.length; i++) {
            if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length || grid[r][c] !== word[i]) {
                found = false;
                break;
            }
            r += dr;
            c += dc;
        }
        if (found) {
            return true;
        }
    }
    return false;
}

function getRemainingWords() {
    return new Set([...wordList].filter(word => !foundWords.has(word)));
}

console.log('WebSocket server started on port 8080');
