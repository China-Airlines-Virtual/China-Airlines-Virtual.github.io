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

    const markerMap = {};
    const markerInternalDom = {};
    const lastSeenTick = {};

    fetch(timelineName)
        .then(async (response) => {
            const data = await response.json();
            const timelineKey = Object.keys(data);

            let tick = 0;
            const intervalId = setInterval(() => {
                const tickData = data[timelineKey[tick]];
                for (const pilot of tickData) {
                    if (markerMap[pilot.cid] !== undefined) {
                        markerMap[pilot.cid].setLatLng([pilot.latitude, pilot.longitude]);
                    } else {
                        const span = document.createElement('span')
                        span.className = 'material-symbols-outlined'
                        span.id = `flight-${pilot.cid}`
                        span.innerText = 'flight'
                        const flightSpan = document.createElement('span')
                        flightSpan.className = 'flight-span'
                        flightSpan.innerText = pilot.callsign
                        const div = document.createElement('div')
                        div.appendChild(span)
                        div.appendChild(flightSpan)

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

                        markerMap[pilot.cid] = L.marker([pilot.latitude, pilot.longitude], {
                            title: pilot.callsign,
                            icon: new L.DivIcon({
                                className: 'flight-icon',
                                html: div
                            })
                        }).bindPopup(popup).addTo(map);
                        markerInternalDom[pilot.cid] = document.getElementById(`flight-${pilot.cid}`);
                    }

                    markerInternalDom[pilot.cid].style.transform = `rotate(${pilot.heading}deg)`;
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
