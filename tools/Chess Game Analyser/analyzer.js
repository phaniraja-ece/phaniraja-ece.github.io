/* global Chess, Chessground */
(function () {
  // Stockfish
  let engine;
  function initEngine() {
    engine = new Worker(window.STOCKFISH_PATH);
    engine.postMessage('uci');
    engine.postMessage('setoption name MultiPV value 1');
  }

  function analyseFen(fen, depth = 18, multipv = 1) {
    return new Promise((resolve) => {
      let bestScore = 0;
      let bestMove = null;
      let pv = [];

      const onMessage = (e) => {
        const text = typeof e.data === 'string' ? e.data : '';
        if (text.startsWith('info')) {
          const scoreMatch = text.match(/score (cp|mate) (-?\d+)/);
          if (scoreMatch) {
            const kind = scoreMatch[1];
            const val = parseInt(scoreMatch[2], 10);
            bestScore = kind === 'mate' ? (val > 0 ? 10000 : -10000) : val;
          }
          const pvMatch = text.match(/ pv (.+)$/);
          if (pvMatch) pv = pvMatch[1].trim().split(/\s+/);
        } else if (text.startsWith('bestmove')) {
          const m = text.match(/^bestmove\s([a-h][1-8][a-h][1-8][qrbn]?)/);
          if (m) bestMove = m[1];
          engine.removeEventListener('message', onMessage);
          resolve({ scoreCp: bestScore, bestMove, pv, fen });
        }
      };

      engine.addEventListener('message', onMessage);
      engine.postMessage('ucinewgame');
      engine.postMessage(`position fen ${fen}`);
      engine.postMessage(`setoption name MultiPV value ${multipv}`);
      engine.postMessage(`go depth ${depth}`);
    });
  }

  // Classification
  function classify(cpl, mateFlag) {
    if (mateFlag) return { label: 'Blunder', sym: '??', cls: 'blunder' };
    if (cpl <= 8) return { label: 'Great', sym: '=', cls: 'great' };
    if (cpl <= 30) return { label: 'Good', sym: '!', cls: 'good' };
    if (cpl <= 80) return { label: 'Inaccuracy', sym: '?!', cls: 'inaccuracy' };
    if (cpl <= 200) return { label: 'Mistake', sym: '?', cls: 'mistake' };
    return { label: 'Blunder', sym: '??', cls: 'blunder' };
  }
  // Optional heuristic for !! and ! (tighten as desired)
  function refineForBrilliant(isTop, preEval, postEval, pv) {
    if (!isTop) return null;
    const gain = postEval - preEval;
    const showsSac = pv.some(m => m.endsWith('q') || m.endsWith('r') || m.endsWith('b') || m.endsWith('n')); // promotion/sac rough proxy
    if (gain >= 150 && showsSac) return { label: 'Brilliant', sym: '!!', cls: 'brilliant' };
    if (gain >= 100) return { label: 'Excellent', sym: '!', cls: 'excellent' };
    return null;
  }

  // Eval bar mapping
  function cpToPercent(cp) {
    const clamped = Math.max(-1000, Math.min(1000, cp));
    return ((clamped + 1000) / 2000) * 100;
  }

  // DOM refs
  const boardEl = document.getElementById('board');
  const evalFill = document.getElementById('evalFill');
  const evalText = document.getElementById('evalText');
  const turnText = document.getElementById('turnText');
  const movesBody = document.getElementById('movesBody');
  const moveIndicator = document.getElementById('moveIndicator');

  const pgnInput = document.getElementById('pgnInput');
  const loadBtn = document.getElementById('loadBtn');
  const clearBtn = document.getElementById('clearBtn');
  const analyzeBtn = document.getElementById('analyzeBtn');
  const flipBtn = document.getElementById('flipBtn');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const depthInput = document.getElementById('depth');
  const multipvInput = document.getElementById('multipv');

  const countBrilliant = document.getElementById('countBrilliant');
  const countExcellent = document.getElementById('countExcellent');
  const countGreat = document.getElementById('countGreat');
  const countGood = document.getElementById('countGood');
  const countInaccuracy = document.getElementById('countInaccuracy');
  const countMistake = document.getElementById('countMistake');
  const countBlunder = document.getElementById('countBlunder');

  // Board
  const cg = Chessground(boardEl, {
    orientation: 'white',
    highlight: { lastMove: true, check: true },
    animation: { duration: 200 },
    draggable: { enabled: false }
  });

  // State
  let game = new Chess();
  let replay = new Chess();
  let analysis = [];
  let currentIndex = 0;

  function setBoardFromFEN(fen) {
    cg.set({
      fen,
      turnColor: fen.includes(' w ') ? 'white' : 'black'
    });
  }

  function updateEvalBar(cp, turn) {
    evalFill.style.height = `${cpToPercent(cp)}%`;
    evalText.textContent = (cp / 100).toFixed(2);
    turnText.textContent = turn;
  }

  function updateIndicator() {
    moveIndicator.textContent = `${analysis.length ? currentIndex + 1 : 0}/${analysis.length}`;
  }

  function renderTable() {
    movesBody.innerHTML = '';
    analysis.forEach((row, i) => {
      const tr = document.createElement('tr');
      const pvText = row.pv.length ? row.pv.join(' ') : '-';
      tr.innerHTML = `
        <td>${row.moveNumber}</td>
        <td>${row.san}</td>
        <td><span class="symbol ${row.cls}">${row.sym}</span></td>
        <td>${row.cpl}</td>
        <td>${row.bestSan || '-'}</td>
        <td>${pvText}</td>
      `;
      tr.addEventListener('click', () => jumpTo(i));
      movesBody.appendChild(tr);
    });
  }

  function updateSummary() {
    const tally = {
      Brilliant: 0, Excellent: 0, Great: 0, Good: 0, Inaccuracy: 0, Mistake: 0, Blunder: 0
    };
    analysis.forEach(a => { tally[a.label] = (tally[a.label] || 0) + 1; });
    countBrilliant.textContent = tally.Brilliant || 0;
    countExcellent.textContent = tally.Excellent || 0;
    countGreat.textContent = tally.Great || 0;
    countGood.textContent = tally.Good || 0;
    countInaccuracy.textContent = tally.Inaccuracy || 0;
    countMistake.textContent = tally.Mistake || 0;
    countBlunder.textContent = tally.Blunder || 0;
  }

  function jumpTo(i) {
    if (i < 0 || i >= analysis.length) return;
    replay = new Chess();
    const hist = game.history({ verbose: true });
    for (let k = 0; k <= i; k++) replay.move(hist[k]);

    currentIndex = i;
    setBoardFromFEN(replay.fen());
    updateEvalBar(analysis[i].evalCp, replay.turn() === 'w' ? 'White' : 'Black');
    updateIndicator();

    // Arrows: show best move suggestion
    if (analysis[i].bestUci) {
      const from = analysis[i].bestUci.slice(0,2);
      const to = analysis[i].bestUci.slice(2,4);
      cg.set({
        drawable: {
          enabled: true,
          shapes: [{ orig: from, dest: to, brush: 'green' }]
        }
      });
    } else {
      cg.set({ drawable: { enabled: false, shapes: [] } });
    }
  }

  prevBtn.addEventListener('click', () => jumpTo(currentIndex - 1));
  nextBtn.addEventListener('click', () => jumpTo(currentIndex + 1));
  flipBtn.addEventListener('click', () => {
    const o = cg.state.orientation === 'white' ? 'black' : 'white';
    cg.set({ orientation: o });
  });

  clearBtn.addEventListener('click', () => {
    pgnInput.value = '';
    game = new Chess();
    replay = new Chess();
    analysis = [];
    movesBody.innerHTML = '';
    updateSummary();
    currentIndex = 0;
    updateIndicator();
    setBoardFromFEN(replay.fen());
    updateEvalBar(0, 'White');
  });

  loadBtn.addEventListener('click', () => {
    const pgn = pgnInput.value.trim();
    if (!pgn) return;
    try {
      game = new Chess();
      game.load_pgn(pgn, { sloppy: true });
      replay = new Chess();
      setBoardFromFEN(replay.fen());
      currentIndex = 0;
      updateIndicator();
    } catch (e) {
      alert('Invalid PGN');
    }
  });

  analyzeBtn.addEventListener('click', async () => {
    const history = game.history({ verbose: true });
    if (!history.length) {
      alert('Load a PGN first');
      return;
    }
    const depth = parseInt(depthInput.value, 10) || 18;
    const multipv = parseInt(multipvInput.value, 10) || 1;
    analysis = [];
    replay = new Chess();

    initEngine();

    for (let i = 0; i < history.length; i++) {
      const ply = history[i];
      const preFen = replay.fen();
      const turnSide = replay.turn() === 'w' ? 'White' : 'Black';

      const pre = await analyseFen(preFen, depth, multipv);
      const bestUci = pre.bestMove;
      const preEval = pre.scoreCp;

      // Apply player's move
      replay.move(ply);
      const post = await analyseFen(replay.fen(), depth, multipv);
      const postEval = post.scoreCp;

      // Best move alternative eval
      let bestPostEval = preEval;
      let bestSan = null;
      if (bestUci) {
        const alt = new Chess(preFen);
        const moveObj = {
          from: bestUci.slice(0,2),
          to: bestUci.slice(2,4),
          promotion: bestUci.length === 5 ? bestUci.slice(4) : undefined
        };
        const played = alt.move(moveObj);
        const altRes = await analyseFen(alt.fen(), depth, multipv);
        bestPostEval = altRes.scoreCp;
        if (played) bestSan = played.san;
      }

      const perspective = turnSide === 'White' ? 1 : -1;
      const cpl = Math.round((bestPostEval - postEval) * perspective);
      const mateFlag = Math.abs(postEval) >= 9000;

      let clsf = classify(cpl, mateFlag);
      const isTop = Math.abs(cpl) <= 6;
      const refined = refineForBrilliant(isTop, preEval, postEval, post.pv);
      if (refined) clsf = refined;

      analysis.push({
        moveNumber: Math.ceil((i + 1) / 2),
        san: ply.san,
        label: clsf.label,
        sym: clsf.sym,
        cls: clsf.cls,
        cpl,
        bestSan,
        bestUci,
        pv: post.pv,
        evalCp: postEval
      });
    }

    renderTable();
    updateSummary();
    currentIndex = 0;
    jumpTo(0);
  });

  // Initialize empty board
  setBoardFromFEN(game.fen());
})();
