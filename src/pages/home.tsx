import type { FC } from 'hono/jsx';
import { NIGERIA_OUTLINE_PATH } from '../data/nigeria-outline';
import { STATE_COORDS } from '../data/state-coordinates';

interface StateStat {
  slug: string;
  name: string;
  market_count: number;
  lga_with_markets: number;
}

interface HomeProps {
  stateStats: StateStat[];
  totalMarkets: number;
  totalStates: number;
  statesWithMarkets: number;
  lgasWithData: number;
}

function dotRadius(count: number): number {
  if (count === 0) return 3;
  if (count <= 3) return 5;
  if (count <= 10) return 7;
  if (count <= 20) return 9;
  return 11;
}

export const HomePage: FC<HomeProps> = ({
  stateStats,
  totalMarkets,
  totalStates,
  statesWithMarkets,
  lgasWithData,
}) => {
  // Top 5 states with most markets
  const hotStates = stateStats.filter((s) => s.market_count > 0).slice(0, 5);
  // States needing contributions (0 markets or very few)
  const needsData = stateStats.filter((s) => s.market_count === 0).slice(0, 5);

  // Build trade routes between top states
  const tradeRoutes: Array<{ x1: number; y1: number; x2: number; y2: number }> =
    [];
  const hotSlugs = hotStates.map((s) => s.slug);
  for (let i = 0; i < hotSlugs.length - 1; i++) {
    const a = STATE_COORDS[hotSlugs[i]];
    const b = STATE_COORDS[hotSlugs[i + 1]];
    if (a && b) {
      tradeRoutes.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
    }
  }

  return (
    <div class="home-page">
      {/* Ambient background grid */}
      <div class="ambient-grid" aria-hidden="true"></div>

      <section class="hero hero-modern">
        <div class="hero-copy">
          <div class="eyebrow">
            <span class="eyebrow-dot"></span>
            Open market intelligence for Nigeria
          </div>
          <h1>The living map of Nigerian markets.</h1>
          <p class="subtitle">
            Iya Oloja is a community-powered API and directory for markets
            across all 36 states and the FCT. Search, explore, and contribute to
            Nigeria's open market data.
          </p>

          <div class="hero-actions">
            <a href="/docs" class="btn btn-glow">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                <polyline points="13 2 13 9 20 9" />
              </svg>
              Explore the API
            </a>
            <a href="/contribute" class="btn btn-outline">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Submit a Market
            </a>
          </div>

          {/* Live stats strip — real data */}
          <div class="stats-strip">
            <div class="stat-item">
              <span class="stat-number">{totalMarkets}</span>
              <span class="stat-label">Markets tracked</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-item">
              <span class="stat-number">
                {statesWithMarkets}/{totalStates}
              </span>
              <span class="stat-label">States with data</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-item">
              <span class="stat-number">{lgasWithData}</span>
              <span class="stat-label">LGAs covered</span>
            </div>
          </div>
        </div>

        <div class="hero-visual">
          <div class="map-card">
            <div class="map-card-header">
              <div>
                <span class="map-kicker">Live coverage</span>
                <h2>Nigeria market pulse</h2>
              </div>
              <div class="map-header-tools">
                <button type="button" class="map-reset" id="map-reset" hidden>
                  Reset view
                </button>
                <div class="map-legend">
                  <span>
                    <i class="legend-dot legend-dot-hot"></i> Has markets
                  </span>
                  <span>
                    <i class="legend-dot legend-dot-watch"></i> Needs data
                  </span>
                </div>
              </div>
            </div>

            <div class="market-map" id="market-map">
              <svg
                class="nigeria-svg"
                viewBox="0 0 800 700"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g class="map-viewport" id="map-viewport">
                  {/* Nigeria outline */}
                  <path class="nigeria-outline" d={NIGERIA_OUTLINE_PATH} />

                  {/* Trade routes between hot states */}
                  {tradeRoutes.map((r, i) => (
                    <line
                      key={`route-${i}`}
                      class="trade-route"
                      x1={String(r.x1)}
                      y1={String(r.y1)}
                      x2={String(r.x2)}
                      y2={String(r.y2)}
                    />
                  ))}

                  {/* Data-driven state dots */}
                  {stateStats.map((state) => {
                    const coords = STATE_COORDS[state.slug];
                    if (!coords) return null;

                    const r = dotRadius(state.market_count);
                    const isHot = state.market_count > 0;
                    const dotClass = isHot
                      ? 'market-dot market-dot-hot'
                      : 'market-dot market-dot-watch';
                    const showLabel =
                      state.market_count > 2 ||
                      hotStates.slice(0, 8).includes(state) ||
                      needsData.slice(0, 3).includes(state);
                    const pulseSpeed = isHot
                      ? `${2.5 + Math.random() * 1.5}s`
                      : `${3.5 + Math.random() * 1}s`;
                    const labelDx =
                      coords.labelOffset?.[0] ??
                      (coords.labelDir === 'left' ? -r - 6 : r + 6);
                    const labelDy = coords.labelOffset?.[1] ?? 4;

                    return (
                      <g
                        key={state.slug}
                        class="state-dot-group"
                        data-slug={state.slug}
                        data-name={state.name}
                        data-count={String(state.market_count)}
                        data-lgas={String(state.lga_with_markets)}
                        data-x={String(coords.x)}
                        data-y={String(coords.y)}
                        data-label={coords.label}
                      >
                        {/* Pulse ring for hot states */}
                        {isHot && r >= 5 && (
                          <circle
                            class="market-dot-ring"
                            cx={String(coords.x)}
                            cy={String(coords.y)}
                            r={String(r * 2)}
                          >
                            <animate
                              attributeName="r"
                              values={`${r * 2};${r * 3.5};${r * 2}`}
                              dur={pulseSpeed}
                              repeatCount="indefinite"
                            />
                            <animate
                              attributeName="opacity"
                              values="0.4;0;0.4"
                              dur={pulseSpeed}
                              repeatCount="indefinite"
                            />
                          </circle>
                        )}

                        {/* Main dot */}
                        <circle
                          class={dotClass}
                          cx={String(coords.x)}
                          cy={String(coords.y)}
                          r={String(r)}
                        >
                          <animate
                            attributeName="r"
                            values={`${r};${r + 2};${r}`}
                            dur={pulseSpeed}
                            repeatCount="indefinite"
                          />
                        </circle>

                        {/* Label for notable states */}
                        {showLabel && (
                          <text
                            class={`map-label${coords.labelDir === 'left' ? ' map-label-left' : ''}`}
                            x={String(coords.x + labelDx)}
                            y={String(coords.y + labelDy)}
                          >
                            {coords.label}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </g>
              </svg>

              {/* Interactive tooltip */}
              <div class="map-tooltip" id="map-tooltip">
                <span class="tooltip-ping"></span>
                <span class="tooltip-text" id="tooltip-text">
                  {totalMarkets} markets across {statesWithMarkets} states
                </span>
              </div>

              <div class="map-focus-card" id="map-focus-card" hidden>
                <span class="focus-kicker">Focused state</span>
                <strong id="focus-title">Nigeria overview</strong>
                <p id="focus-meta">
                  Click a node to zoom in and inspect coverage.
                </p>
                <a href="/api" id="focus-link">
                  Open API index
                </a>
              </div>
            </div>

            <div class="activity-ribbon">
              <div class="activity-column">
                <span class="activity-label">Top coverage</span>
                <p>
                  {hotStates.map((s, i) => (
                    <span key={s.slug}>
                      {i > 0 && ', '}
                      <strong>{s.name}</strong> ({s.market_count})
                    </span>
                  ))}
                </p>
              </div>
              <div class="activity-column">
                <span class="activity-label">Needs contributors</span>
                <p>
                  {needsData.map((s, i) => (
                    <span key={s.slug}>
                      {i > 0 && ', '}
                      {s.name}
                    </span>
                  ))}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="surface-grid">
        <div class="surface-card surface-card-glass">
          <div class="surface-icon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          </div>
          <span class="surface-kicker">Coverage</span>
          <h3>All 36 states + FCT in one API</h3>
          <p>
            Every state, LGA, and market is searchable and browsable. The data
            is community-maintained and always growing.
          </p>
        </div>

        <div class="surface-card surface-card-glass">
          <div class="surface-icon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <span class="surface-kicker">Community</span>
          <h3>Contribute markets via form or PR</h3>
          <p>
            Submit new markets through the web form or open a pull request.
            Every contribution is validated by CI before merging.
          </p>
        </div>

        <div class="surface-card surface-card-glass">
          <div class="surface-icon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          </div>
          <span class="surface-kicker">Developer-first</span>
          <h3>JSON API, zero auth required</h3>
          <div class="terminal terminal-hero">
            <div class="terminal-header">
              <span class="terminal-dot"></span>
              <span class="terminal-dot"></span>
              <span class="terminal-dot"></span>
            </div>
            <div class="terminal-body">
              <div class="terminal-line">
                <span class="terminal-prompt">$</span> curl /api/states/lagos
              </div>
              <div class="terminal-line">
                <span class="terminal-prompt">$</span> curl
                /api/markets?q=balogun
              </div>
              <div class="terminal-line">
                <span class="terminal-prompt">$</span> curl
                /api/markets?state=lagos&limit=10
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Client-side interactivity for map */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
        (function() {
          var tooltip = document.getElementById('map-tooltip');
          var tooltipText = document.getElementById('tooltip-text');
          var defaultText = tooltipText.textContent;
          var groups = document.querySelectorAll('.state-dot-group');
          var map = document.getElementById('market-map');
          var viewport = document.getElementById('map-viewport');
          var reset = document.getElementById('map-reset');
          var focusCard = document.getElementById('map-focus-card');
          var focusTitle = document.getElementById('focus-title');
          var focusMeta = document.getElementById('focus-meta');
          var focusLink = document.getElementById('focus-link');
          var focusedSlug = null;
          var currentTransform = { tx: 0, ty: 0, scale: 1 };
          var activeGroup = null;
          var dragState = null;

          function renderTransform() {
            if (!viewport) return;
            viewport.setAttribute(
              'transform',
              'translate(' + currentTransform.tx + ' ' + currentTransform.ty + ') scale(' + currentTransform.scale + ')'
            );
          }

          function setActiveGroup(nextGroup) {
            if (activeGroup) activeGroup.classList.remove('is-active');
            activeGroup = nextGroup;
            if (activeGroup) activeGroup.classList.add('is-active');
          }

          function applyFocus(slug, name, count, lgas, x, y) {
            if (!viewport) return;

            var scale = 1.95;
            var targetX = 400;
            var targetY = 330;
            var tx = targetX - (scale * x);
            var ty = targetY - (scale * y);

            currentTransform = { tx: tx, ty: ty, scale: scale };
            renderTransform();
            map.classList.add('map-focused');
            focusedSlug = slug;

            if (reset) reset.hidden = false;
            if (focusCard) focusCard.hidden = false;
            if (focusTitle) focusTitle.textContent = name;
            if (focusMeta) {
              if (parseInt(count, 10) > 0) {
                focusMeta.textContent = count + ' market' + (count !== '1' ? 's' : '') + ' across ' + lgas + ' LGA' + (lgas !== '1' ? 's' : '');
              } else {
                focusMeta.textContent = 'No markets yet. This state is a good contribution target.';
              }
            }
            if (focusLink) focusLink.setAttribute('href', '/api/states/' + slug);
          }

          function resetFocus() {
            if (!viewport) return;
            currentTransform = { tx: 0, ty: 0, scale: 1 };
            renderTransform();
            map.classList.remove('map-focused');
            focusedSlug = null;
            dragState = null;
            setActiveGroup(null);
            if (reset) reset.hidden = true;
            if (focusCard) focusCard.hidden = true;
          }

          if (reset) {
            reset.addEventListener('click', function() {
              resetFocus();
            });
          }

          if (map) {
            map.addEventListener('pointerdown', function(event) {
              if (!focusedSlug) return;
              if (event.target.closest('.state-dot-group') || event.target.closest('.map-focus-card') || event.target.closest('.map-reset')) {
                return;
              }

              dragState = {
                pointerId: event.pointerId,
                startX: event.clientX,
                startY: event.clientY,
                originTx: currentTransform.tx,
                originTy: currentTransform.ty,
                moved: false,
              };

              map.classList.add('is-dragging');
              if (map.setPointerCapture) map.setPointerCapture(event.pointerId);
            });

            map.addEventListener('pointermove', function(event) {
              if (!dragState || dragState.pointerId !== event.pointerId || !focusedSlug) return;

              var dx = event.clientX - dragState.startX;
              var dy = event.clientY - dragState.startY;

              if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
                dragState.moved = true;
              }

              currentTransform.tx = dragState.originTx + dx;
              currentTransform.ty = dragState.originTy + dy;
              renderTransform();
            });

            function endDrag(event) {
              if (!dragState || dragState.pointerId !== event.pointerId) return;

              var moved = dragState.moved;
              dragState = null;
              map.classList.remove('is-dragging');
              if (map.releasePointerCapture) {
                try { map.releasePointerCapture(event.pointerId); } catch (e) {}
              }

              if (!moved && focusedSlug && !event.target.closest('.state-dot-group')) {
                resetFocus();
              }
            }

            map.addEventListener('pointerup', endDrag);
            map.addEventListener('pointercancel', endDrag);
          }

          groups.forEach(function(g) {
            g.addEventListener('mouseenter', function() {
              var name = g.getAttribute('data-name');
              var count = g.getAttribute('data-count');
              var lgas = g.getAttribute('data-lgas');
              if (parseInt(count) > 0) {
                tooltipText.textContent = name + ' — ' + count + ' market' + (count !== '1' ? 's' : '') + ' across ' + lgas + ' LGA' + (lgas !== '1' ? 's' : '');
              } else {
                tooltipText.textContent = name + ' — no markets yet. Help add some!';
              }
              tooltip.classList.add('tooltip-active');
            });

            g.addEventListener('mouseleave', function() {
              tooltipText.textContent = defaultText;
              tooltip.classList.remove('tooltip-active');
            });

            g.addEventListener('click', function(event) {
              event.stopPropagation();
              var slug = g.getAttribute('data-slug');
              var name = g.getAttribute('data-name');
              var count = g.getAttribute('data-count');
              var lgas = g.getAttribute('data-lgas');
              var x = parseFloat(g.getAttribute('data-x'));
              var y = parseFloat(g.getAttribute('data-y'));

              if (focusedSlug === slug) {
                resetFocus();
                return;
              }

              setActiveGroup(g);
              applyFocus(slug, name, count, lgas, x, y);
            });
          });
        })();
      `,
        }}
      />
    </div>
  );
};
