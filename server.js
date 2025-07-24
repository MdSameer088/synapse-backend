const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: process.env.PORT || 8080 });

const gridSize = 10;
const grid = generateGrid(gridSize);
let score = 0;
const foundWords = new Set();

// A simple dictionary for word validation
const dictionary = new Set(['hello', 'world', 'javascript', 'html', 'css', 'web', 'socket', 'game', 'synapse', 'player', 'grid', 'word']);

function generateGrid(size) {
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    const newGrid = [];
    for (let i = 0; i < size; i++) {
        const row = [];
        for (let j = 0; j < size; j++) {
            row.push(letters[Math.floor(Math.random() * letters.length)]);
        }
        newGrid.push(row);
    }
    return newGrid;
}

function broadcast(data) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

function broadcastState() {
    broadcast({ type: 'grid', grid });
    broadcast({ type: 'score', score });
    broadcast({ type: 'foundWords', words: Array.from(foundWords) });
}

wss.on('connection', ws => {
    ws.send(JSON.stringify({ type: 'grid', grid }));
    ws.send(JSON.stringify({ type: 'score', score }));
    ws.send(JSON.stringify({ type: 'foundWords', words: Array.from(foundWords) }));

    ws.on('message', message => {
        const data = JSON.parse(message);

        if (data.type === 'submitWord') {
            const word = data.word;
            if (dictionary.has(word) && !foundWords.has(word)) {
                foundWords.add(word);
                score += word.length;
                broadcastState();
            }
        }
    });
});

console.log('WebSocket server started on port 8080');
