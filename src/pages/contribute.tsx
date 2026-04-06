import type { FC } from 'hono/jsx';

export const ContributePage: FC = () => {
  return (
    <div class="contribute">
      <h1>Contribute a Market</h1>
      <p>
        Help build the most complete directory of Nigerian markets. There are
        two ways to contribute:
      </p>

      <div class="contribute-options">
        <div class="option">
          <h2>Option 1: Submit via Form</h2>
          <p>Fill out the form below and we'll review your submission.</p>

          <form id="contribute-form" class="form">
            <div class="field">
              <label for="market_name">Market Name *</label>
              <input
                type="text"
                id="market_name"
                name="market_name"
                required
                placeholder="e.g. Balogun Market, Lagos Island"
              />
            </div>
            <div class="field">
              <label for="state">State *</label>
              <input
                type="text"
                id="state"
                name="state"
                required
                placeholder="e.g. Lagos"
              />
            </div>
            <div class="field">
              <label for="lga">Local Government Area *</label>
              <input
                type="text"
                id="lga"
                name="lga"
                required
                placeholder="e.g. Lagos Island"
              />
            </div>
            <div class="field">
              <label>
                Location *{' '}
                <span class="label-hint">
                  Click the map or enter coordinates manually
                </span>
              </label>
              <div id="map" class="map-picker"></div>
              <div class="coords-inputs">
                <div class="coord-field">
                  <label for="lat">Latitude</label>
                  <input
                    type="number"
                    id="lat"
                    name="lat"
                    required
                    step="any"
                    min="3"
                    max="15"
                    placeholder="e.g. 6.4541"
                  />
                </div>
                <div class="coord-field">
                  <label for="lng">Longitude</label>
                  <input
                    type="number"
                    id="lng"
                    name="lng"
                    required
                    step="any"
                    min="1"
                    max="16"
                    placeholder="e.g. 3.3947"
                  />
                </div>
              </div>
            </div>
            <div class="field">
              <label for="contributor_name">Your Name / GitHub Username</label>
              <input
                type="text"
                id="contributor_name"
                name="contributor_name"
                placeholder="e.g. ifihan"
              />
            </div>
            <button type="submit" class="btn">
              Submit Market
            </button>
            <div id="form-message" class="form-message"></div>
          </form>

          <link
            rel="stylesheet"
            href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          />
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

          <script
            dangerouslySetInnerHTML={{
              __html: `
            (function() {
              // Nigeria bounds — restrict map to this area
              var nigeriaBounds = L.latLngBounds(
                L.latLng(3.0, 1.0),   // SW corner
                L.latLng(14.5, 15.5)   // NE corner
              );

              var map = L.map('map', {
                maxBounds: nigeriaBounds,
                maxBoundsViscosity: 1.0,
                minZoom: 6,
                maxZoom: 18
              }).setView([9.05, 7.49], 6);

              L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors',
                bounds: nigeriaBounds
              }).addTo(map);

              var marker = null;
              var latInput = document.getElementById('lat');
              var lngInput = document.getElementById('lng');

              function updateMarker(lat, lng) {
                var latlng = L.latLng(lat, lng);
                if (marker) {
                  marker.setLatLng(latlng);
                } else {
                  marker = L.marker(latlng).addTo(map);
                }
              }

              // Map click → update inputs and marker
              map.on('click', function(e) {
                var lat = e.latlng.lat.toFixed(6);
                var lng = e.latlng.lng.toFixed(6);
                latInput.value = lat;
                lngInput.value = lng;
                updateMarker(lat, lng);
              });

              // Manual input → update marker and pan map
              function onManualInput() {
                var lat = parseFloat(latInput.value);
                var lng = parseFloat(lngInput.value);
                if (!isNaN(lat) && !isNaN(lng) && lat >= 3 && lat <= 15 && lng >= 1 && lng <= 16) {
                  updateMarker(lat, lng);
                  map.panTo([lat, lng]);
                }
              }
              latInput.addEventListener('change', onManualInput);
              lngInput.addEventListener('change', onManualInput);

              setTimeout(function() { map.invalidateSize(); }, 100);

              // Reset
              document.getElementById('contribute-form').addEventListener('reset', function() {
                if (marker) {
                  map.removeLayer(marker);
                  marker = null;
                }
                latInput.value = '';
                lngInput.value = '';
              });
            })();

            document.getElementById('contribute-form').addEventListener('submit', async (e) => {
              e.preventDefault();
              const form = e.target;
              const msg = document.getElementById('form-message');
              const btn = form.querySelector('button[type="submit"]');
              btn.disabled = true;
              btn.textContent = 'Submitting...';
              msg.textContent = '';
              msg.className = 'form-message';

              try {
                const data = Object.fromEntries(new FormData(form));
                data.lat = parseFloat(data.lat);
                data.lng = parseFloat(data.lng);

                if (isNaN(data.lat) || isNaN(data.lng)) {
                  msg.textContent = 'Please set the market location on the map or enter coordinates.';
                  msg.className = 'form-message error';
                  return;
                }

                const res = await fetch('/api/contribute', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(data),
                });
                const result = await res.json();

                if (result.success) {
                  var prUrl = result.data && result.data.pr_url;
                  msg.innerHTML = prUrl
                    ? 'Thank you! A <a href="' + prUrl + '" target="_blank" rel="noopener">pull request</a> has been created and will be merged shortly.'
                    : 'Thank you! Your submission has been received.';
                  msg.className = 'form-message success';
                  form.reset();
                } else {
                  msg.textContent = result.error?.message || 'Something went wrong. Please try again.';
                  msg.className = 'form-message error';
                }
              } catch {
                msg.textContent = 'Network error. Please try again.';
                msg.className = 'form-message error';
              } finally {
                btn.disabled = false;
                btn.textContent = 'Submit Market';
              }
            });
          `,
            }}
          />
        </div>

        <div class="option">
          <h2>Option 2: Open a Pull Request</h2>
          <p>For contributors comfortable with Git:</p>
          <ol>
            <li>
              Fork the{' '}
              <a
                href="https://github.com/ifihan/nigerian-markets-api"
                target="_blank"
                rel="noopener"
              >
                repository
              </a>
            </li>
            <li>
              Open the state file at{' '}
              <code>data/states/&lt;state-slug&gt;.json</code>
            </li>
            <li>
              Add your market to the correct LGA's <code>markets</code> array
            </li>
            <li>
              Submit a pull request — CI will validate your data automatically
            </li>
          </ol>
          <p>Market entry format:</p>
          <pre>{`{
  "name": "Balogun Market, Lagos Island",
  "slug": "balogun-market",
  "coordinates": { "lat": 6.4541, "lng": 3.3947 },
  "added_by": "your-github-username"
}`}</pre>
        </div>
      </div>
    </div>
  );
};
