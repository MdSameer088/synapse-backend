const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: process.env.PORT || 8080 });

const gridSize = 10;
const grid = generateGrid(gridSize);
let score = 0;
const foundWords = new Set();

// A simple dictionary for word validation
const dictionary = new Set([
    'apple', 'baker', 'candy', 'dogma', 'eagle', 'fable', 'grape', 'house', 'igloo', 'jolly',
    'kites', 'lemon', 'mango', 'night', 'ocean', 'piano', 'queen', 'river', 'sugar', 'table',
    'unity', 'vivid', 'water', 'xerox', 'yacht', 'zebra', 'above', 'below', 'climb', 'dream',
    'early', 'flame', 'giant', 'happy', 'ideal', 'jumps', 'known', 'light', 'magic', 'noble',
    'opens', 'proud', 'quiet', 'reads', 'sings', 'takes', 'under', 'value', 'wears', 'young',
    'about', 'after', 'again', 'along', 'among', 'anger', 'apart', 'begin', 'board', 'books',
    'bring', 'build', 'carry', 'catch', 'chair', 'clean', 'clear', 'close', 'comes', 'cover',
    'cross', 'dance', 'darkn', 'doors', 'doubt', 'downw', 'draws', 'drive', 'eager', 'earth',
    'eight', 'empty', 'enjoy', 'enter', 'equal', 'every', 'exact', 'exist', 'extra', 'faith',
    'falls', 'farms', 'fastn', 'fears', 'feels', 'field', 'fight', 'fills', 'final', 'finds',
    'first', 'fixed', 'flags', 'floor', 'flows', 'folks', 'force', 'forms', 'forth', 'found',
    'frame', 'fresh', 'front', 'fruit', 'fully', 'gains', 'games', 'gives', 'glass', 'going',
    'goods', 'grace', 'grand', 'grass', 'great', 'green', 'grows', 'guess', 'guide', 'hands',
    'hardy', 'hates', 'heads', 'hears', 'heart', 'heavy', 'helps', 'hence', 'hides', 'highs',
    'holds', 'holes', 'homes', 'hopes', 'horse', 'hours', 'house', 'human', 'hurry', 'ideas',
    'image', 'imply', 'index', 'inner', 'input', 'issue', 'joins', 'joint', 'judge', 'keeps',
    'kicks', 'kinds', 'knots', 'knows', 'labor', 'lands', 'large', 'lasts', 'later', 'laugh',
    'leads', 'learn', 'least', 'leave', 'legal', 'level', 'lifts', 'light', 'limit', 'lines',
    'links', 'lists', 'lives', 'loads', 'local', 'logic', 'longs', 'looks', 'loses', 'loved',
    'lower', 'lucky', 'magic', 'major', 'makes', 'manag', 'march', 'marks', 'match', 'means',
    'meets', 'might', 'miles', 'minds', 'minor', 'minus', 'model', 'money', 'month', 'moral',
    'moves', 'music', 'needs', 'never', 'newsr', 'night', 'noise', 'north', 'notes', 'novel',
    'nurse', 'often', 'older', 'order', 'other', 'ought', 'outer', 'owner', 'pages', 'paint',
    'pairs', 'panel', 'paper', 'parts', 'party', 'passi', 'paths', 'peace', 'perio', 'picks',
    'piece', 'place', 'plain', 'plane', 'plant', 'plays', 'point', 'ports', 'power', 'press',
    'price', 'print', 'prior', 'priva', 'proof', 'pulls', 'purel', 'pushi', 'quick', 'quite',
    'radio', 'raise', 'range', 'rates', 'reach', 'reads', 'ready', 'refer', 'relax', 'reply',
    'repor', 'rests', 'right', 'rings', 'rises', 'risks', 'river', 'roads', 'rocks', 'roles',
    'rolls', 'rooms', 'round', 'rules', 'rural', 'sales', 'sames', 'scale', 'scene', 'scope',
    'score', 'seeks', 'seems', 'sells', 'sends', 'sense', 'serve', 'seven', 'shall', 'shape',
    'share', 'sharp', 'sheet', 'shelf', 'shell', 'shift', 'shine', 'ships', 'shirt', 'shock',
    'shoot', 'short', 'shown', 'shows', 'sides', 'sight', 'signs', 'silly', 'since', 'sings',
    'sites', 'sixth', 'sizes', 'skill', 'skins', 'sleep', 'slide', 'small', 'smell', 'smile',
    'smoke', 'solid', 'solve', 'songs', 'soonr', 'sorry', 'sorts', 'sound', 'south', 'space',
    'speak', 'speed', 'spend', 'spent', 'split', 'spoke', 'sport', 'spots', 'stand', 'stars',
    'start', 'state', 'stays', 'steps', 'stick', 'still', 'stock', 'stone', 'stood', 'stops',
    'store', 'storm', 'story', 'strip', 'stuck', 'study', 'stuff', 'style', 'sugar', 'suits',
    'sunny', 'super', 'surel', 'takes', 'talks', 'tells', 'terms', 'tests', 'thank', 'their',
    'theme', 'there', 'these', 'thick', 'thing', 'think', 'third', 'those', 'three', 'throw',
    'tight', 'times', 'tired', 'today', 'token', 'tones', 'tools', 'total', 'touch', 'tours',
    'towns', 'track', 'trade', 'train', 'treat', 'trees', 'trial', 'truly', 'trust', 'truth',
    'turns', 'twice', 'types', 'under', 'union', 'units', 'until', 'upper', 'upset', 'urban',
    'usage', 'usual', 'value', 'video', 'views', 'visit', 'voice', 'voted', 'waits', 'walks',
    'walls', 'wants', 'watch', 'water', 'wears', 'weeks', 'weigh', 'weird', 'wells', 'wests',
    'whole', 'whose', 'wider', 'wildl', 'wills', 'winds', 'wings', 'wipes', 'wires', 'wishe',
    'woman', 'wonde', 'words', 'works', 'world', 'worry', 'worse', 'worth', 'would', 'wound',
    'write', 'wrong', 'wrote', 'years', 'yield', 'young', 'yours', 'youth', 'zeros', 'zones'
]);

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
                grid = generateGrid(gridSize); // Regenerate grid on successful word submission
                broadcastState();
            }
        }
    });
});

console.log('WebSocket server started on port 8080');
