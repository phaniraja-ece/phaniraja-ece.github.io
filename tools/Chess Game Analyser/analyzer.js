/* global Chess */
(function () {
  // Stockfish setup
  let engine;
  function initEngine() {
    engine = new Worker(window.STOCKFISH_PATH);
    // UCI boot
    engine.postMessage('uci');
    engine.postMessage('setoption name MultiPV value 1');
  }

  // Engine request/response queue
  function analyseFen(fen, depth = 18, multipv = 1) {
    return new Promise((resolve) => {
      const lines = [];
      let bestScore = null;
      let bestMove = null;
      let pv = [];

      const onMessage = (e) => {
        const text = (typeof e.data === 'string') ? e.data : '';
        if (text.startsWith('info')) {
          // Parse score and pv from info lines
          // Examples: "info depth 20 seldepth 30 score cp 34 pv e2e4 e7e5 ..."
          // or: "info depth 20 score mate 3 pv ..."

          const scoreMatch = text.match(/score (cp|mate) (-?\d+)/);
          const pvMatch = text.match(/ pv ([a-h][1-8][a-h][1-8][qrbn]? .*)$/) || text.match(/ pv ([a-h][1-8][a-h][1-8][qrbn]?.*)$/);

          if (scoreMatch) {
            const kind = scoreMatch[1];
            const value = parseInt(scoreMatch[2], 10);
            let scoreCp = value;
            if (kind === 'mate') {
              scoreCp = value > 0 ? 10000 : -10000;
            }
            bestScore = scoreCp; // keep last (usually highest depth)
          }
          if (pvMatch) {
            pv = pvMatch[1].trim().split(/\s+/);
          }
        } else if (text.startsWith('bestmove')) {
          const moveMatch = text.match(/^bestmove\s([a-h][1-8][a-h][1-8][qrbn]?)/);
          if (moveMatch) bestMove = moveMatch[1];
          engine.removeEventListener('message', onMessage);
          resolve({ scoreCp: bestScore ?? 0, bestMove, pv, fen });
        }
      };

      engine.addEventListener('message', onMessage);
      engine.postMessage('ucinewgame');
      engine.postMessage(`position fen ${fen}`);
      engine.postMessage(`setoption name MultiPV value ${multipv}`);
      engine.postMessage(`go depth ${depth}`);
    });
  }

  // CPL thresholds to symbols (tunable)
  function classifyCPL(cpl, mateFlag = false) {
    if (mateFlag) return { label: 'Blunder', symbol: '??', cls: 'blunder' };
    if (cpl <= 10) return { label: 'Great', symbol: '=', cls: 'great' }; // "=" indicates top move/equality kept
    if (cpl <= 30) return { label: 'Good', symbol: '!', cls: 'good' };
    if (cpl <= 80) return { label: 'Inaccuracy', symbol: '?!', cls: 'inaccuracy' };
    if (cpl <= 200) return { label: 'Mistake', symbol: '?', cls: 'mistake' };
    return { label: 'Blunder', symbol: '??', cls: 'blunder' };
  }

  // Optional: detect "Brilliant" and "Excellent"
  function refineBrilliants(currentMoveSAN, playerPostEval, bestPostEval, secondBestDelta = 150) {
    // If player's move equals engine best and creates a significant positive swing or finds forcing PV
    const swing = bestPostEval - playerPostEval;
    if (Math.abs(swing) < 10 && bestPostEval >= 150) {
      // Excellent: maintained/extended significant advantage
      return { label: 'Excellent', symbol: '!', cls: 'excellent' };
    }
    // Heuristic: if player’s move is engine-best and PV contains a sacrifice (promotion/capture-heavy), mark Brilliant
    if (Math.abs(swing) < 10 && /[qrbn]$/.test(currentMoveSAN)) {
      return { label: 'Brilliant', symbol: '!!', cls: 'brilliant' };
    }
    return null;
  }

  // Eval bar: map cp (-1000..+1000) to height (0..100%)
  function cpToPercent(cp) {
    // Clamp around [-1000, +1000] for visual stability; you can widen/narrow as desired
    const clamped = Math.max(-1000, Math.min(1000, cp));
    // Convert to [0,100], 0% = black winning, 100% = white winning
    return ((clamped + 1000) / 2000) * 100;
  }

  // DOM refs
  const pgnInput = document.getElementById('pgnInput');
  const depthInput = document.getElementById('depth');
  const multipvInput = document.getElementById('multipv');
  const analyzeBtn = document.getElementById('analyzeBtn');
  const clearBtn = document.getElementById('clearBtn');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const moveIndicator = document.getElementById('moveIndicator');
  const movesBody = document.getElementById('movesBody');
  const evalFill = document.getElementById('evalFill');
  const evalText = document.getElementById('evalText');
  const sideText = document.getElementById('sideText');

  const countBrilliant = document.getElementById('countBrilliant');
  const countExcellent = document.getElementById('countExcellent');
  const countGreat = document.getElementById('countGreat');
  const countGood = document.getElementById('countGood');
  const countInaccuracy = document.getElementById('countInaccuracy');
  const countMistake = document.getElementById('countMistake');
  const countBlunder = document.getElementById('countBlunder');

  let analysis = [];
  let currentIndex = 0;

  function updateSummary() {
    const tally = {
      Brilliant: 0,
      Excellent: 0,
      Great: 0,
      Good: 0,
      Inaccuracy: 0,
      Mistake: 0,
      Blunder: 0
    };
    analysis.forEach(a => {
      tally[a.label] = (tally[a.label] || 0) + 1;
    });
    countBrilliant.textContent = tally.Brilliant || 0;
    countExcellent.textContent = tally.Excellent || 0;
    countGreat.textContent = tally.Great || 0;
    countGood.textContent = tally.Good || 0;
    countInaccuracy.textContent = tally.Inaccuracy || 0;
    countMistake.textContent = tally.Mistake || 0;
    countBlunder.textContent = tally.Blunder || 0;
  }

  function renderTable() {
    movesBody.innerHTML = '';
    analysis.forEach((row, i) => {
      const tr = document.createElement('tr');
      const symbolCls = `symbol ${row.cls}`;
      tr.innerHTML = `
        <td>${row.moveNumber}</td>
        <td>${row.san}</td>
        <td><span class="${symbolCls}">${row.symbol}</span></td>
        <td>${row.cpl}</td>
        <td>${row.bestSan || '-'}</td>
        <td>${(row.pv || []).join(' ') || '-'}</td>
        <td>${(row.evalCp / 100).toFixed(2)}</td>
      `;
      tr.addEventListener('click', () => {
        currentIndex = i;
        updateEvalBar();
        updateIndicator();
      });
      movesBody.appendChild(tr);
    });
  }

  function updateEvalBar() {
    if (!analysis.length) return;
    const row = analysis[currentIndex];
    const percent = cpToPercent(row.evalCp);
    evalFill.style.height = `${percent}%`;
    evalText.textContent = (row.evalCp / 100).toFixed(2);
    sideText.textContent = row.sideToMove;
  }

  function updateIndicator() {
    moveIndicator.textContent = `Move ${currentIndex + 1}/${analysis.length}`;
  }

  prevBtn.addEventListener('click', () => {
    if (currentIndex > 0) {
      currentIndex--;
      updateEvalBar();
      updateIndicator();
    }
  });
  nextBtn.addEventListener('click', () => {
    if (currentIndex < analysis.length - 1) {
      currentIndex++;
      updateEvalBar();
      updateIndicator();
    }
  });

  clearBtn.addEventListener('click', () => {
    pgnInput.value = '';
    analysis = [];
    movesBody.innerHTML = '';
    updateSummary();
    currentIndex = 0;
    updateIndicator();
    evalFill.style.height = '50%';
    evalText.textContent = '0.00';
    sideText.textContent = 'White';
  });

  analyzeBtn.addEventListener('click', async () => {
    const pgn = pgnInput.value.trim();
    if (!pgn) return;

    analyzeBtn.disabled = true;
    analysis = [];

    const depth = parseInt(depthInput.value, 10) || 18;
    const multipv = parseInt(multipvInput.value, 10) || 1;

    // Parse PGN with chess.js
    const game = new Chess();
    try {
      game.load_pgn(pgn, { sloppy: true });
    } catch (e) {
      alert('Invalid PGN.');
      analyzeBtn.disabled = false;
      return;
    }

    initEngine();

    // Walk through mainline moves
    const history = game.history({ verbose: true });
    const replay = new Chess();

    for (let i = 0; i < history.length; i++) {
      const ply = history[i];
      const preFen = replay.fen();
      const sideToMove = replay.turn() === 'w' ? 'White' : 'Black';

      const preResult = await analyseFen(preFen, depth, multipv);
      const bestMoveUci = preResult.bestMove;
      const preEvalCp = preResult.scoreCp;

      // Apply player's move
      replay.move(ply);
      const postFen = replay.fen();
      const postResult = await analyseFen(postFen, depth, multipv);
      const postEvalCp = postResult.scoreCp;

      // Evaluate if engine-best was played instead
      let bestPostEval = preEvalCp;
      let bestSan = null;
      if (bestMoveUci) {
        const alt = new Chess(preFen);
        const moveObj = {
          from: bestMoveUci.slice(0, 2),
          to: bestMoveUci.slice(2, 4),
          promotion: bestMoveUci.length === 5 ? bestMoveUci.slice(4) : undefined
        };
        alt.move(moveObj);
        const altResult = await analyseFen(alt.fen(), depth, multipv);
        bestPostEval = altResult.scoreCp;
        // Get SAN for best move
        const sanFinder = new Chess(preFen);
        const sanMove = sanFinder.move(moveObj);
        bestSan = sanMove ? sanMove.san : null;
      }

      // CPL from mover's perspective (mover is sideToMove at preFen)
      const perspective = sideToMove === 'White' ? 1 : -1;
      const cplRaw = (bestPostEval - postEvalCp) * perspective;
      const cpl = Math.round(cplRaw);

      // Mate flag: if post eval is mate for opponent
      const mateFlag = Math.abs(postEvalCp) >= 9000;

      // Classification
      let { label, symbol, cls } = classifyCPL(cpl, mateFlag);

      // Refinement for Excellent/Brilliant when player matched best line strongly
      const refine = refineBrilliants(ply.san, postEvalCp, bestPostEval);
      if (refine && Math.abs(cpl) <= 10) {
        label = refine.label;
        symbol = refine.symbol;
        cls = refine.cls;
      }
      // If truly top move (near-zero CPL), mark as Great with '='
      if (Math.abs(cpl) <= 5 && !refine) {
        label = 'Great';
        symbol = '=';
        cls = 'great';
      }

      analysis.push({
        moveNumber: ply.turn === 'w' ? Math.ceil((i + 1) / 2) : Math.ceil((i + 1) / 2),
        san: ply.san,
        label,
        symbol,
        cls,
        cpl,
        bestSan,
        pv: postResult.pv,
        evalCp: postEvalCp,
        sideToMove: replay.turn() === 'w' ? 'White' : 'Black'
      });
    }

    renderTable();
    updateSummary();
    currentIndex = 0;
    updateEvalBar();
    updateIndicator();

    analyzeBtn.disabled = false;
  });
})();
