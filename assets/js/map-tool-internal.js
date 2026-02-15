let parsedLines = undefined;
let map = undefined;

const greenDotIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    shadowSize: [41, 41]
});

// Helper to convert 'N025.04.25.361' or 'E121.13.02.497' to decimal degrees
function parseCoord(coord) {
    // Example: N025.04.25.361
    const match = coord.match(/^([NS])(\d{3})\.(\d{2})\.(\d{2})\.(\d{3})$/) || coord.match(/^([NS])(\d{3})\.(\d{2})\.(\d{2})\.(\d{1,})$/) || coord.match(/^([NS])(\d{3})\.(\d{2})\.(\d{2})\.(\d{2,})$/);
    if (!match) {
        // Try longitude: E121.13.02.497
        const lonMatch = coord.match(/^([EW])(\d{3})\.(\d{2})\.(\d{2})\.(\d{3})$/) || coord.match(/^([EW])(\d{3})\.(\d{2})\.(\d{2})\.(\d{1,})$/) || coord.match(/^([EW])(\d{3})\.(\d{2})\.(\d{2})\.(\d{2,})$/);
        if (!lonMatch) return null;
        const sign = lonMatch[1] === 'E' ? 1 : -1;
        const deg = parseInt(lonMatch[2], 10);
        const min = parseInt(lonMatch[3], 10);
        const sec = parseInt(lonMatch[4], 10);
        const ms = parseInt(lonMatch[5], 10) / Math.pow(10, lonMatch[5].length); // handle variable ms length
        return sign * (deg + min / 60 + (sec + ms) / 3600);
    }
    const sign = match[1] === 'N' ? 1 : -1;
    const deg = parseInt(match[2], 10);
    const min = parseInt(match[3], 10);
    const sec = parseInt(match[4], 10);
    const ms = parseInt(match[5], 10) / Math.pow(10, match[5].length); // handle variable ms length
    return sign * (deg + min / 60 + (sec + ms) / 3600);
}

// Helper to convert decimal degrees to 'N025.04.25.361' or 'E121.13.02.497'
function toDMS(coord, isLat) {
    const abs = Math.abs(coord);
    const deg = Math.floor(abs);
    const minFloat = (abs - deg) * 60;
    const min = Math.floor(minFloat);
    const secFloat = (minFloat - min) * 60;
    const sec = Math.floor(secFloat);
    const ms = Math.round((secFloat - sec) * 1000);
    const dir = isLat ? (coord >= 0 ? 'N' : 'S') : (coord >= 0 ? 'E' : 'W');
    // Pad with zeros
    const degStr = deg.toString().padStart(3, '0');
    const minStr = min.toString().padStart(2, '0');
    const secStr = sec.toString().padStart(2, '0');
    const msStr = ms.toString().padStart(3, '0');
    return `${dir}${degStr}.${minStr}.${secStr}.${msStr}`;
}

function updateMarkerCoordDisplay(lat, lng) {
    const latStr = toDMS(lat, true);
    const lngStr = toDMS(lng, false);
    const display = document.getElementById('marker-coord-display');
    if (display) {
        display.textContent = `${latStr} ${lngStr}`;
    }
}

function drawLine(map, item) {
    if (!item) return;
    const latlngs = [
        [parseCoord(item.lat1), parseCoord(item.lon1)],
        [parseCoord(item.lat2), parseCoord(item.lon2)]
    ];
    // Only draw if all coordinates are valid
    if (latlngs[0].every(v => v !== null) && latlngs[1].every(v => v !== null)) {
        const line = L.polyline(latlngs, { color: 'blue' });
        const popupContent = `Start: ${item.lat1}, ${item.lon1}<br>End: ${item.lat2}, ${item.lon2}`;
        line.bindPopup(popupContent);
        // console.log(line);
        line.addTo(map);
    }
}

let marker = null;

function initMapReplay(targetElementId, timelineName, center, zoom, members) {
    if (typeof L === 'undefined') {
        console.error('Leaflet library is not loaded');
        return;
    }

    const targetElement = document.getElementById(targetElementId);
    targetElement.style.height = '100%';
    targetElement.style.width = '100%';

    // Assign to global map variable so drawLine and drawNextLine work
    map = L.map(targetElementId,
        {
            // scrollWheelZoom: false
        }
    ).setView(center, zoom);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap contributors</a>'
    }).addTo(map);

    const markerMap = new Map();
    const lastSeenTick = {};

    // Define a blue dot icon for the marker
    const blueDotIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        shadowSize: [41, 41]
    });

    // Add a draggable marker at the map center, but move to first parsed point if available
    marker = L.marker([center.lat, center.lon], { draggable: true, icon: blueDotIcon }).addTo(map);
    updateMarkerCoordDisplay(center.lat, center.lon);
    marker.on('drag', function(e) {
        const { lat, lng } = e.target.getLatLng();
        updateMarkerCoordDisplay(lat, lng);
    });
    marker.on('move', function(e) {
        const { lat, lng } = e.target.getLatLng();
        updateMarkerCoordDisplay(lat, lng);
    });

}

let nowIndex = 0;
let drawnLines = [];

function updateLineHistory() {
    const historyDiv = document.getElementById('line-history');
    if (!historyDiv) return;
    if (drawnLines.length === 0) {
        historyDiv.value = 'No lines drawn yet.';
        return;
    }
    historyDiv.value = 'Line History:\n' + drawnLines.map((item, idx) => {
        const start = `${item.lat1} ${item.lon1}`;
        const end = `${item.lat2} ${item.lon2}`;
        return `${idx + 1}. ${start} ${end}`;
    }).join('\n');
}

function drawNextLine() {
    if (parsedLines && nowIndex < parsedLines.length) {
        const nowLine = parsedLines[nowIndex++];
        // console.log('Drew line', nowLine);
        drawLine(map, nowLine);
        drawnLines.push(nowLine);
        updateLineHistory();
    } else {
        // Optionally disable button if no more lines
        const btn = document.getElementById('draw-next-line-btn');
        if (btn) btn.disabled = true;
    }
}

function drawAllLines() {
    if (parsedLines) {
        while (nowIndex < parsedLines.length) {
            drawNextLine();
        }
        const btn = document.getElementById('draw-all-lines-btn');
        if (btn) btn.disabled = true;
    }
}

function parseDataFromTextarea() {
    const data = document.getElementById('data-input').value;
    console.log(data);
    const lines = data.split('\n');
    parsedLines = lines.map(line => {
        console.log(line);
        if (!line.trim()) return null;
        const parts = line.trim().split(/\s+/);
        if (parts.length < 4) return null;
        if (parts.length < 5) return {
            lat1: parts[0],
            lon1: parts[1],
            lat2: parts[2],
            lon2: parts[3],
            type: 'null'
        };
        return {
            lat1: parts[0],
            lon1: parts[1],
            lat2: parts[2],
            lon2: parts[3],
            type: parts.slice(4).join(' ')
        };
    }).filter(Boolean);

    // Reset state
    nowIndex = 0;
    drawnLines = [];
    updateLineHistory();

    // Show draw button and enable it
    const drawBtn = document.getElementById('draw-next-line-btn');
    if (drawBtn) {
        drawBtn.style.display = 'inline-block';
        drawBtn.disabled = false;
    }
    const drawAllBtn = document.getElementById('draw-all-lines-btn');
    if (drawAllBtn) {
        drawAllBtn.style.display = 'inline-block';
        drawAllBtn.disabled = false;
    }
    // Disable parse button
    const parseBtn = document.getElementById('parse-data-btn');
    if (parseBtn) parseBtn.disabled = true;
}

function calculateDMS() {
    const centerDMS = document.getElementById('center-dms').value;
    const heading = parseFloat(document.getElementById('heading').value);
    const leftDistance = parseFloat(document.getElementById('left-distance').value);
    const rightDistance = parseFloat(document.getElementById('right-distance').value);
    const resultDiv = document.getElementById('dms-result');

    if (!centerDMS || isNaN(heading) || isNaN(leftDistance) || isNaN(rightDistance)) {
        resultDiv.textContent = 'Invalid input. Please fill all fields.';
        return;
    }

    const parts = centerDMS.trim().split(/\s+/);
    if (parts.length !== 2) {
        resultDiv.textContent = 'Invalid Center DMS format. Expected format: "N... E..."';
        return;
    }

    const lat1 = parseCoord(parts[0]);
    const lon1 = parseCoord(parts[1]);

    if (lat1 === null || lon1 === null) {
        resultDiv.textContent = 'Invalid coordinate format in Center DMS.';
        return;
    }

    const R = 6371000; // Earth radius in meters

    function calculateDestination(lat, lon, bearing, distance) {
        const latRad = lat * Math.PI / 180;
        const lonRad = lon * Math.PI / 180;
        const bearingRad = bearing * Math.PI / 180;

        const lat2Rad = Math.asin(Math.sin(latRad) * Math.cos(distance / R) +
            Math.cos(latRad) * Math.sin(distance / R) * Math.cos(bearingRad));
        const lon2Rad = lonRad + Math.atan2(Math.sin(bearingRad) * Math.sin(distance / R) * Math.cos(latRad),
            Math.cos(distance / R) - Math.sin(latRad) * Math.sin(lat2Rad));

        return [lat2Rad * 180 / Math.PI, lon2Rad * 180 / Math.PI];
    }

    const leftBearing = (heading - 90 + 360) % 360;
    const rightBearing = (heading + 90) % 360;

    const [leftLat, leftLon] = calculateDestination(lat1, lon1, leftBearing, leftDistance);
    const [rightLat, rightLon] = calculateDestination(lat1, lon1, rightBearing, rightDistance);

    const leftLatDMS = toDMS(leftLat, true);
    const leftLonDMS = toDMS(leftLon, false);
    const rightLatDMS = toDMS(rightLat, true);
    const rightLonDMS = toDMS(rightLon, false);

    resultDiv.innerHTML = `Left Point: ${leftLatDMS} ${leftLonDMS}<br>Right Point: ${rightLatDMS} ${rightLonDMS}`;
}

function drawAreaFromTextarea() {
    const data = document.getElementById('area-data-input').value;
    const showTooltips = document.getElementById('show-area-tooltips').checked;
    const lines = data.split('\n');

    let areas = [];
    let currentArea = [];

    lines.forEach(line => {
        line = line.trim();
        if (!line) return;

        if (line.startsWith('N')) {
            currentArea.push(line);
        } else {
            if (currentArea.length > 0) {
                areas.push(currentArea);
            }
            currentArea = [line]; // Start a new area, but this line is a header, so we might discard it or use it.
            // Assuming the line not starting with 'N' is a header and should be ignored for coordinates.
            // If it contains coordinates, the logic needs to be adjusted.
            // For now, let's start a new area and the next 'N' lines will be part of it.
            // Let's adjust to handle the case where the line not starting with 'N' is a name for the area.
            // The user said "if you find line not start with `N` then it's mean below is a new area"
            // This implies the line itself is a separator, not part of any area.
            areas.push(currentArea);
            currentArea = [];
        }
    });

    if (currentArea.length > 0) {
        areas.push(currentArea);
    }

    // The above logic is a bit flawed. Let's try a simpler approach.
    areas = [];
    currentArea = [];
    for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.length === 0) continue;

        if (!trimmedLine.startsWith('N')) {
            if (currentArea.length > 0) {
                areas.push(currentArea);
            }
            currentArea = [];
        } else {
            currentArea.push(trimmedLine);
        }
    }
    if (currentArea.length > 0) {
        areas.push(currentArea);
    }


    const allPolygonsCoords = [];
    const colors = ['red', 'blue', 'green', 'purple', 'orange', 'yellow', 'cyan', 'magenta'];

    areas.forEach((areaLines, index) => {
        const latlngs = areaLines.map(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length < 2) return null;
            const lat = parseCoord(parts[0]);
            const lon = parseCoord(parts[1]);
            if (lat === null || lon === null) return null;
            return { lat, lon, original: `${parts[0]} ${parts[1]}` };
        }).filter(Boolean);

        if (latlngs.length > 2) {
            const polygonCoords = latlngs.map(p => [p.lat, p.lon]);
            const color = colors[index % colors.length];
            const polygon = L.polygon(polygonCoords, { color: color }).addTo(map);

            if (index === 0) { // Fit map to the first area
                map.fitBounds(polygon.getBounds());
            }

            allPolygonsCoords.push(polygonCoords);

            if (showTooltips) {
                latlngs.forEach(point => {
                    const marker = L.marker([point.lat, point.lon], { icon: greenDotIcon })
                        .addTo(map)
                        .bindPopup(point.original);

                    marker.on('popupopen', function (e) {
                        const content = e.popup.getContent();
                        navigator.clipboard.writeText(content);
                    });
                });
            }
        }
    });

    const areaHistory = document.getElementById('area-history');
    areaHistory.value = JSON.stringify(allPolygonsCoords, null, 2);
}

// Add event listener for the button after DOM is loaded
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', function() {
        let lastPoint = null;
        const addMarkerPairBtn = document.getElementById('add-marker-pair-btn');
        if (addMarkerPairBtn) {
            addMarkerPairBtn.addEventListener('click', function() {
                if (!marker) return;
                console.log('clicked');
                const { lat, lng } = marker.getLatLng();

                if (lastPoint === null) {
                    lastPoint = { lat, lng };
                    console.log('First point set:', lastPoint);
                    // Maybe provide some user feedback here
                } else {
                    const lat1 = toDMS(lastPoint.lat, true);
                    const lon1 = toDMS(lastPoint.lng, false);
                    const lat2 = toDMS(lat, true);
                    const lon2 = toDMS(lng, false);
                    const line = `${lat1} ${lon1} ${lat2} ${lon2} COLOR_TWYLine`;
                    const textarea = document.getElementById('data-input');
                    if (textarea) {
                        if (textarea.value && !textarea.value.endsWith('\n')) {
                            textarea.value += '\n';
                        }
                        textarea.value += line + '\n';
                    }
                    lastPoint = { lat, lng }; // Set current location as the start for the next line
                    console.log('Second point set, line added:', line);
                    console.log('New start point set:', lastPoint);
                }
            });
        }

        const drawBtn = document.getElementById('draw-next-line-btn');
        if (drawBtn) drawBtn.addEventListener('click', drawNextLine);

        const drawAllBtn = document.getElementById('draw-all-lines-btn');
        if (drawAllBtn) drawAllBtn.addEventListener('click', drawAllLines);

        const parseBtn = document.getElementById('parse-data-btn');
        if (parseBtn) parseBtn.addEventListener('click', parseDataFromTextarea);

        const calcBtn = document.getElementById('calculate-dms-btn');
        if (calcBtn) calcBtn.addEventListener('click', calculateDMS);

        const drawAreaBtn = document.getElementById('draw-area-btn');
        if (drawAreaBtn) drawAreaBtn.addEventListener('click', drawAreaFromTextarea);

        const calcProjectionBtn = document.getElementById('calculate-projection-btn');
        if (calcProjectionBtn) calcProjectionBtn.addEventListener('click', calculateProjection);

        const calcDestinationBtn = document.getElementById('calculate-destination-btn');
        if (calcDestinationBtn) calcDestinationBtn.addEventListener('click', calculateDestinationPoint);

        updateLineHistory();
    });
}

function calculateDestinationPoint() {
    debugger;
    const startDMS = document.getElementById('destination-start-dms').value;
    const heading = parseFloat(document.getElementById('destination-heading').value);
    const distance = parseFloat(document.getElementById('destination-distance').value);
    const resultDiv = document.getElementById('destination-result');

    if (!startDMS || isNaN(heading) || isNaN(distance)) {
        resultDiv.textContent = 'Invalid input. Please fill all fields.';
        return;
    }

    const startParts = startDMS.trim().split(/\s+/);
    if (startParts.length !== 2) {
        resultDiv.textContent = 'Invalid Start Point DMS format.';
        return;
    }

    const startLat = parseCoord(startParts[0]);
    const startLon = parseCoord(startParts[1]);

    if (startLat === null || startLon === null) {
        resultDiv.textContent = 'Invalid coordinate format in Start Point DMS.';
        return;
    }

    const R = 6371000; // Earth radius in meters
    function calculateDestination(lat, lon, bearing, distance) {
        const latRad = lat * Math.PI / 180;
        const lonRad = lon * Math.PI / 180;
        const bearingRad = bearing * Math.PI / 180;

        const lat2Rad = Math.asin(Math.sin(latRad) * Math.cos(distance / R) +
            Math.cos(latRad) * Math.sin(distance / R) * Math.cos(bearingRad));
        const lon2Rad = lonRad + Math.atan2(Math.sin(bearingRad) * Math.sin(distance / R) * Math.cos(latRad),
            Math.cos(distance / R) - Math.sin(latRad) * Math.sin(lat2Rad));

        return [lat2Rad * 180 / Math.PI, lon2Rad * 180 / Math.PI];
    }

    const [destLat, destLon] = calculateDestination(startLat, startLon, heading, distance);

    const destLatDMS = toDMS(destLat, true);
    const destLonDMS = toDMS(destLon, false);

    resultDiv.innerHTML = `Destination Point: ${destLatDMS} ${destLonDMS}`;
}

function calculateProjection() {
    const startDMS = document.getElementById('projection-start-dms').value;
    const heading = parseFloat(document.getElementById('projection-heading').value);
    const pointsData = document.getElementById('projection-points').value;
    const resultDiv = document.getElementById('projection-result');

    if (!startDMS || isNaN(heading) || !pointsData) {
        resultDiv.textContent = 'Invalid input. Please fill all fields.';
        return;
    }

    const startParts = startDMS.trim().split(/\s+/);
    if (startParts.length !== 2) {
        resultDiv.textContent = 'Invalid Start Point DMS format.';
        return;
    }

    const startLat = parseCoord(startParts[0]);
    const startLon = parseCoord(startParts[1]);

    if (startLat === null || startLon === null) {
        resultDiv.textContent = 'Invalid coordinate format in Start Point DMS.';
        return;
    }

    const R = 6371000; // Earth radius in meters
    function calculateDestination(lat, lon, bearing, distance) {
        const latRad = lat * Math.PI / 180;
        const lonRad = lon * Math.PI / 180;
        const bearingRad = bearing * Math.PI / 180;

        const lat2Rad = Math.asin(Math.sin(latRad) * Math.cos(distance / R) +
            Math.cos(latRad) * Math.sin(distance / R) * Math.cos(bearingRad));
        const lon2Rad = lonRad + Math.atan2(Math.sin(bearingRad) * Math.sin(distance / R) * Math.cos(latRad),
            Math.cos(distance / R) - Math.sin(latRad) * Math.sin(lat2Rad));

        return [lat2Rad * 180 / Math.PI, lon2Rad * 180 / Math.PI];
    }

    // Create a second point to define the line for projection
    const [endLat, endLon] = calculateDestination(startLat, startLon, heading, 10000); // 10km away

    const linePoints = [L.latLng(startLat, startLon), L.latLng(endLat, endLon)];
    const p1 = map.latLngToLayerPoint(linePoints[0]);
    const p2 = map.latLngToLayerPoint(linePoints[1]);

    const pointLines = pointsData.split('\n');
    const projectedPoints = pointLines.map(line => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return null;
        const parts = trimmedLine.split(':');
        if (parts.length < 2) return null;

        const pointLat = parseCoord(parts[0]);
        const pointLon = parseCoord(parts[1]);

        if (pointLat === null || pointLon === null) return `Invalid point: ${line}`;

        const pointLatLng = L.latLng(pointLat, pointLon);
        const p = map.latLngToLayerPoint(pointLatLng);

        // Use L.LineUtil.closestPointOnSegment which effectively projects the point onto the line segment
        const closestPoint = L.LineUtil.closestPointOnSegment(p, p1, p2);
        const closestLatLng = map.layerPointToLatLng(closestPoint);

        return `${toDMS(closestLatLng.lat, true)}:${toDMS(closestLatLng.lng, false)}:${parts[2]}:${parts[3]}`;
    }).filter(Boolean);

    resultDiv.innerHTML = projectedPoints.join('<br>');
}

let lineStart = null;
let drawnLineLayer = null;
let nearestPointMarker = null;
