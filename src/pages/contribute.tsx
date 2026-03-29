import type { FC } from 'hono/jsx';

export const ContributePage: FC = () => {
  return (
    <div class="contribute">
      <h1>Contribute a Market</h1>
      <p>Help build the most complete directory of Nigerian markets. There are two ways to contribute:</p>

      <div class="contribute-options">
        <div class="option">
          <h2>Option 1: Submit via Form</h2>
          <p>Fill out the form below and we'll review your submission.</p>

          <form id="contribute-form" class="form">
            <div class="field">
              <label for="market_name">Market Name *</label>
              <input type="text" id="market_name" name="market_name" required placeholder="e.g. Balogun Market" />
            </div>
            <div class="field">
              <label for="state">State *</label>
              <input type="text" id="state" name="state" required placeholder="e.g. Lagos" />
            </div>
            <div class="field">
              <label for="lga">Local Government Area *</label>
              <input type="text" id="lga" name="lga" required placeholder="e.g. Lagos Island" />
            </div>
            <div class="field">
              <label>Location <span class="label-hint">Click the map to set the market location</span></label>
              <div id="map" class="map-picker"></div>
              <input type="hidden" id="lat" name="lat" />
              <input type="hidden" id="lng" name="lng" />
              <div id="coords-display" class="coords-display"></div>
            </div>
            <div class="field">
              <label for="description">Description</label>
              <textarea id="description" name="description" rows={3} placeholder="What is this market known for?"></textarea>
            </div>
            <div class="field">
              <label for="contributor_name">Your Name / GitHub Username</label>
              <input type="text" id="contributor_name" name="contributor_name" placeholder="e.g. ifihan" />
            </div>
            <button type="submit" class="btn">Submit Market</button>
            <div id="form-message" class="form-message"></div>
          </form>

          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

          <script dangerouslySetInnerHTML={{__html: `
            (function() {
              var map = L.map('map').setView([9.05, 7.49], 6);
              L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors',
                maxZoom: 19
              }).addTo(map);

              var marker = null;
              var latInput = document.getElementById('lat');
              var lngInput = document.getElementById('lng');
              var coordsDisplay = document.getElementById('coords-display');

              map.on('click', function(e) {
                var lat = e.latlng.lat.toFixed(6);
                var lng = e.latlng.lng.toFixed(6);

                if (marker) {
                  marker.setLatLng(e.latlng);
                } else {
                  marker = L.marker(e.latlng).addTo(map);
                }

                latInput.value = lat;
                lngInput.value = lng;
                coordsDisplay.textContent = lat + ', ' + lng;
                coordsDisplay.className = 'coords-display active';
              });

              // Fix map rendering in case container was hidden
              setTimeout(function() { map.invalidateSize(); }, 100);

              // Reset map on form reset
              document.getElementById('contribute-form').addEventListener('reset', function() {
                if (marker) {
                  map.removeLayer(marker);
                  marker = null;
                }
                latInput.value = '';
                lngInput.value = '';
                coordsDisplay.textContent = '';
                coordsDisplay.className = 'coords-display';
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
                if (data.lat) data.lat = parseFloat(data.lat);
                if (data.lng) data.lng = parseFloat(data.lng);

                const res = await fetch('/api/contribute', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(data),
                });
                const result = await res.json();

                if (result.success) {
                  msg.textContent = 'Thank you! Your submission has been received and will be reviewed.';
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
          `}} />
        </div>

        <div class="option">
          <h2>Option 2: Open a Pull Request</h2>
          <p>For contributors comfortable with Git:</p>
          <ol>
            <li>Fork the <a href="https://github.com/ifihan/nigerian-markets-api" target="_blank" rel="noopener">repository</a></li>
            <li>Open the state file at <code>data/states/&lt;state-slug&gt;.json</code></li>
            <li>Add your market to the correct LGA's <code>markets</code> array</li>
            <li>Submit a pull request — CI will validate your data automatically</li>
          </ol>
          <p>Market entry format:</p>
          <pre>{`{
  "name": "Balogun Market",
  "slug": "balogun-market",
  "coordinates": { "lat": 6.4541, "lng": 3.3947 },
  "added_by": "your-github-username"
}`}</pre>
        </div>
      </div>
    </div>
  );
};
