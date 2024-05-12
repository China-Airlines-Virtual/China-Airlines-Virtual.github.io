function createMarker(heading, callsign) {
    const span = document.createElement('span')
    span.className = 'material-symbols-outlined marker-icon'
    span.innerText = 'flight'
    span.style.transform = `rotate(${heading}deg)`
    const flightSpan = document.createElement('span')
    flightSpan.className = 'flight-span'
    flightSpan.innerText = callsign
    const div = document.createElement('div')
    div.appendChild(span)
    div.appendChild(flightSpan)
    return div
}

function initMapReplay(targetElementId, timelineName, center, zoom, members) {
    if (typeof L === 'undefined') {
        console.error('Leaflet library is not loaded');
        return;
    }

    const targetElement = document.getElementById(targetElementId);
    targetElement.style.height = '100%';
    targetElement.style.width = '100%';

    const map = L.map(targetElementId).setView(center, zoom);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap contributors</a>'
    }).addTo(map);

    const markerMap = new Map();
    const lastSeenTick = {};

    fetch(timelineName)
        .then(async (response) => {
            const data = await response.json();
            const timelineKey = Object.keys(data);

            let tick = 0;
            const intervalId = setInterval(() => {
                const tickData = data[timelineKey[tick]];
                for (const pilot of tickData) {
                    if (markerMap.has(pilot.cid)) {
                        markerMap.get(pilot.cid).setLatLng([pilot.latitude, pilot.longitude]);
                        markerMap.get(pilot.cid)
                            ._icon
                            .querySelector('.marker-icon')
                            .style
                            .transform = `rotate(${pilot.heading}deg)`
                    } else {
                        // Build popup
                        const callsign = document.createElement('div')
                        callsign.innerText = pilot.callsign
                        const name = document.createElement('div')
                        const member = members.find(member => member.vatsimId === String(pilot.cid))
                        if (member) {
                            const a = document.createElement('a')
                            a.href = `#member-${member.callsign.toLowerCase()}`
                            a.innerText = member.name
                            name.appendChild(a)
                        } else {
                            name.innerText = pilot.name
                        }
                        const popup = document.createElement('div')
                        popup.appendChild(callsign)
                        popup.appendChild(name)

                        markerMap.set(
                            pilot.cid,
                            L.marker([pilot.latitude, pilot.longitude], {
                                title: pilot.callsign,
                                icon: new L.DivIcon({
                                    className: 'flight-icon',
                                    html: createMarker(pilot.heading, pilot.callsign)
                                })
                            }).bindPopup(popup).addTo(map)
                        )
                    }

                    lastSeenTick[pilot.cid] = tick;
                }
                tick++;

                if (tick >= timelineKey.length) {
                    console.log('stop');
                    clearInterval(intervalId);
                }

                if (tick % 25 === 0) {
                    for (const cid in markerMap) {
                        if (lastSeenTick[cid] !== undefined && lastSeenTick[cid] < tick - 25) {
                            map.removeLayer(markerMap[cid]);
                            delete markerMap[cid];
                        }
                    }
                }
            }, 200);
        });
}

function initLiveMap(targetElementId, center, zoom) {
    const targetElement = document.getElementById(targetElementId);
    targetElement.style.height = '100%';
    targetElement.style.width = '100%';

    const map = L.map(targetElementId, {
        fullscreenControl: true,
    }).setView(center, zoom);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap contributors</a>'
    }).addTo(map);

    function renderAircraftsOnMap(pilots) {
        pilots.forEach((pilot) => {
            const { latitude, longitude } = pilot

            L.marker([latitude, longitude], {
                title: pilot.callsign,
                icon: new L.DivIcon({
                    className: 'flight-icon',
                    html: createMarker(pilot.heading, pilot.callsign)
                })
            }).addTo(map)
        });
    }

    fetch('https://api.ivao.aero/v2/tracker/whazzup')
        .then((response) => response.json())
        .then((data) => {
            const rctpPilots = data.clients.pilots.filter(({ flight_plan }) =>
                flight_plan?.departure === 'RCTP' || flight_plan?.arrival === 'RCTP')
            return rctpPilots.map((pilot) => ({
                id: 'I' + pilot.userId,
                callsign: pilot.callsign,
                userId: pilot.userId,
                latitude: pilot.lastTrack.latitude,
                longitude: pilot.lastTrack.longitude,
                heading: pilot.lastTrack.heading
            }))
        })
        .then(renderAircraftsOnMap)
    fetch('https://data.vatsim.net/v3/vatsim-data.json')
        .then((response) => response.json())
        .then((data) => {
            const rctpPilots = data.pilots.filter(({ flight_plan }) =>
                flight_plan?.departure === 'RCTP' || flight_plan?.arrival === 'RCTP')
            return rctpPilots.map((pilot) => ({
                id: 'V' + pilot.cid,
                callsign: pilot.callsign,
                userId: pilot.cid,
                latitude: pilot.latitude,
                longitude: pilot.longitude,
                heading: pilot.heading
            }))
        })
        .then(renderAircraftsOnMap)
}