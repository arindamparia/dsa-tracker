/* ─────────────────────────────────────────────────────────────
   CP-Algorithms.com resource links. 
   I hardcoded this mapping because honestly, scraping it dynamically 
   was too much effort and my brain was fried.
   Popover: the floating menu.
   Viewer: the massive iframe hack (pure jugaad) that opens without leaving the site.
   ───────────────────────────────────────────────────────────── */

if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

const CP_RESOURCES = {
  'Arrays & Hashing': [
    { title: 'Sparse Table (Range Queries)',            url: 'https://cp-algorithms.com/data_structures/sparse-table.html' },
    { title: 'Sqrt Decomposition',                     url: 'https://cp-algorithms.com/data_structures/sqrt_decomposition.html' },
    { title: 'Range Minimum Query (RMQ)',               url: 'https://cp-algorithms.com/sequences/rmq.html' },
    { title: 'K-th Order Statistic in O(N)',           url: 'https://cp-algorithms.com/sequences/k-th.html' },
    { title: 'MEX (Minimum Excludant)',                 url: 'https://cp-algorithms.com/sequences/mex.html' },
    { title: 'Maximum Subarray Sum',                   url: 'https://cp-algorithms.com/others/maximum_average_segment.html' },
    { title: 'Deleting from DS in O(T log n)',         url: 'https://cp-algorithms.com/data_structures/deleting_in_log_n.html' },
  ],
  'Sliding Window': [
    { title: 'Minimum Stack / Queue',                  url: 'https://cp-algorithms.com/data_structures/stack_queue_modification.html' },
  ],
  'Stack & Queue': [
    { title: 'Minimum Stack / Queue',                  url: 'https://cp-algorithms.com/data_structures/stack_queue_modification.html' },
    { title: 'Expression Parsing',                     url: 'https://cp-algorithms.com/string/expression_parsing.html' },
  ],
  'Binary Search': [
    { title: 'Binary Search',                          url: 'https://cp-algorithms.com/num_methods/binary_search.html' },
    { title: 'Ternary Search',                         url: 'https://cp-algorithms.com/num_methods/ternary_search.html' },
    { title: "Newton's Method for Roots",              url: 'https://cp-algorithms.com/num_methods/roots_newton.html' },
    { title: 'Simulated Annealing',                    url: 'https://cp-algorithms.com/num_methods/simulated_annealing.html' },
  ],
  'Binary Trees': [
    { title: 'Segment Tree',                           url: 'https://cp-algorithms.com/data_structures/segment-tree.html' },
    { title: 'Fenwick Tree (BIT)',                     url: 'https://cp-algorithms.com/data_structures/fenwick.html' },
    { title: 'LCA — Binary Lifting',                   url: 'https://cp-algorithms.com/graph/lca_binary_lifting.html' },
    { title: 'LCA — Euler Tour + RMQ',                 url: 'https://cp-algorithms.com/graph/lca.html' },
    { title: 'LCA — Farach-Colton & Bender',           url: 'https://cp-algorithms.com/graph/lca_farachcoltonbender.html' },
    { title: "LCA — Tarjan's Off-line",                url: 'https://cp-algorithms.com/graph/lca_tarjan.html' },
    { title: 'Solve RMQ via LCA',                      url: 'https://cp-algorithms.com/graph/rmq_linear.html' },
    { title: 'Sqrt Tree',                              url: 'https://cp-algorithms.com/data_structures/sqrt-tree.html' },
  ],
  'Heaps / Priority Queues': [
    { title: 'Randomized Heap',                        url: 'https://cp-algorithms.com/data_structures/randomized_heap.html' },
    { title: 'Treap (Cartesian Tree)',                 url: 'https://cp-algorithms.com/data_structures/treap.html' },
    { title: 'Min Stack / Queue',                      url: 'https://cp-algorithms.com/data_structures/stack_queue_modification.html' },
    { title: 'Deleting from DS in O(T log n)',         url: 'https://cp-algorithms.com/data_structures/deleting_in_log_n.html' },
  ],
  'Graphs': [
    { title: 'Breadth-First Search (BFS)',             url: 'https://cp-algorithms.com/graph/breadth-first-search.html' },
    { title: 'Depth-First Search (DFS)',               url: 'https://cp-algorithms.com/graph/depth-first-search.html' },
    { title: '0-1 BFS',                                url: 'https://cp-algorithms.com/graph/01_bfs.html' },
    { title: 'Connected Components',                   url: 'https://cp-algorithms.com/graph/search-for-connected-components.html' },
    { title: 'Disjoint Set Union (DSU)',               url: 'https://cp-algorithms.com/data_structures/disjoint_set_union.html' },
    { title: 'Topological Sorting',                    url: 'https://cp-algorithms.com/graph/topological-sort.html' },
    { title: 'Cycle Detection',                        url: 'https://cp-algorithms.com/graph/finding-cycle.html' },
    { title: 'Negative Cycle Detection',               url: 'https://cp-algorithms.com/graph/finding-negative-cycle-in-graph.html' },
    { title: 'Bipartite Graph Check',                  url: 'https://cp-algorithms.com/graph/bipartite-check.html' },
    { title: 'Eulerian Path',                          url: 'https://cp-algorithms.com/graph/euler_path.html' },
    { title: 'Edge / Vertex Connectivity',             url: 'https://cp-algorithms.com/graph/edge_vertex_connectivity.html' },
  ],
  'Tries': [
    { title: 'Aho-Corasick (Multi-pattern Trie)',      url: 'https://cp-algorithms.com/string/aho_corasick.html' },
    { title: 'Suffix Automaton',                       url: 'https://cp-algorithms.com/string/suffix-automaton.html' },
    { title: 'Suffix Tree (Ukkonen)',                  url: 'https://cp-algorithms.com/string/suffix-tree-ukkonen.html' },
    { title: 'Lyndon Factorization',                   url: 'https://cp-algorithms.com/string/lyndon_factorization.html' },
    { title: 'Finding Repetitions (Lorentz)',          url: 'https://cp-algorithms.com/string/main_lorentz.html' },
  ],
  'Recursion & Backtracking': [
    { title: 'Sprague-Grundy Theorem (Nim)',           url: 'https://cp-algorithms.com/game_theory/sprague-grundy-nim.html' },
    { title: 'Games on Arbitrary Graphs',              url: 'https://cp-algorithms.com/game_theory/games_on_graphs.html' },
    { title: 'Josephus Problem',                       url: 'https://cp-algorithms.com/others/josephus_problem.html' },
  ],
  'Dynamic Programming': [
    { title: 'Introduction to DP',                     url: 'https://cp-algorithms.com/dynamic_programming/intro-to-dp.html' },
    { title: 'Knapsack Problem',                       url: 'https://cp-algorithms.com/dynamic_programming/knapsack.html' },
    { title: 'Longest Increasing Subsequence',         url: 'https://cp-algorithms.com/sequences/longest_increasing_subsequence.html' },
    { title: 'DP on Broken Profile',                   url: 'https://cp-algorithms.com/dynamic_programming/profile-dynamics.html' },
    { title: 'Largest Zero Submatrix',                 url: 'https://cp-algorithms.com/dynamic_programming/zero_matrix.html' },
  ],
  'Dynamic Programming II': [
    { title: 'Divide & Conquer DP Optimization',       url: 'https://cp-algorithms.com/dynamic_programming/divide-and-conquer-dp.html' },
    { title: "Knuth's Optimization",                   url: 'https://cp-algorithms.com/dynamic_programming/knuth-optimization.html' },
    { title: 'Convex Hull Trick (Li Chao Tree)',       url: 'https://cp-algorithms.com/geometry/convex_hull_trick.html' },
  ],
  'Greedy': [
    { title: 'Scheduling (1 Machine)',                 url: 'https://cp-algorithms.com/schedules/schedule_one_machine.html' },
    { title: 'Scheduling (2 Machines)',                url: 'https://cp-algorithms.com/schedules/schedule_two_machines.html' },
    { title: 'Jobs with Deadlines',                    url: 'https://cp-algorithms.com/schedules/schedule-with-completion-duration.html' },
  ],
  'Bit Manipulation': [
    { title: 'Bit Manipulation Tricks',                url: 'https://cp-algorithms.com/algebra/bit-manipulation.html' },
    { title: 'Submask Enumeration',                    url: 'https://cp-algorithms.com/algebra/all-submasks.html' },
    { title: 'Gray Code',                              url: 'https://cp-algorithms.com/algebra/gray-code.html' },
    { title: 'Arbitrary-Precision Arithmetic',         url: 'https://cp-algorithms.com/algebra/big-integer.html' },
    { title: 'Fast Fourier Transform (FFT)',           url: 'https://cp-algorithms.com/algebra/fft.html' },
  ],
  'Math & Geometry': [
    { title: 'Basic Geometry Primitives',              url: 'https://cp-algorithms.com/geometry/basic-geometry.html' },
    { title: 'Convex Hull',                            url: 'https://cp-algorithms.com/geometry/convex-hull.html' },
    { title: 'Convex Hull Trick (DP)',                 url: 'https://cp-algorithms.com/geometry/convex_hull_trick.html' },
    { title: 'GCD / Euclidean Algorithm',              url: 'https://cp-algorithms.com/algebra/euclid-algorithm.html' },
    { title: 'Binary Exponentiation',                  url: 'https://cp-algorithms.com/algebra/binary-exp.html' },
    { title: "Pick's Theorem",                         url: 'https://cp-algorithms.com/geometry/picks-theorem.html' },
    { title: 'Fibonacci Numbers',                      url: 'https://cp-algorithms.com/algebra/fibonacci-numbers.html' },
    { title: 'Linear Diophantine Equations',           url: 'https://cp-algorithms.com/algebra/linear-diophantine-equation.html' },
    { title: 'Binomial Coefficients',                  url: 'https://cp-algorithms.com/combinatorics/binomial-coefficients.html' },
    { title: 'Catalan Numbers',                        url: 'https://cp-algorithms.com/combinatorics/catalan-numbers.html' },
    { title: 'Inclusion-Exclusion Principle',          url: 'https://cp-algorithms.com/combinatorics/inclusion-exclusion.html' },
    { title: 'Stars and Bars',                         url: 'https://cp-algorithms.com/combinatorics/stars_and_bars.html' },
    { title: 'Line / Segment Intersection',            url: 'https://cp-algorithms.com/geometry/lines-intersection.html' },
    { title: 'Circle-Line Intersection',               url: 'https://cp-algorithms.com/geometry/circle-line-intersection.html' },
    { title: 'Nearest Pair of Points',                 url: 'https://cp-algorithms.com/geometry/nearest_points.html' },
    { title: 'Manhattan Distance',                     url: 'https://cp-algorithms.com/geometry/manhattan-distance.html' },
    { title: 'Minimum Enclosing Circle',               url: 'https://cp-algorithms.com/geometry/enclosing-circle.html' },
    { title: 'Area of Simple Polygon',                 url: 'https://cp-algorithms.com/geometry/area-of-simple-polygon.html' },
  ],
  'String Manipulation': [
    { title: 'String Hashing',                         url: 'https://cp-algorithms.com/string/string-hashing.html' },
    { title: 'KMP / Prefix Function',                  url: 'https://cp-algorithms.com/string/prefix-function.html' },
    { title: 'Z-Function',                             url: 'https://cp-algorithms.com/string/z-function.html' },
    { title: 'Rabin-Karp',                             url: 'https://cp-algorithms.com/string/rabin-karp.html' },
    { title: 'Suffix Array',                           url: 'https://cp-algorithms.com/string/suffix-array.html' },
    { title: "Manacher's Algorithm",                   url: 'https://cp-algorithms.com/string/manacher.html' },
    { title: 'Lyndon Factorization',                   url: 'https://cp-algorithms.com/string/lyndon_factorization.html' },
    { title: 'Finding Repetitions (Lorentz)',          url: 'https://cp-algorithms.com/string/main_lorentz.html' },
    { title: 'Expression Parsing',                     url: 'https://cp-algorithms.com/string/expression_parsing.html' },
  ],
  'Number Theory': [
    { title: 'Binary Exponentiation',                  url: 'https://cp-algorithms.com/algebra/binary-exp.html' },
    { title: 'Sieve of Eratosthenes',                  url: 'https://cp-algorithms.com/algebra/sieve-of-eratosthenes.html' },
    { title: 'Linear Sieve',                           url: 'https://cp-algorithms.com/algebra/prime-sieve-linear.html' },
    { title: "Euler's Totient Function",               url: 'https://cp-algorithms.com/algebra/phi-function.html' },
    { title: 'Number of Divisors / Sum of Divisors',   url: 'https://cp-algorithms.com/algebra/divisors.html' },
    { title: 'Modular Inverse',                        url: 'https://cp-algorithms.com/algebra/module-inverse.html' },
    { title: 'Chinese Remainder Theorem',              url: 'https://cp-algorithms.com/algebra/chinese-remainder-theorem.html' },
    { title: "Garner's Algorithm (CRT)",               url: 'https://cp-algorithms.com/algebra/garners-algorithm.html' },
    { title: 'Extended Euclidean Algorithm',           url: 'https://cp-algorithms.com/algebra/extended-euclid-algorithm.html' },
    { title: 'Primality Tests',                        url: 'https://cp-algorithms.com/algebra/primality_tests.html' },
    { title: 'Integer Factorization',                  url: 'https://cp-algorithms.com/algebra/factorization.html' },
    { title: 'Discrete Log',                           url: 'https://cp-algorithms.com/algebra/discrete-log.html' },
    { title: 'Primitive Root',                         url: 'https://cp-algorithms.com/algebra/primitive-root.html' },
    { title: 'Factorial modulo p',                     url: 'https://cp-algorithms.com/algebra/factorial-modulo.html' },
    { title: 'Linear Congruence Equation',             url: 'https://cp-algorithms.com/algebra/linear_congruence_equation.html' },
  ],
  'Graph Algorithms': [
    { title: "Dijkstra's Algorithm",                   url: 'https://cp-algorithms.com/graph/dijkstra.html' },
    { title: 'Dijkstra on Sparse Graphs',              url: 'https://cp-algorithms.com/graph/dijkstra_sparse.html' },
    { title: 'Bellman-Ford',                           url: 'https://cp-algorithms.com/graph/bellman_ford.html' },
    { title: '0-1 BFS',                                url: 'https://cp-algorithms.com/graph/01_bfs.html' },
    { title: 'Floyd-Warshall (All-Pairs SP)',          url: 'https://cp-algorithms.com/graph/all-pair-shortest-path-floyd-warshall.html' },
    { title: "Prim's MST",                             url: 'https://cp-algorithms.com/graph/mst_prim.html' },
    { title: "Kruskal's MST",                          url: 'https://cp-algorithms.com/graph/mst_kruskal.html' },
    { title: "Kruskal's MST with DSU",                 url: 'https://cp-algorithms.com/graph/mst_kruskal_with_dsu.html' },
    { title: "Dinic's Max Flow",                       url: 'https://cp-algorithms.com/graph/dinic.html' },
    { title: 'Max Flow — Ford-Fulkerson / Edmonds-Karp', url: 'https://cp-algorithms.com/graph/edmonds_karp.html' },
    { title: 'Min Cost Max Flow',                      url: 'https://cp-algorithms.com/graph/min_cost_flow.html' },
    { title: 'Bridges',                                url: 'https://cp-algorithms.com/graph/bridge-searching.html' },
    { title: 'Articulation Points',                    url: 'https://cp-algorithms.com/graph/cutpoints.html' },
    { title: 'Strongly Connected Components',          url: 'https://cp-algorithms.com/graph/strongly-connected-components.html' },
    { title: '2-SAT',                                  url: 'https://cp-algorithms.com/graph/2SAT.html' },
    { title: 'Heavy-Light Decomposition',              url: 'https://cp-algorithms.com/graph/hld.html' },
    { title: 'Centroid Decomposition',                 url: 'https://cp-algorithms.com/graph/centroid_decomposition.html' },
    { title: "Kuhn's Algorithm (Bipartite Matching)",  url: 'https://cp-algorithms.com/graph/kuhn_maximum_bipartite_matching.html' },
    { title: 'Eulerian Path',                          url: 'https://cp-algorithms.com/graph/euler_path.html' },
    { title: 'Second Best MST',                        url: 'https://cp-algorithms.com/graph/second_best_mst.html' },
  ],
};

/* ── Inline viewer ─────────────────────────────────────────── */
const _viewer = (() => {
  let _el             = null;
  let _iframe         = null;
  let _loader         = null;
  let _newtab         = null;
  let _title          = null;
  let _isOpen         = false;
  let _historyPushed  = false;
  let _urlStack       = [];
  let _currentUrl     = null;

  function _build() {
    if (_el) return;

    _el = document.createElement('div');
    _el.id = 'cpa-viewer';
    _el.setAttribute('role', 'dialog');
    _el.setAttribute('aria-modal', 'true');
    _el.setAttribute('aria-label', 'cp-algorithms.com viewer');
    _el.innerHTML = `
      <div class="cpa-viewer-header">
        <button class="cpa-viewer-back" onclick="CPAlgorithms.goBack()" title="Back">
          ‹ <span>Back</span>
        </button>
        <div class="cpa-viewer-title" id="cpa-viewer-title">Algorithm Reference</div>
        <span class="cpa-viewer-badge">cp-algorithms.com</span>
        <button class="cpa-viewer-theme-toggle" onclick="window.toggleTheme()" title="Toggle Theme" aria-label="Toggle theme">
          <svg class="icon-sun" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>
          <svg class="icon-moon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
        </button>
        <a class="cpa-viewer-newtab" id="cpa-viewer-newtab" href="#" target="_blank" rel="noopener noreferrer" title="Open in new tab">↗ New tab</a>
        <button class="cpa-viewer-close" onclick="CPAlgorithms.closeViewer()" title="Close" aria-label="Close viewer">✕</button>
      </div>
      <div class="cpa-viewer-loader" id="cpa-viewer-loader">
        <div class="cpa-terminal-loader">
          <span class="cpa-term-text">Fetching data</span><span class="cpa-term-cursor"></span>
        </div>
      </div>
      <iframe id="cpa-viewer-iframe" title="cp-algorithms article" loading="lazy"></iframe>
    `;
    document.body.appendChild(_el);
    _iframe = document.getElementById('cpa-viewer-iframe');
    _loader = document.getElementById('cpa-viewer-loader');
    _newtab = document.getElementById('cpa-viewer-newtab');
    _title  = document.getElementById('cpa-viewer-title');

    _iframe.addEventListener('load', () => {
      _loader.classList.add('hidden');
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && _isOpen) close();
    });

    /* Browser back button → close viewer, don't navigate away */
    window.addEventListener('popstate', () => {
      if (_isOpen) {
        _historyPushed = false; // already popped by browser — don't back() again
        close();
      }
    });
  }

  function open(url, title) {
    _build();
    _urlStack = [];
    _currentUrl = url;
    _title.textContent   = title;
    _newtab.href         = url;
    _loader.classList.remove('hidden');
    _el.classList.add('open');
    history.pushState({ cpaViewer: true }, '');
    _historyPushed = true;
    _scrollLock();
    window.__lenis?.stop();
    _isOpen = true;
    const _theme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    const proxyUrl = window.location.origin + `/.netlify/functions/cp-proxy?url=${encodeURIComponent(url)}&theme=${_theme}`;
    /* Use location.replace so the iframe load doesn't add a joint-session-history entry.
       That way pressing browser back hits our pushState immediately and closes the viewer. */
    setTimeout(() => { _iframe.contentWindow.location.replace(proxyUrl); }, 80);
  }

  function close() {
    if (!_el) return;
    _el.classList.remove('open');
    _scrollUnlock();
    window.__lenis?.start();
    _isOpen = false;
    setTimeout(() => { if (!_isOpen) _iframe.contentWindow.location.replace('about:blank'); }, 320);
    /* Back/✕ button closes → clean up the pushed history entry */
    if (_historyPushed) { _historyPushed = false; history.back(); }
  }

  function goBack() {
    if (_urlStack.length > 0) {
      const prevUrl = _urlStack.pop();
      _currentUrl = prevUrl;
      _newtab.href = prevUrl;
      _loader.classList.remove('hidden');
      const _theme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
      const proxyUrl = window.location.origin + `/.netlify/functions/cp-proxy?url=${encodeURIComponent(prevUrl)}&theme=${_theme}`;
      _iframe.contentWindow.location.replace(proxyUrl);
    } else {
      close();
    }
  }

  window.cpaNavigate = function(newUrl) {
    if (_currentUrl && _currentUrl !== newUrl) {
      _urlStack.push(_currentUrl);
    }
    _currentUrl = newUrl;
    _newtab.href = newUrl;
    _loader.classList.remove('hidden');
    const _theme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    const proxyUrl = window.location.origin + `/.netlify/functions/cp-proxy?url=${encodeURIComponent(newUrl)}&theme=${_theme}`;
    _iframe.contentWindow.location.replace(proxyUrl);
  };

  return { open, close, goBack };
})();

/* ── Scroll-lock helpers ──────────────────────────────────── */
let _scrollLockCount = 0;
let _savedScrollY = 0;

function _scrollLock() {
  if (_scrollLockCount++ > 0) return;          // already locked
  _savedScrollY = window.scrollY;
  document.body.style.position  = 'fixed';
  document.body.style.top       = `-${_savedScrollY}px`;
  document.body.style.left      = '0';
  document.body.style.right     = '0';
  document.documentElement.style.overflow = 'hidden';
}

function _scrollUnlock() {
  if (--_scrollLockCount > 0) return;          // something else still needs lock
  _scrollLockCount = 0;                        // guard against going negative
  document.body.style.position  = '';
  document.body.style.top       = '';
  document.body.style.left      = '';
  document.body.style.right     = '';
  document.documentElement.style.overflow = '';
  window.scrollTo({ top: _savedScrollY, left: 0, behavior: 'instant' });
}

/* ── Popover ───────────────────────────────────────────────── */
const CPAlgorithms = (() => {
  let _el      = null;
  let _isOpen  = false;
  let _lastSec = null;
  let _lastBtn = null;
  let _isExtended = false;
  let _backdrop = null;

  function _build() {
    if (_el) return;

    _el = document.createElement('div');
    _el.id = 'cpa-popover';
    _el.setAttribute('role', 'menu');
    _el.setAttribute('aria-label', 'cp-algorithms reference links');
    _el.innerHTML = `
      <div class="cpa-header">
        <span class="cpa-logo">⚡</span>
        <div class="cpa-header-text">
          <div class="cpa-site">cp-algorithms.com</div>
          <div class="cpa-section-name" id="cpa-section-name"></div>
        </div>
        <button class="cpa-extend-btn" id="cpa-extend-btn" onclick="CPAlgorithms.toggleExtend(event)" title="Center on screen">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>
        </button>
      </div>
      <div class="cpa-links" id="cpa-links"></div>
    `;
    document.body.appendChild(_el);

    _backdrop = document.createElement('div');
    _backdrop.className = 'cpa-backdrop';
    _backdrop.addEventListener('click', () => { if (_isOpen) _close(); });
    _backdrop.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    _backdrop.addEventListener('wheel', (e) => e.preventDefault(), { passive: false });
    document.body.appendChild(_backdrop);

    /* Always block the page from scrolling while the wheel is over the popover.
       Manually apply deltaY to .cpa-links so it scrolls regardless of
       browser compositing or ancestor overflow settings. */
    _el.addEventListener('wheel', (e) => {
      e.preventDefault();
      const links = _el.querySelector('.cpa-links');
      if (links) links.scrollTop += e.deltaY;
    }, { passive: false });

    /* Close popover on outside click */
    document.addEventListener('click', (e) => {
      if (!_isOpen) return;
      if (_el.contains(e.target)) return;
      if (e.target.closest?.('.cpa-btn')) return;
      _close();
    }, { capture: true });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && _isOpen) _close();
    });
  }

  function _close() {
    if (!_el) return;
    _el.classList.remove('open');
    _isOpen  = false;
    _lastSec = null;
    if (_backdrop) _backdrop.classList.remove('show');
    if (_isExtended) {
      _isExtended = false;
      _el.classList.remove('extended');
      _scrollUnlock(); // release the lock taken in toggleExtend
      const btn = document.getElementById('cpa-extend-btn');
      if (btn) { 
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>';
        btn.title = 'Center on screen'; 
      }
    }
  }

  function _position(btn) {
    const rect     = btn.getBoundingClientRect();
    const popW     = Math.min(300, window.innerWidth - 16);
    let   left     = rect.left;
    if (left + popW > window.innerWidth - 8) left = window.innerWidth - popW - 8;
    left = Math.max(8, left);

    const HEADER_H = 54;   // approximate .cpa-header height
    const GAP      = 6;
    const MARGIN   = 8;
    const spaceBelow = window.innerHeight - rect.bottom - MARGIN;
    const spaceAbove = rect.top - MARGIN;

    const links = _el.querySelector('.cpa-links');

    // Flip above the button when there is significantly more space above
    if (spaceBelow < 160 && spaceAbove > spaceBelow) {
      const maxLinksH = Math.max(60, Math.min(320, spaceAbove - HEADER_H - GAP));
      if (links) links.style.maxHeight = maxLinksH + 'px';
      // Position so the bottom of the popover sits just above the button
      const popH = HEADER_H + Math.min(maxLinksH, links?.scrollHeight || maxLinksH);
      _el.style.top = (rect.top + window.scrollY - popH - GAP) + 'px';
    } else {
      const maxLinksH = Math.max(60, Math.min(320, spaceBelow - HEADER_H - GAP));
      if (links) links.style.maxHeight = maxLinksH + 'px';
      _el.style.top = (rect.bottom + window.scrollY + GAP) + 'px';
    }

    _el.style.width = popW + 'px';
    _el.style.left  = (left + window.scrollX) + 'px';
  }

  /* ── Public API ─────────────────────────────────────────── */
  function hasLinks(section) {
    return !!(CP_RESOURCES[section]?.length);
  }

  function openPopover(btn) {
    const section = btn.dataset.section;
    const links   = CP_RESOURCES[section];
    if (!links?.length) return;

    _build();

    /* Toggle if same section clicked again */
    if (_isOpen && _lastSec === section) { _close(); return; }

    document.getElementById('cpa-section-name').textContent = section;
    /* Use data attributes — avoids double-quote nesting inside onclick="..." */
    const listEl = document.getElementById('cpa-links');
    listEl.innerHTML = '';
    links.forEach(l => {
      const item = document.createElement('button');
      item.className        = 'cpa-link';
      item.title            = l.title;
      item.dataset.url      = l.url;
      item.dataset.title    = l.title;
      item.innerHTML        = `<span class="cpa-link-title">${l.title}</span><span class="cpa-link-ext" aria-hidden="true">›</span>`;
      item.addEventListener('click', () => CPAlgorithms.openArticle(item.dataset.url, item.dataset.title));
      listEl.appendChild(item);
    });

    _position(btn);
    _el.classList.add('open');
    _isOpen  = true;
    _lastSec = section;
    _lastBtn = btn;
  }

  function toggleExtend(e) {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    _isExtended = !_isExtended;
    const btn = document.getElementById('cpa-extend-btn');
    if (_isExtended) {
      _el.classList.add('extended');
      if (btn) { 
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14h6v6"/><path d="M20 10h-6V4"/><path d="M14 10l7-7"/><path d="M3 21l7-7"/></svg>';
        btn.title = 'Dock to button'; 
      }
      const popW = Math.min(500, window.innerWidth - 32);
      _el.style.width = popW + 'px';
      _el.style.left = ((window.innerWidth - popW) / 2) + 'px';
      
      const links = _el.querySelector('.cpa-links');
      const expectedH = Math.min(window.innerHeight * 0.75, (links?.scrollHeight || 300) + 60);
      const top  = (window.innerHeight - expectedH) / 2;
      
      _el.style.top = top + 'px';
      _scrollLock();
      if (_backdrop) _backdrop.classList.add('show');
    } else {
      _el.classList.remove('extended');
      if (btn) { 
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>';
        btn.title = 'Center on screen'; 
      }
      _scrollUnlock();
      if (_backdrop) _backdrop.classList.remove('show');
      if (_lastBtn) _position(_lastBtn);
    }
  }

  function openArticle(url, title) {
    _close();             // close the popover first
    _viewer.open(url, title);
  }

  function closeViewer() {
    _viewer.close();
  }

  function goBack() {
    _viewer.goBack();
  }

  return { hasLinks, openPopover, openArticle, closeViewer, goBack, toggleExtend };
})();

window.CPAlgorithms = CPAlgorithms;
