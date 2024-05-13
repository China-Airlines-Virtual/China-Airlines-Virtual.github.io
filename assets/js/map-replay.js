function createMarker(heading, callsign, color = 'black') {
    const span = document.createElement('span')
    span.className = 'material-symbols-outlined marker-icon'
    span.innerText = 'flight'
    span.style.transform = `rotate(${heading}deg)`
    span.style.color = color
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

let airportCityMap = null
const isIcaoVersion = !window.matchMedia('(min-width: 1200px)').matches
const FLAPS_PER_ROW = (isIcaoVersion) ? 25 : 43

function padAndSlice(str, length) {
    return str.padEnd(length).slice(0, length)
}

function replaceNonAlphabetAndNumericWithSpace(str) {
    return str.replace(/[^A-Z0-9]/g, ' ')
}

async function loadAirportCityMap() {
    airportCityMap = await fetch('assets/airports.csv')
        .then((resp) => resp.text())
        .then((data) => {
            const results = Papa.parse(data)
            const newAirportCityMap = new Map()
            results.data
                .filter((row) => row[0].trim() !== '')
                .forEach(
                    (row) => newAirportCityMap.set(
                        row[0].trim(),
                        row[1].trim().toUpperCase().slice(0, 13)
                    )
                )
            return newAirportCityMap
        })
}

async function initFlipFlapBoard() {
    document.getElementById('flip-flap-header').innerText = (isIcaoVersion)
        ? '　　班次　　出發　　目的地 離場　　抵達'
        : '　　班次　　　　　　出發　　　　　　　　目的地　　　　離場　　抵達 登機'
    const updateFlipFlapBoard = createFlipFlapBoard(
        11,
        FLAPS_PER_ROW
    )

    if (!isIcaoVersion && airportCityMap === null) {
        await loadAirportCityMap()
    }

    return function (pilots) {
        const stringRows = pilots.map((pilot) => {
            const departureCity = (isIcaoVersion)
                ? pilot.departure
                : replaceNonAlphabetAndNumericWithSpace(
                    airportCityMap.get(pilot.departure) || pilot.departure
                )
            const arrivalCity = (isIcaoVersion)
                ? pilot.arrival
                : replaceNonAlphabetAndNumericWithSpace(
                    airportCityMap.get(pilot.arrival) || pilot.arrival
                )
            const airportWidth = (isIcaoVersion) ? 4 : 13
            return padAndSlice(pilot.callsign, 7) + ' ' +
                padAndSlice(departureCity, airportWidth) + ' ' +
                padAndSlice(arrivalCity, airportWidth) +
                padAndSlice(pilot.departureTime, 4) +
                padAndSlice(pilot.arrivalTime, 4)
        }).map(d => padAndSlice(d, FLAPS_PER_ROW));
        const blinkRows = pilots.map((pilot) => !!pilot.isBoarding)
        updateFlipFlapBoard(stringRows, blinkRows, true)
    }
}

function formatTimeFromSeconds(time) {
    const inHours = time / 3600
    const hours = Math.floor(inHours)
    const hoursStr = String(Math.floor(inHours)).padStart(2, 0)
    const minutesStr = String(time / 60 - hours * 60).padStart(2, 0)
    return `${hoursStr}${minutesStr}`
}

function addZuluTimes(time1, time2) {
    const addedMinutes = (Number(time1.slice(2)) + Number(time2.slice(2)) + '')
    const minutes = (addedMinutes % 60 + '').padStart(2, 0)
    const hours = (Number(time1.slice(0, 2)) + Number(time2.slice(0, 2)) + Math.floor(addedMinutes / 60) + '').padStart(2, 0)
    return `${hours}${minutes}`
}

function renderAircraftOnMap(pilot, map) {
    const { latitude, longitude } = pilot

    const marker = L.marker([latitude, longitude], {
        title: pilot.callsign,
        icon: new L.DivIcon({
            className: 'flight-icon',
            html: createMarker(
                pilot.heading,
                pilot.callsign,
                (pilot.platform === 'IVAO' ? 'rgb(13, 44, 153)' : 'rgb(41, 180, 115)')
            )
        })
    }).addTo(map)

    return function (pilot) {
        const { latitude, longitude } = pilot
        marker.setLatLng([latitude, longitude])
        marker._icon
            .querySelector('.marker-icon')
            .style
            .transform = `rotate(${pilot.heading}deg)`
    }
}

function updateAircraftsOnMap(pilots, map) {
    pilots.forEach((pilot) => {
        const { latitude, longitude } = pilot
        if (pilot.marker) {
            pilot.marker.setLatLng([latitude, longitude])
        } else {
            pilot.marker = L.marker([latitude, longitude], {
                title: pilot.callsign,
                icon: new L.DivIcon({
                    className: 'flight-icon',
                    html: createMarker(
                        pilot.heading,
                        pilot.callsign,
                        (pilot.platform === 'IVAO' ? 'rgb(13, 44, 153)' : 'rgb(41, 180, 115)')
                    )
                })
            }).addTo(map)
        }
    });
    return pilots

}

function getOnlinePilots(map) {
    return [
        fetch('https://api.ivao.aero/v2/tracker/whazzup')
            .then((response) => response.json())
            .then((data) => {
                const rctpPilots = data.clients.pilots.filter(({ flightPlan }) =>
                    flightPlan?.departureId?.startsWith('RC') || flightPlan?.arrivalId?.startsWith('RC'))
                return rctpPilots.map((pilot) => ({
                    id: 'I' + pilot.userId,
                    platform: 'IVAO',
                    callsign: pilot.callsign,
                    userId: pilot.userId,
                    latitude: pilot.lastTrack.latitude,
                    longitude: pilot.lastTrack.longitude,
                    heading: pilot.lastTrack.heading,
                    departure: pilot.flightPlan.departureId,
                    arrival: pilot.flightPlan.arrivalId,
                    departureTime: formatTimeFromSeconds(pilot.flightPlan.departureTime),
                    arrivalTime: formatTimeFromSeconds(pilot.flightPlan.departureTime + pilot.flightPlan.eet),
                    isBoarding: pilot.lastTrack.state === 'Boarding',
                }))
            }),
        fetch('https://data.vatsim.net/v3/vatsim-data.json')
            .then((response) => response.json())
            .then((data) => {
                const rctpPilots = data.pilots.filter(({ flight_plan }) =>
                    flight_plan?.departure.startsWith('RC') || flight_plan?.arrival.startsWith('RC'))
                return rctpPilots.map((pilot) => ({
                    id: 'V' + pilot.cid,
                    platform: 'VATSIM',
                    callsign: pilot.callsign,
                    userId: pilot.cid,
                    latitude: pilot.latitude,
                    longitude: pilot.longitude,
                    heading: pilot.heading,
                    departure: pilot.flight_plan.departure,
                    arrival: pilot.flight_plan.arrival,
                    departureTime: pilot.flight_plan.deptime,
                    arrivalTime: addZuluTimes(pilot.flight_plan.deptime, pilot.flight_plan.enroute_time),
                    isBoarding: false,
                }))
            }),
    ]
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

    return map
}