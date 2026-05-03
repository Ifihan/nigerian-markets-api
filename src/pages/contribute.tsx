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
              <input type="text" id="market_name" name="market_name" required placeholder="e.g. Aleshinloye Market" />
              <p id="market-name-preview" class="field-note">
                Select a state and LGA to preview the final saved format.
              </p>
            </div>
            <div class="field">
              <label for="state">State *</label>
              <select id="state" name="state" required>
                <option value="">Loading states...</option>
              </select>
              <p class="field-note">Choose the state from the canonical list.</p>
            </div>
            <div class="field">
              <label for="lga">Local Government Area *</label>
              <select id="lga" name="lga" required disabled>
                <option value="">Select a state first</option>
              </select>
              <p class="field-note">The LGA list updates after you pick a state.</p>
            </div>
            <div class="field">
              <label>Location * <span class="label-hint">Click the map or enter coordinates manually</span></label>
              <div id="map" class="map-picker"></div>
              <div class="coords-inputs">
                <div class="coord-field">
                  <label for="lat">Latitude</label>
                  <input type="number" id="lat" name="lat" required step="any" min="3" max="15" placeholder="e.g. 6.4541" />
                </div>
                <div class="coord-field">
                  <label for="lng">Longitude</label>
                  <input type="number" id="lng" name="lng" required step="any" min="1" max="16" placeholder="e.g. 3.3947" />
                </div>
              </div>
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
              var stateInput = document.getElementById('state');
              var lgaInput = document.getElementById('lga');
              var marketNameInput = document.getElementById('market_name');
              var preview = document.getElementById('market-name-preview');
              var formMessage = document.getElementById('form-message');

              function normalizeSpacing(value) {
                return (value || '').trim().replace(/\\s+/g, ' ');
              }

              function titleCase(value) {
                return normalizeSpacing(value)
                  .split(' ')
                  .filter(Boolean)
                  .map(function(word) {
                    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
                  })
                  .join(' ');
              }

              function getSelectedLabel(select) {
                if (!select || !select.selectedOptions || !select.selectedOptions[0]) return '';
                return select.selectedOptions[0].textContent || '';
              }

              function setPreview() {
                var marketName = titleCase(marketNameInput.value);
                var lgaLabel = getSelectedLabel(lgaInput);

                if (!marketName && !lgaInput.value) {
                  preview.textContent = 'Select a state and LGA to preview the final saved format.';
                  return;
                }

                if (!marketName) {
                  preview.textContent = 'Enter the market name to preview the final saved format.';
                  return;
                }

                if (!lgaInput.value) {
                  preview.textContent = 'Select an LGA to preview the final saved format.';
                  return;
                }

                var finalName = marketName.toLowerCase().endsWith(', ' + lgaLabel.toLowerCase())
                  ? marketName
                  : marketName + ', ' + lgaLabel;

                preview.textContent = 'Saved as: ' + finalName;
              }

              function setLgaOptions(lgas) {
                lgaInput.innerHTML = '';

                var placeholder = document.createElement('option');
                placeholder.value = '';
                placeholder.textContent = lgas.length ? 'Select an LGA' : 'No LGAs available';
                lgaInput.appendChild(placeholder);

                lgas.forEach(function(lga) {
                  var option = document.createElement('option');
                  option.value = lga.slug;
                  option.textContent = lga.name;
                  lgaInput.appendChild(option);
                });

                lgaInput.disabled = !lgas.length;
                lgaInput.value = '';
                setPreview();
              }

              async function loadStates() {
                try {
                  var res = await fetch('/api/states');
                  var result = await res.json();

                  if (!result.success) throw new Error('Failed to load states');

                  stateInput.innerHTML = '';

                  var placeholder = document.createElement('option');
                  placeholder.value = '';
                  placeholder.textContent = 'Select a state';
                  stateInput.appendChild(placeholder);

                  result.data.forEach(function(state) {
                    var option = document.createElement('option');
                    option.value = state.slug;
                    option.textContent = state.name;
                    stateInput.appendChild(option);
                  });
                } catch (error) {
                  stateInput.innerHTML = '<option value="">Unable to load states</option>';
                  stateInput.disabled = true;
                  lgaInput.innerHTML = '<option value="">Unable to load LGAs</option>';
                  lgaInput.disabled = true;
                  formMessage.textContent = 'We could not load the state and LGA lists right now. Please refresh and try again.';
                  formMessage.className = 'form-message error';
                }
              }

              async function loadLgasForState(stateSlug) {
                if (!stateSlug) {
                  lgaInput.innerHTML = '<option value="">Select a state first</option>';
                  lgaInput.disabled = true;
                  setPreview();
                  return;
                }

                lgaInput.disabled = true;
                lgaInput.innerHTML = '<option value="">Loading LGAs...</option>';

                try {
                  var res = await fetch('/api/lgas?state=' + encodeURIComponent(stateSlug));
                  var result = await res.json();

                  if (!result.success) throw new Error('Failed to load LGAs');

                  setLgaOptions(result.data || []);
                } catch (error) {
                  lgaInput.innerHTML = '<option value="">Unable to load LGAs</option>';
                  lgaInput.disabled = true;
                  setPreview();
                  formMessage.textContent = 'We could not load the LGAs for that state. Please try again.';
                  formMessage.className = 'form-message error';
                }
              }

              stateInput.addEventListener('change', function() {
                formMessage.textContent = '';
                formMessage.className = 'form-message';
                loadLgasForState(stateInput.value);
              });

              lgaInput.addEventListener('change', setPreview);
              marketNameInput.addEventListener('input', setPreview);

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
                stateInput.value = '';
                lgaInput.innerHTML = '<option value="">Select a state first</option>';
                lgaInput.disabled = true;
                setPreview();
              });

              loadStates();
              setPreview();
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
