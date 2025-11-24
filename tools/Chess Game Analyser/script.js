$(document).ready(function() {
    
    // --- CORE OBJECTS ---
    var game = new Chess();
    var board = null; // Chessboard.js object
    var stockfish = new Worker('stockfish.js'); 

    // --- HISTORY STATE VARIABLES (CRITICAL for Forward/Back) ---
    var historyFens = [game.fen()]; 
    var historyPointer = 0;        
    var gameHistoryMoves = [];     
    // --------------------------------------------------------------

    // --- CACHED DOM ELEMENTS ---
    var $bestMove = $('#best-move');
    var $evaluation = $('#evaluation');
    var $evalFill = $('#eval-fill');
    var $moveList = $('#move-list'); 
    var $pgnInput = $('#pgn-input');
    var $depthInput = $('#depth-input');
    var $gameState = $('#game-state');

    // --- HELPER FUNCTIONS ---

    // Rebuilds the game history on the main 'game' object up to the current pointer
    function rebuildHistoryFromPointer() {
        game.reset(); 
        
        let movesToReplay = gameHistoryMoves.slice(0, historyPointer);
        
        movesToReplay.forEach(move => {
            game.move(move); 
        });

        updateUI();
        runStockfishAnalysis();
    }
    
    // --- STOCKFISH SETUP (UCI Protocol) ---
    stockfish.onmessage = function (event) {
        var line = event.data;
        
        if (line.startsWith('bestmove')) {
            var parts = line.split(' ');
            var move = parts[1];
            $bestMove.text(move).removeClass().addClass('symbol excellent');
            
        } 
        else if (line.startsWith('info depth')) {
            var parts = line.split(' ');
            var scoreIndex = parts.indexOf('score');
            
            if (scoreIndex === -1) return;

            var scoreType = parts[scoreIndex + 1];
            var scoreValue = parseInt(parts[scoreIndex + 2]);
            
            var evalText = '';
            var score = 0; 

            if (scoreType === 'cp') {
                score = scoreValue;
                var evaluation = score / 100;
                evalText = (evaluation > 0 ? "+" : "") + evaluation.toFixed(2);
            } else if (scoreType === 'mate') {
                var mateIn = scoreValue;
                evalText = "M" + (mateIn > 0 ? "+" : "") + mateIn;
                score = mateIn > 0 ? 10000 : -10000;
            }

            $evaluation.text(evalText).removeClass().addClass('symbol');
            updateEvalBar(score);
        }
    };

    stockfish.onerror = function(e) {
        console.error("Stockfish Worker Error: ", e);
        $evaluation.text('Engine Error').removeClass().addClass('symbol blunder');
    };

    stockfish.postMessage('uci');
    stockfish.postMessage('isready');

    // --- BOARD & GAME FUNCTIONS ---
    
    function onDrop (source, target) {
        var move = game.move({
            from: source,
            to: target,
            promotion: 'q' // always promote to a queen
        });

        if (move === null) return 'snapback';

        // --- HISTORY MANAGEMENT ---
        if (historyPointer < historyFens.length - 1) {
            historyFens.length = historyPointer + 1; 
            gameHistoryMoves.length = historyPointer; 
        }

        historyFens.push(game.fen());
        historyPointer = historyFens.length - 1; 
        gameHistoryMoves.push(move.san); 
        // --------------------------
        
        updateUI(); 
        
        window.setTimeout(board.position, 50, game.fen()); 
        
        runStockfishAnalysis();
    }

    function onSnapEnd () {
        board.position(game.fen());
    }

    function updateUI() {
        board.position(game.fen());

        $('#turn-info').text(game.turn() === 'w' ? 'White' : 'Black');
        $('#check-info').text(game.in_check() ? 'Yes' : 'No');
        updateGameStateText();

        $pgnInput.val(game.pgn());
        renderMoveList();
        
        $bestMove.text('...').removeClass().addClass('symbol');
        $evaluation.text('...').removeClass().addClass('symbol');
    }

    function updateGameStateText() {
        if (game.in_checkmate()) {
            $gameState.text('Checkmate!').removeClass().addClass('symbol blunder');
        } else if (game.game_over()) {
             $gameState.text('Draw').removeClass().addClass('symbol muted');
        } else {
            $gameState.text('Ongoing').removeClass().addClass('symbol excellent');
        }
    }

    // FINAL RENDER MOVELIST: Uses SAN notation and Annotation placeholders
    function renderMoveList() {
        var history = game.history({ verbose: true }); 
        var html = '<table><thead><tr><th>#</th><th>White</th><th>Black</th></tr></thead><tbody>';
        
        // --- TEMPORARY ANNOTATION ASSIGNMENT (FOR VISUAL TEST ONLY) ---
        // This array assigns classes and text to move numbers for display:
        const annotations = {
            '1': { w: '!!', wClass: 'brilliance' }, 
            '2': { b: '!', bClass: 'good-move' }, 
            '3': { w: '?', wClass: 'mistake' }, 
            '4': { b: '??', bClass: 'blunder-move' } 
        };
        // -------------------------------------------------------------

        for (let i = 0; i < history.length; i += 2) {
            var moveNumber = Math.floor(i / 2) + 1;
            var whiteMoveObj = history[i];
            var blackMoveObj = history[i + 1];

            var whiteAnnotation = annotations[i + 1] ? annotations[i + 1].w : '';
            var whiteClass = annotations[i + 1] ? annotations[i + 1].wClass : '';

            var blackAnnotation = annotations[i + 2] ? annotations[i + 2].b : '';
            var blackClass = annotations[i + 2] ? annotations[i + 2].bClass : '';

            // CRITICAL FIX: Use only move.san, no extra piece icons
            var whiteMoveText = whiteMoveObj 
                ? `${whiteMoveObj.san} ${whiteAnnotation ? `<span class="annotation ${whiteClass}">${whiteAnnotation}</span>` : ''}` 
                : '';
            
            var blackMoveText = blackMoveObj 
                ? `${blackMoveObj.san} ${blackAnnotation ? `<span class="annotation ${blackClass}">${blackAnnotation}</span>` : ''}` 
                : '';

            html += `<tr><td>${moveNumber}.</td><td>${whiteMoveText}</td><td>${blackMoveText}</td></tr>`;
        }
        
        html += '</tbody></table>';
        $('#move-list').html(html); 
    }

    function updateEvalBar(centipawns) {
        var clampedCp = Math.max(-1000, Math.min(1000, centipawns));
        var normalized = clampedCp / 1000;
        var widthPercent = 50 + (normalized * 50);
        widthPercent = Math.max(0, Math.min(100, widthPercent));

        $evalFill.css('width', widthPercent + '%');
    }

    function runStockfishAnalysis() {
        stockfish.postMessage('stop');
        
        if (game.game_over() || historyPointer !== historyFens.length - 1) {
            $bestMove.text('N/A');
            $evaluation.text('Game Over / Browsing History');
            updateEvalBar(0);
            return;
        }
        
        var depth = parseInt($depthInput.val()) || 18;
        
        $bestMove.text('Analyzing...');
        $evaluation.text('Analyzing...');
        
        stockfish.postMessage('position fen ' + game.fen());
        stockfish.postMessage('go depth ' + depth);
    }


    // --- INITIALIZATION ---
    
    var config = {
      draggable: true,
      position: 'start',
      onDrop: onDrop,
      onSnapEnd: onSnapEnd
    };
    
    board = Chessboard('board', config); 

    updateUI();
    setTimeout(runStockfishAnalysis, 1000); 

    // --- EVENT LISTENERS ---

    $('#reset-btn').on('click', function() { 
        game.reset(); 
        historyFens = [game.fen()]; 
        historyPointer = 0;
        gameHistoryMoves = [];
        updateUI(); 
        runStockfishAnalysis(); 
    });

    $('#prev-btn').on('click', function() {
        if (historyPointer > 0) {
            historyPointer--;
            rebuildHistoryFromPointer(); 
        } else {
            stockfish.postMessage('stop');
        }
    });

    $('#next-btn').on('click', function() {
        if (historyPointer < historyFens.length - 1) {
            historyPointer++;
            rebuildHistoryFromPointer(); 
        } else {
            stockfish.postMessage('stop');
        }
    });

    $('#load-pgn-btn').on('click', function() {
        var pgn = $pgnInput.val();
        
        var tempGame = new Chess();
        if (!tempGame.load_pgn(pgn)) {
            alert('Invalid PGN format!'); 
            return;
        }
        var moves = tempGame.history(); 

        game.reset(); 
        historyFens = [game.fen()]; 
        historyPointer = 0;
        gameHistoryMoves = []; 

        moves.forEach(move => {
            game.move(move); 
            historyFens.push(game.fen());
            gameHistoryMoves.push(move);
            historyPointer++; 
        });
        
        updateUI(); 
        runStockfishAnalysis(); 
    });

    $('#set-fen-btn').on('click', function() {
        var fen = prompt("Enter FEN to load:", game.fen());
        if (fen && game.load(fen)) { 
            historyFens = [game.fen()]; 
            historyPointer = 0;
            gameHistoryMoves = []; 
            updateUI(); 
            runStockfishAnalysis(); 
        } else if (fen) { 
            alert('Invalid FEN format!'); 
        }
    });

    $('#analyze-btn').on('click', function() { runStockfishAnalysis(); });

    $('#copy-fen-btn').on('click', function() {
        navigator.clipboard.writeText(game.fen());
        alert('Current FEN copied to clipboard!');
    });

    $depthInput.on('change', function() { runStockfishAnalysis(); });
});