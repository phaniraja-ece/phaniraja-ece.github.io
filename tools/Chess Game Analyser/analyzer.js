/* global Chess, Chessground */
(function () {
  // ---------------------------
  // Stockfish UCI engine manager
  // ---------------------------
  class StockfishUci {
    constructor(path) {
      this.path = path;
      this.worker = null;
      this.readyUci = false;
      this.readyOk = false;
      this.listener = null;
      this.current = null; // active request {id, fen, movetime, multipv, resolve, timer}
      this.idCounter = 1;
    }

    init() {
      if (this.worker) this.worker.terminate();
      this.worker = new Worker(this.path);
      this.readyUci = false;
      this.readyOk = false;

      // Single message listener for the whole session
      this.listener = (e) => this._onMessage(e);
      this.worker.addEventListener('message', this.listener);

      // Boot UCI
      this.worker.postMessage('uci');
    }

    _onMessage(e) {
      const text = typeof e.data === 'string' ? e.data : '';
      if (!text) return;

      if (text === 'uciok') {
        this.readyUci = true;
        this.worker.postMessage('isready');
        return;
      }
      if (text === 'readyok') {
        this.readyOk = true;
        return;
      }

      const req = this.current;
      if (!req) return; // Ignore engine chatter when no active request

      if (text.startsWith('info')) {
        // Parse score & PV for the active request
        const scoreMatch = text.match(/score (cp|mate) (-?\d+)/);
        if (scoreMatch) {
          const kind = scoreMatch[1];
          const val = parseInt(scoreMatch[2], 10);
          req.scoreCp = (kind === 'mate') ? (val > 0 ? 10000 : -10000) : val;
        }
        const pvMatch = text.match(/ pv (.+)$/);
        if (pvMatch) req.pv = pvMatch[1].trim().split(/\s+/);
      } else if (text.startsWith('bestmove')) {
        // Parse bestmove and resolve the request
        const m = text.match(/^bestmove\s([a-h][1-8][a-h][1-8][qrbn]?)/);
        if (m) req.bestMove = m[1];
        this._resolveCurrent();
      }
    }

    _resolveCurrent() {
      const req = this.current;
      if (!req) return;
      clearTimeout(req.timer);
      const { scoreCp = 0, bestMove = null, pv = [], fen, resolve } = req;
      this.current = null;
      resolve({ scoreCp, bestMove, pv, fen });
    }

    async analyseFen(fen, movetime = 300, multipv = 1) {
      // Ensure engine session exists
      if (!this.worker) this.init();

      // Wait for UCI and readyok once
      if (!this.readyUci) await this._waitFor(() => this.readyUci, 3000);
      this.worker.postMessage('isready');
      await this._waitFor(() => this.readyOk, 3000);

      // Set options
      this.worker.postMessage(`setoption name MultiPV value ${multipv}`);

      // Abort any previous request (defensive)
      if (this.current) {
        try { this.worker.postMessage('stop'); } catch {}
        const old = this.current;
        clearTimeout(old.timer);
        old.resolve({ scoreCp: old.scoreCp || 0, bestMove: old.bestMove || null, pv: old.pv || [], fen: old.fen });
        this.current = null;
      }

      // Start new request
      const id = this.idCounter++;
      return new Promise((resolve) => {
        this.current = {
          id,
          fen,
          movetime,
          multipv,
          resolve,
          scoreCp: 0,
          bestMove: null,
          pv: [],
          timer: setTimeout(() => {
            // Watchdog: if bestmove hasn't arrived, send stop then fallback resolve
            try { this.worker.postMessage('stop'); } catch {}
            setTimeout(() => this._resolveCurrent(), 200);
          }, movetime + 600) // movetime + buffer
        };

        this.worker.postMessage('ucinewgame');
        this.worker.postMessage(`position fen ${fen}`);
        this.worker.postMessage(`go movetime ${movetime}`);
      });
    }

    _waitFor(check, timeoutMs) {
      return new Promise((resolve, reject) => {
        const start = Date.now();
        const tick = () => {
          if (check()) return resolve();
          if (Date.now() - start > timeoutMs) return reject(new Error('Timeout waiting for engine ready'));
          setTimeout(tick, 20);
        };
        tick();
      });
    }
  }

  // ---------------------------
  // UI helpers & classification
  // ---------------------------
  function classify(cpl, mateFlag) {
    if (mateFlag) return { label: 'Blunder', sym: '??', cls: 'blunder' };
    if (cpl <= 8) return { label: 'Great', sym: '=', cls: 'great' };
    if (cpl <= 30) return { label: 'Good', sym: '!', cls: 'good' };
    if (cpl <= 80) return { label: 'Inaccuracy', sym: '?!', cls: 'inaccuracy' };
    if (cpl <= 200) return { label: 'Mistake', sym: '?', cls: 'mistake' };
    return { label: 'Blunder', sym: '??', cls: 'blunder' };
  }

  function refineForBrilliant(isTop, preEval, postEval, pv) {
    if (!isTop) return null;
    const gain = postEval - preEval;
    const showsSac = pv.some(m => m.endsWith('q') || m.endsWith('r') || m.endsWith('b') || m.endsWith('n'));
    if (gain >= 150 && showsSac) return { label: 'Brilliant', sym: '!!', cls: 'brilliant' };
    if (gain >= 100) return { label: 'Excellent', sym: '!', cls: 'excellent' };
    return null;
  }

  function cpToPercent(cp) {
    const clamped = Math.max(-1000, Math.min(1000, cp));
    return ((clamped + 1000) / 2000) * 100;
  }

  // ---------------------------
  // DOM references
  // ---------------------------
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
  const multipvInput = document.getElementById('multipv');
  const movetimeInput = document.getElementById('movetime');

  const countBrilliant = document.getElementById('countBrilliant');
  const countExcellent = document.getElementById('countExcellent');
  const countGreat = document.getElementById('countGreat');
  const countGood = document.getElementById('countGood');
  const countInaccuracy = document.getElementById('countInaccuracy');
  const countMistake = document.getElementById('countMistake');
  const countBlunder = document.getElementById('countBlunder');

  // ---------------------------
  // Board
  // ---------------------------
  const cg = Chessground(boardEl, {
    orientation: 'white',
    highlight: { lastMove: true, check: true },
    animation: { duration: 200 },
    draggable: { enabled: false }
  });

  // ---------------------------
  // State
  // ---------------------------
  const engine = new StockfishUci(window.STOCKFISH_PATH);
  let game = new Chess();
  let replay = new Chess();
  let analysis = [];
  let currentIndex = 0;

  function setBoardFromFEN(fen) {
    cg.set({ fen, turnColor: fen.includes(' w ') ? 'white' : 'black' });
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
    const tally = { Brilliant:0, Excellent:0, Great:0, Good:0, Inaccuracy:0, Mistake:0, Blunder:0 };
    analysis.forEach(a => { tally[a.label] = (tally[a.label] || 0) + 1; });
    countBrilliant.textContent = tally.Brilliant;
    countExcellent.textContent = tally.Excellent;
    countGreat.textContent = tally.Great;
    countGood.textContent = tally.Good;
    countInaccuracy.textContent = tally.Inaccuracy;
    countMistake.textContent = tally.Mistake;
    countBlunder.textContent = tally.Blunder;
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
  }

  // ---------------------------
  // Controls
  // ---------------------------
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
    } catch (e) { alert('Invalid PGN'); }
  });

  analyzeBtn.addEventListener('click', async () => {
    const history = game.history({ verbose: true });
    if (!history.length) return alert('Load a PGN first');

    const movetime = parseInt(movetimeInput.value, 10) || 300;
    const multipv = parseInt(multipvInput.value, 10) || 1;

    analysis = [];
    replay = new Chess();

    try {
      for (let i = 0; i < history.length; i++) {
        const ply = history[i];
        const preFen = replay.fen();
        const turnSide = replay.turn() === 'w' ? 'White' : 'Black';

        const pre = await engine.analyseFen(preFen, movetime, multipv);
        const bestUci = pre.bestMove;
        const preEval = pre.scoreCp;

        // Apply player's move
        replay.move(ply);
        const post = await engine.analyseFen(replay.fen(), movetime, multipv);
        const postEval = post.scoreCp;

        // Best move post eval
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
          const altRes = await engine.analyseFen(alt.fen(), movetime, multipv);
          bestPostEval = altRes.scoreCp;
          if (played) bestSan = played.san;
        }

        const perspective = turnSide === 'White' ? 1 : -1;
        const cpl = Math.round((bestPostEval - postEval) * perspective);
        const mateFlag = Math.abs(postEval) >= 9000;

        let clsf = classify(cpl, mateFlag);
        const isTop = Math.abs(cpl) <= 6;
        const refined = refineForBrilliant(isTop, preEval, postEval, post.pv || []);
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
          pv: post.pv || [],
          evalCp: postEval
        });
      }

      renderTable();
      updateSummary();
      currentIndex = 0;
      jumpTo(0);
    } catch (err) {
      alert('Engine error: ' + (err && err.message ? err.message : 'unknown'));
    }
  });

  // Initialize board
  setBoardFromFEN(game.fen());
})();
