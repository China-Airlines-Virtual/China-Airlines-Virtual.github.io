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
        return pilots
    }

    function formatTimeFromSeconds(time) {
        const inHours = time / 3600
        const hours = Math.floor(inHours)
        const minutes = (inHours - hours) * 60
        return `${hours}${minutes}`
    }

    function addZuluTimes(time1, time2) {
        console.log(time1, time2)
        const addedMinutes = (Number(time1.slice(2)) + Number(time2.slice(2)) + '')
        const minutes = (addedMinutes % 60 + '').padStart(2, 0)
        const hours = (Number(time1.slice(0, 2)) + Number(time2.slice(0, 2)) + Math.floor(addedMinutes / 60) + '').padStart(2, 0)
        return `${hours}${minutes}`
    }

    const updateFlipFlapBoar = createFlipFlapBoard(
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(() => ''.padEnd(27))
    )
    Promise.all([
        fetch('https://api.ivao.aero/v2/tracker/whazzup')
            .then((response) => response.json())
            .then((data) => {
                const rctpPilots = data.clients.pilots.filter(({ flight_plan }) =>
                    flight_plan?.departure.startsWith('RC') || flight_plan?.arrival.startsWith('RC'))
                return rctpPilots.map((pilot) => ({
                    id: 'I' + pilot.userId,
                    callsign: pilot.callsign,
                    userId: pilot.userId,
                    latitude: pilot.lastTrack.latitude,
                    longitude: pilot.lastTrack.longitude,
                    heading: pilot.lastTrack.heading,
                    departure: pilot.flight_plan.departure,
                    arrival: pilot.flight_plan.arrival,
                    departureTime: formatTimeFromSeconds(pilot.flight_plan.departureTime),
                    arrivalTime: formatTimeFromSeconds(pilot.flight_plan.departureTime + pilot.flight_plan.eet),
                }))
            })
            .then(renderAircraftsOnMap),
        fetch('https://data.vatsim.net/v3/vatsim-data.json')
            .then((response) => response.json())
            .then((data) => {
                const rctpPilots = data.pilots.filter(({ flight_plan }) =>
                    flight_plan?.departure.startsWith('RC') || flight_plan?.arrival.startsWith('RC'))
                return rctpPilots.map((pilot) => ({
                    id: 'V' + pilot.cid,
                    callsign: pilot.callsign,
                    userId: pilot.cid,
                    latitude: pilot.latitude,
                    longitude: pilot.longitude,
                    heading: pilot.heading,
                    departure: pilot.flight_plan.departure,
                    arrival: pilot.flight_plan.arrival,
                    departureTime: pilot.flight_plan.deptime,
                    arrivalTime: addZuluTimes(pilot.flight_plan.deptime, pilot.flight_plan.enroute_time),
                }))
            })
            .then(renderAircraftsOnMap)
    ])
        .then(([ivaoPilots, vatsimPilots]) => {
            const pilots = ivaoPilots.concat(vatsimPilots)
            const stringRows = pilots.map((pilot) =>
                `${pilot.callsign.padEnd(7)} ${pilot.departure} ${pilot.arrival} ${pilot.departureTime} ${pilot.arrivalTime}`
            ).map(d => d.padEnd(27));
            updateFlipFlapBoar(stringRows, true)
        })
}