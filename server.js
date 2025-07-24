const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: process.env.PORT || 8080 });

// Game state
let gameGrid = [];
let score = 0;
let foundWords = new Set();
let embeddedWords = new Set(); // Words actually placed in the grid
let timeLeft = 60; // seconds
let gameActive = false;
let players = {}; // To store connected players and their scores/found words
let timerInterval;

const gridSize = 5; // 5x5 grid

// A simple dictionary for word validation (expand as needed)
const dictionary = new Set([
    'a', 'ability', 'able', 'about', 'above', 'accept', 'according', 'account', 'across', 'act',
    'action', 'activity', 'actually', 'add', 'address', 'administration', 'admit', 'adult', 'affect', 'after',
    'again', 'against', 'age', 'agency', 'agent', 'ago', 'agree', 'agreement', 'ahead', 'air',
    'all', 'allow', 'almost', 'alone', 'along', 'already', 'also', 'although', 'always', 'american',
    'among', 'amount', 'analysis', 'and', 'animal', 'another', 'answer', 'any', 'anyone', 'anything',
    'appear', 'apply', 'approach', 'area', 'argue', 'arm', 'around', 'arrive', 'art', 'article',
    'as', 'ask', 'assume', 'at', 'attention', 'author', 'authority', 'available', 'avoid', 'away',
    'baby', 'back', 'bad', 'ball', 'bank', 'bar', 'base', 'be', 'beat', 'beautiful',
    'because', 'become', 'bed', 'before', 'begin', 'behavior', 'behind', 'believe', 'benefit', 'best',
    'better', 'between', 'beyond', 'big', 'bill', 'billion', 'bit', 'black', 'blood', 'blue',
    'board', 'body', 'book', 'born', 'both', 'box', 'boy', 'break', 'bring', 'brother',
    'budget', 'build', 'building', 'business', 'but', 'buy', 'by', 'call', 'camera', 'campaign',
    'can', 'cancer', 'candidate', 'capital', 'car', 'card', 'care', 'career', 'carry', 'case',
    'catch', 'cause', 'cell', 'center', 'central', 'century', 'certain', 'certainly', 'chair', 'challenge',
    'chance', 'change', 'character', 'charge', 'check', 'child', 'choice', 'choose', 'church', 'citizen',
    'city', 'civil', 'claim', 'class', 'clear', 'clearly', 'close', 'coach', 'cold', 'collection',
    'college', 'color', 'come', 'commercial', 'common', 'community', 'company', 'compare', 'computer', 'concern',
    'condition', 'conference', 'congress', 'consider', 'consumer', 'contain', 'continue', 'control', 'cost', 'could',
    'country', 'couple', 'course', 'court', 'cover', 'create', 'crime', 'cultural', 'culture', 'cup',
    'current', 'customer', 'cut', 'dark', 'data', 'daughter', 'day', 'dead', 'deal', 'death',
    'debate', 'decade', 'decide', 'decision', 'deep', 'defense', 'degree', 'democrat', 'democratic', 'describe',
    'design', 'despite', 'detail', 'determine', 'develop', 'development', 'die', 'difference', 'different', 'difficult',
    'dinner', 'direction', 'director', 'discover', 'discuss', 'discussion', 'disease', 'do', 'doctor', 'dog',
    'door', 'down', 'draw', 'dream', 'drive', 'drop', 'drug', 'during', 'each', 'early',
    'east', 'easy', 'eat', 'economic', 'economy', 'edge', 'education', 'effect', 'effective', 'effectively',
    'effort', 'eight', 'either', 'election', 'else', 'employee', 'end', 'energy', 'enjoy', 'enough',
    'enter', 'entire', 'environment', 'environmental', 'especially', 'establish', 'even', 'evening', 'event', 'ever',
    'every', 'everybody', 'everyone', 'everything', 'evidence', 'exactly', 'example', 'executive', 'exist', 'expect',
    'experience', 'expert', 'explain', 'eye', 'face', 'fact', 'factor', 'fail', 'fall', 'family',
    'far', 'fast', 'father', 'fear', 'federal', 'feel', 'feeling', 'few', 'field', 'fight',
    'figure', 'fill', 'film', 'final', 'finally', 'financial', 'find', 'fine', 'finger', 'finish',
    'fire', 'firm', 'first', 'fish', 'five', 'floor', 'fly', 'focus', 'follow', 'food',
    'foot', 'for', 'force', 'foreign', 'forget', 'form', 'former', 'forward', 'four', 'free',
    'friend', 'from', 'front', 'full', 'fund', 'future', 'game', 'garden', 'gas', 'general',
    'generation', 'get', 'girl', 'give', 'glass', 'go', 'goal', 'good', 'government', 'great',
    'green', 'ground', 'group', 'grow', 'growth', 'guess', 'gun', 'guy', 'hair', 'half',
    'hand', 'hang', 'happen', 'happy', 'hard', 'have', 'he', 'head', 'health', 'hear',
    'heart', 'heat', 'heavy', 'help', 'her', 'here', 'herself', 'high', 'him', 'himself',
    'his', 'history', 'hit', 'hold', 'home', 'hope', 'hospital', 'hot', 'hour', 'how',
    'however', 'huge', 'human', 'hundred', 'husband', 'i', 'idea', 'identify', 'if', 'image',
    'imagine', 'impact', 'important', 'improve', 'in', 'include', 'including', 'increase', 'indeed', 'indicate',
    'individual', 'industry', 'information', 'inside', 'instead', 'institution', 'interest', 'international', 'into', 'introduce',
    'investment', 'involve', 'issue', 'it', 'item', 'its', 'itself', 'job', 'join', 'just',
    'keep', 'key', 'kid', 'kill', 'kind', 'kitchen', 'know', 'knowledge', 'land', 'language',
    'large', 'last', 'late', 'later', 'laugh', 'law', 'lawyer', 'lay', 'lead', 'leader',
    'learn', 'least', 'leave', 'left', 'leg', 'legal', 'less', 'let', 'letter', 'level',
    'light', 'like', 'likely', 'line', 'list', 'listen', 'little', 'live', 'local', 'long',
    'look', 'lose', 'loss', 'lot', 'love', 'low', 'machine', 'magazine', 'main', 'maintain',
    'major', 'majority', 'make', 'man', 'manage', 'management', 'manager', 'many', 'market', 'marketing',
    'marriage', 'material', 'matter', 'may', 'maybe', 'me', 'mean', 'measure', 'media', 'medical',
    'meet', 'meeting', 'member', 'memory', 'mention', 'message', 'method', 'middle', 'might', 'military',
    'million', 'mind', 'minute', 'miss', 'mission', 'model', 'modern', 'moment', 'money', 'month',
    'more', 'morning', 'most', 'mother', 'mouth', 'move', 'movement', 'movie', 'mr', 'mrs',
    'much', 'music', 'must', 'my', 'myself', 'name', 'nation', 'national', 'natural', 'nature',
    'near', 'nearly', 'necessary', 'need', 'network', 'never', 'new', 'news', 'next', 'nice',
    'night', 'no', 'none', 'nor', 'north', 'not', 'note', 'nothing', 'notice', 'now',
    "n't", 'number', 'occur', 'of', 'off', 'offer', 'office', 'officer', 'official', 'often',
    'oh', 'oil', 'ok', 'old', 'on', 'once', 'one', 'only', 'onto', 'open',
    'operation', 'opportunity', 'option', 'or', 'order', 'organization', 'other', 'others', 'our', 'out',
    'outside', 'over', 'own', 'owner', 'page', 'pain', 'paint', 'paper', 'parent', 'park',
    'part', 'participant', 'particular', 'particularly', 'partner', 'party', 'pass', 'past', 'patient', 'pattern',
    'pay', 'peace', 'people', 'per', 'perform', 'performance', 'perhaps', 'period', 'person', 'personal',
    'phone', 'physical', 'pick', 'picture', 'piece', 'place', 'plan', 'plant', 'play', 'player',
    'point', 'police', 'policy', 'political', 'politics', 'poor', 'popular', 'population', 'position', 'positive',
    'possible', 'power', 'practice', 'prepare', 'present', 'president', 'pressure', 'pretty', 'prevent', 'price',
    'private', 'probably', 'problem', 'process', 'produce', 'product', 'production', 'professional', 'professor', 'program',
    'project', 'property', 'protect', 'prove', 'provide', 'public', 'pull', 'purpose', 'push', 'put',
    'quality', 'question', 'quickly', 'quite', 'race', 'radio', 'raise', 'range', 'rate', 'rather',
    'reach', 'read', 'ready', 'real', 'reality', 'realize', 'really', 'reason', 'receive', 'recent',
    'recently', 'recognize', 'record', 'red', 'reduce', 'reflect', 'region', 'relate', 'relationship', 'religious',
    'remain', 'remember', 'remove', 'report', 'represent', 'republican', 'require', 'research', 'resource', 'respond',
    'response', 'responsibility', 'rest', 'result', 'return', 'reveal', 'rich', 'right', 'rise', 'risk',
    'road', 'rock', 'role', 'room', 'rule', 'run', 'safe', 'same', 'save', 'say',
    'scale', 'scene', 'school', 'science', 'scientist', 'score', 'sea', 'season', 'seat', 'second',
    'section', 'security', 'see', 'seek', 'seem', 'sell', 'send', 'senior', 'sense', 'series',
    'serious', 'serve', 'service', 'set', 'seven', 'shall', 'shape', 'share', 'she', 'shoot',
    'short', 'should', 'shoulder', 'show', 'side', 'sign', 'significant', 'similar', 'simple', 'simply',
    'since', 'sing', 'single', 'sister', 'sit', 'site', 'situation', 'six', 'size',
    'skill', 'skin', 'small', 'smile', 'so', 'social', 'society', 'soldier', 'some', 'somebody',
    'someone', 'something', 'sometimes', 'son', 'song', 'soon', 'sort', 'sound', 'source', 'south',
    'southern', 'space', 'speak', 'special', 'specific', 'speech', 'spend', 'sport', 'spring', 'staff',
    'stage', 'stand', 'standard', 'star', 'start', 'state', 'statement', 'station', 'stay', 'step',
    'still', 'stock', 'stop', 'store', 'story', 'strategy', 'street', 'strong', 'structure', 'student',
    'study', 'stuff', 'style', 'subject', 'success', 'successful', 'such', 'suddenly', 'suffer', 'suggest',
    'summer', 'support', 'sure', 'surface', 'system', 'table', 'take', 'talk', 'task', 'tax',
    'teach', 'teacher', 'team', 'technology', 'television', 'tell', 'ten', 'tend', 'term', 'test',
    'than', 'thank', 'that', 'the', 'their', 'them', 'themselves', 'then', 'theory', 'there',
    'therefore', 'these', 'they', 'thing', 'think', 'third', 'this', 'those', 'though', 'thought',
    'thousand', 'three', 'through', 'throughout', 'throw', 'thus', 'time', 'to', 'today', 'together',
    'tonight', 'too', 'top', 'total', 'tough', 'toward', 'town', 'trade', 'traditional', 'training',
    'travel', 'treat', 'treatment', 'tree', 'trial', 'trip', 'trouble', 'true', 'truth', 'try',
    'turn', 'tv', 'two', 'type', 'under', 'understand', 'unit', 'until', 'up', 'upon',
    'us', 'use', 'usually', 'value', 'various', 'very', 'victim', 'view', 'violence', 'visit',
    'voice', 'vote', 'wait', 'walk', 'wall', 'want', 'war', 'watch', 'water', 'way',
    'we', 'weapon', 'wear', 'week', 'weight', 'well', 'west', 'western', 'what', 'whatever',
    'when', 'where', 'whether', 'which', 'while', 'white', 'who', 'whole', 'whom', 'whose',
    'why', 'wide', 'wife', 'will', 'win', 'wind', 'window', 'wish', 'with', 'within',
    'without', 'woman', 'wonder', 'word', 'work', 'worker', 'world', 'worry', 'worse', 'worth', 'would', 'wound',
    'write', 'writer', 'wrong', 'wrote', 'yard', 'yeah', 'year', 'yes', 'yet', 'you', 'young',
    'your', 'yourself'
]);

// Helper function to broadcast messages to all connected clients
function broadcast(message) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}

// Game functions (to be implemented)
function generateGrid(size) {
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    const newGrid = Array(size).fill(null).map(() => Array(size).fill(''));
    const currentEmbeddedWords = new Set();

    const playableWords = Array.from(dictionary)
        .filter(word => word.length >= 3 && word.length <= size)
        .sort((a, b) => b.length - a.length);

    const wordsToAttemptEmbed = [];
    const numWordsToEmbed = Math.floor(Math.random() * 3) + 3; // 3 to 5 words
    for (let i = 0; i < numWordsToEmbed; i++) {
        if (playableWords.length === 0) break;
        wordsToAttemptEmbed.push(playableWords.shift());
    }

    wordsToAttemptEmbed.forEach(word => {
        let placed = false;
        let attempts = 0;
        while (!placed && attempts < 100) {
            const direction = Math.floor(Math.random() * 3); // 0: horizontal, 1: vertical, 2: diagonal
            const row = Math.floor(Math.random() * size);
            const col = Math.floor(Math.random() * size);

            if (canPlaceWord(newGrid, word, row, col, direction, size)) {
                placeWord(newGrid, word, row, col, direction);
                currentEmbeddedWords.add(word);
                placed = true;
            }
            attempts++;
        }
    });

    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            if (newGrid[i][j] === '') {
                newGrid[i][j] = letters[Math.floor(Math.random() * letters.length)];
            }
        }
    }
    return { grid: newGrid, embeddedWords: currentEmbeddedWords };
}

function canPlaceWord(grid, word, row, col, direction, size) {
    for (let i = 0; i < word.length; i++) {
        let r = row;
        let c = col;
        if (direction === 0) c += i;
        else if (direction === 1) r += i;
        else { r += i; c += i; }

        if (r >= size || c >= size || (grid[r][c] !== '' && grid[r][c] !== word[i])) {
            return false;
        }
    }
    return true;
}

function placeWord(grid, word, row, col, direction) {
    for (let i = 0; i < word.length; i++) {
        let r = row;
        let c = col;
        if (direction === 0) c += i;
        else if (direction === 1) r += i;
        else { r += i; c += i; }
        grid[r][c] = word[i];
    }
}

function startGame() {
    gameActive = true;
    score = 0;
    foundWords.clear();
    timeLeft = 60;
    const { grid, embeddedWords: newEmbeddedWords } = generateGrid(gridSize);
    gameGrid = grid;
    embeddedWords = newEmbeddedWords;

    // Start the timer
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft--;
        if (timeLeft <= 0) {
            endGame();
        }
        broadcast({ type: 'gameUpdate', payload: { score, foundWords: Array.from(foundWords), remainingWords: Array.from(embeddedWords), timeLeft, grid: gameGrid, players: Object.values(players) } });
    }, 1000);

    // Send initial game state to all clients
    broadcast({ type: 'initGame', payload: { initialGrid: gameGrid, initialScore: score, initialFoundWords: Array.from(foundWords), initialRemainingWords: Array.from(embeddedWords), initialTimeLeft: timeLeft } });
}

function endGame() {
    gameActive = false;
    clearInterval(timerInterval);
    broadcast({ type: 'gameOver' });
}

function validateWord(word) {
    return dictionary.has(word.toLowerCase()) && isWordInGrid(word, gameGrid);
}

function isWordInGrid(word, grid) {
    const rows = grid.length;
    const cols = grid[0].length;
    const wordLen = word.length;

    // Check horizontal, vertical, and diagonal
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            // Check horizontal
            if (c + wordLen <= cols) {
                let found = true;
                for (let k = 0; k < wordLen; k++) {
                    if (grid[r][c + k] !== word[k]) {
                        found = false;
                        break;
                    }
                }
                if (found) return true;
            }
            // Check vertical
            if (r + wordLen <= rows) {
                let found = true;
                for (let k = 0; k < wordLen; k++) {
                    if (grid[r + k][c] !== word[k]) {
                        found = false;
                        break;
                    }
                }
                if (found) return true;
            }
            // Check diagonal (down-right)
            if (r + wordLen <= rows && c + wordLen <= cols) {
                let found = true;
                for (let k = 0; k < wordLen; k++) {
                    if (grid[r + k][c + k] !== word[k]) {
                        found = false;
                        break;
                    }
                }
                if (found) return true;
            }
            // Check diagonal (up-right)
            if (r - wordLen + 1 >= 0 && c + wordLen <= cols) {
                let found = true;
                for (let k = 0; k < wordLen; k++) {
                    if (grid[r - k][c + k] !== word[k]) {
                        found = false;
                        break;
                    }
                }
                if (found) return true;
            }
        }
    }
    return false;
}



let nextPlayerId = 0;
wss.on('connection', ws => {
    ws.id = nextPlayerId++; // Assign a unique ID to each WebSocket connection
    players[ws.id] = { ws: ws, username: 'Guest', score: 0, foundWords: [] }; // Initialize player data

    console.log('Client connected');

    ws.on('message', message => {
        console.log(`Received message => ${message}`);
        const parsedMessage = JSON.parse(message);

        switch (parsedMessage.type) {
            case 'joinGame':
                const { username: joinUsername } = parsedMessage.payload;
                players[ws.id] = { username: joinUsername, score: 0, foundWords: [] };
                console.log(`${joinUsername} joined the game.`);
                // Optionally, send current game state to the newly joined player
                if (gameActive) {
                    ws.send(JSON.stringify({ type: 'initGame', payload: { initialGrid: gameGrid, initialScore: score, initialFoundWords: Array.from(foundWords), initialRemainingWords: Array.from(embeddedWords), initialTimeLeft: timeLeft } }));
                }
                break;
            case 'startGame':
                if (!gameActive) {
                    startGame();
                    console.log('Game started!');
                } else {
                    // If game is already active, send current state to the new player
                    ws.send(JSON.stringify({ type: 'initGame', payload: { initialGrid: gameGrid, initialScore: score, initialFoundWords: Array.from(foundWords), initialRemainingWords: Array.from(embeddedWords), initialTimeLeft: timeLeft } }));
                }
                break;
            case 'submitWord':
                const { word, username: submitUsername } = parsedMessage.payload;
                if (gameActive && validateWord(word) && !foundWords.has(word.toLowerCase())) {
                    foundWords.add(word.toLowerCase());
                    score += word.length;
                    players[ws.id].score += word.length;
                    players[ws.id].foundWords.push(word.toLowerCase());
                    broadcast({ type: 'wordFound', payload: { word: word.toLowerCase(), score, foundWords: Array.from(foundWords), players: Object.values(players) } });
                    console.log(`${submitUsername} found word: ${word}. Current score: ${score}`);
                } else {
                    ws.send(JSON.stringify({ type: 'error', payload: { message: 'Invalid or already found word!' } }));
                }
                break;
            // Add other message types as needed
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        // Remove player from active players
        for (const playerId in players) {
            if (players[playerId].ws === ws) {
                delete players[playerId];
                break;
            }
        }
        // Optionally, broadcast updated player list
    });

    ws.on('error', error => {
        console.error('WebSocket error:', error);
    });
});

console.log('WebSocket server started on port 8080');