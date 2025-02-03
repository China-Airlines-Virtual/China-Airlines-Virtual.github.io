/**
* Template Name: Medilab
* Template URL: https://bootstrapmade.com/medilab-free-medical-bootstrap-theme/
* Updated: Mar 17 2024 with Bootstrap v5.3.3
* Author: BootstrapMade.com
* License: https://bootstrapmade.com/license/
*/

(async function () {
  "use strict";

  /**
   * Easy selector helper function
   */
  const select = (el, all = false) => {
    el = el.trim()
    if (all) {
      return [...document.querySelectorAll(el)]
    } else {
      return document.querySelector(el)
    }
  }

  /**
   * Easy event listener function
   */
  const on = (type, el, listener, all = false) => {
    let selectEl = select(el, all)
    if (selectEl) {
      if (all) {
        selectEl.forEach(e => e.addEventListener(type, listener))
      } else {
        selectEl.addEventListener(type, listener)
      }
    }
  }

  /**
   * Easy on scroll event listener 
   */
  const onscroll = (el, listener) => {
    el.addEventListener('scroll', listener)
  }

  /**
   * Navbar links active state on scroll
   */
  let navbarlinks = select('#navbar .scrollto', true)
  const navbarlinksActive = () => {
    let position = window.scrollY + 200
    navbarlinks.forEach(navbarlink => {
      if (!navbarlink.hash) return
      let section = select(navbarlink.hash)
      if (!section) return
      if (position >= section.offsetTop && position <= (section.offsetTop + section.offsetHeight)) {
        navbarlink.classList.add('active')
      } else {
        navbarlink.classList.remove('active')
      }
    })
  }
  window.addEventListener('load', navbarlinksActive)
  onscroll(document, navbarlinksActive)

  /**
   * Scrolls to an element with header offset
   */
  const scrollto = (el) => {
    let header = select('#header')
    let offset = header.offsetHeight

    let elementPos = select(el).offsetTop
    window.scrollTo({
      top: elementPos - offset,
      behavior: 'smooth'
    })
  }

  /**
   * Toggle .header-scrolled class to #header when page is scrolled
   */
  let selectHeader = select('#header')
  let selectTopbar = select('#topbar')
  if (selectHeader) {
    const headerScrolled = () => {
      if (window.scrollY > 100) {
        selectHeader.classList.add('header-scrolled')
        if (selectTopbar) {
          selectTopbar.classList.add('topbar-scrolled')
        }
      } else {
        selectHeader.classList.remove('header-scrolled')
        if (selectTopbar) {
          selectTopbar.classList.remove('topbar-scrolled')
        }
      }
    }
    window.addEventListener('load', headerScrolled)
    onscroll(document, headerScrolled)
  }

  /**
   * Back to top button
   */
  let backtotop = select('.back-to-top')
  if (backtotop) {
    const toggleBacktotop = () => {
      if (window.scrollY > 100) {
        backtotop.classList.add('active')
      } else {
        backtotop.classList.remove('active')
      }
    }
    window.addEventListener('load', toggleBacktotop)
    onscroll(document, toggleBacktotop)
  }

  /**
   * Mobile nav toggle
   */
  on('click', '.mobile-nav-toggle', function (e) {
    select('#navbar').classList.toggle('navbar-mobile')
    this.classList.toggle('bi-list')
    this.classList.toggle('bi-x')
  })

  /**
   * Mobile nav dropdowns activate
   */
  on('click', '.navbar .dropdown > a', function (e) {
    if (select('#navbar').classList.contains('navbar-mobile')) {
      e.preventDefault()
      this.nextElementSibling.classList.toggle('dropdown-active')
    }
  }, true)

  /**
   * Scrool with ofset on links with a class name .scrollto
   */
  on('click', '.scrollto', function (e) {
    if (select(this.hash)) {
      e.preventDefault()

      let navbar = select('#navbar')
      if (navbar.classList.contains('navbar-mobile')) {
        navbar.classList.remove('navbar-mobile')
        let navbarToggle = select('.mobile-nav-toggle')
        navbarToggle.classList.toggle('bi-list')
        navbarToggle.classList.toggle('bi-x')
      }
      scrollto(this.hash)
    }
  }, true)

  /**
   * Scroll with ofset on page load with hash links in the url
   */
  window.addEventListener('load', () => {
    if (window.location.hash) {
      if (select(window.location.hash)) {
        scrollto(window.location.hash)
      }
    }
  });

  /**
   * Preloader
   */
  let preloader = select('#preloader');
  if (preloader) {
    window.addEventListener('load', () => {
      preloader.remove()
    });
  }

  /**
   * Initiate glightbox 
   */
  const glightbox = GLightbox({
    selector: '.glightbox'
  });

  /**
   * Initiate Gallery Lightbox 
   */
  const galelryLightbox = GLightbox({
    selector: '.galelry-lightbox'
  });

  /**
   * Testimonials slider
   */
  new Swiper('.testimonials-slider', {
    speed: 600,
    loop: true,
    autoplay: {
      delay: 5000,
      disableOnInteraction: false
    },
    slidesPerView: 'auto',
    pagination: {
      el: '.swiper-pagination',
      type: 'bullets',
      clickable: true
    },
    breakpoints: {
      320: {
        slidesPerView: 1,
        spaceBetween: 20
      },

      1200: {
        slidesPerView: 2,
        spaceBetween: 20
      }
    }
  });

  fetch('assets/members.csv')
    .then(async (resp) => {
      const data = await resp.text()
      const results = Papa.parse(data)
      results.data.shift()  // remove header
      return results.data
        .filter((row) => row[0].trim() !== '')
        .map((row) => ({
          name: row[1].trim(),
          nickname: row[2].trim() || null,
          title: row[3].trim(),
          callsign: row[4].trim(),
          joinDate: row[5].trim() || null,
          avatarFileName: row[6].trim() || null,
          vid: row[7].trim() || null,
          vatsimId: row[8].trim() || null,
          youtubeChannel: row[9].trim() || null,
          instagramId: row[10].trim() || null,
        }))
    })
    .then((data) => {
      new PureCounter({
        selector: "#purecounter-pilots",
        start: 0,
        end: data.length,
        duration: 1,
      })

      const memberListElem = document.getElementById('member-list')
      if (!memberListElem) return

      const memberElems = data.map((member) => {
        const container = document.createElement('div')
        container.id = `member-${member.callsign.toLowerCase()}`
        container.classList.add('col-xl-4')
        container.classList.add('col-lg-6')

        const memberCard = document.createElement('div')
        memberCard.classList.add('member', 'd-flex')

        const memberInfo = document.createElement('div')
        memberInfo.classList.add('member-info')

        const memberName = document.createElement('h4')
        memberName.textContent = member.name

        const memberNickname = document.createElement('span')
        memberNickname.textContent = member.nickname || '　'  // full-width space is a placeholder

        const memberTitle = document.createElement('p')
        memberTitle.textContent = member.title

        memberInfo.appendChild(memberName)
        memberInfo.appendChild(memberNickname)
        memberInfo.appendChild(memberTitle)

        const memberExtra = document.createElement('div')
        memberExtra.classList.add('member-extra')

        const memberImageContainer = document.createElement('div')
        memberImageContainer.classList.add('pic')
        if (member.avatarFileName) {
          const memberImage = document.createElement('img')
          memberImage.classList.add('img-fluid')
          memberImage.width = "100"
          memberImage.src = `assets/img/members/${member.avatarFileName}`
          memberImage.alt = ''
          memberImageContainer.appendChild(memberImage)
        }

        memberCard.appendChild(memberInfo)
        memberCard.appendChild(memberImageContainer)

        const memberSocials = document.createElement('div')
        memberSocials.classList.add('social')
        if (member.vid || member.vatsimId || member.youtubeChannel || member.instagramId) {
          if (member.youtubeChannel) {
            const youtubeIcon = document.createElement('i')
            youtubeIcon.classList.add('bi', 'bi-youtube')
            const youtubeLink = document.createElement('a')
            youtubeLink.href = `https://youtube.com/${member.youtubeChannel}`
            youtubeLink.target = '_blank'
            youtubeLink.appendChild(youtubeIcon)
            memberSocials.appendChild(youtubeLink)
          }
          if (member.instagramId) {
            const instagramIcon = document.createElement('i')
            instagramIcon.classList.add('bi', 'bi-instagram')
            const instagramLink = document.createElement('a')
            instagramLink.href = `https://instagram.com/${member.instagramId}`
            instagramLink.target = '_blank'
            instagramLink.appendChild(instagramIcon)
            memberSocials.appendChild(instagramLink)
          }
          if (member.vid) {
            const ivaoImg = document.createElement('img')
            ivaoImg.width = "24"
            ivaoImg.style.filter = 'brightness(0) invert(1)'
            ivaoImg.src = 'assets/img/icon-ivao.png'
            const ivaoLink = document.createElement('a')
            ivaoLink.href = `https://www.ivao.aero/Member.aspx?Id=${member.vid}`
            ivaoLink.target = '_blank'
            ivaoLink.appendChild(ivaoImg)
            memberSocials.appendChild(ivaoLink)
          }
          if (member.vatsimId) {
            const vatsimImg = document.createElement('img')
            vatsimImg.width = "24"
            vatsimImg.style.filter = 'brightness(0) invert(1)'
            vatsimImg.src = 'assets/img/icon-vatsim.png'
            const ivaoLink = document.createElement('a')
            ivaoLink.href = `https://stats.vatsim.net/stats/${member.vatsimId}`
            ivaoLink.target = '_blank'
            ivaoLink.appendChild(vatsimImg)
            memberSocials.appendChild(ivaoLink)
          }
        }
        memberExtra.appendChild(memberSocials)

        if (member.joinDate) {
          const memberJoinDate = document.createElement('div')
          memberJoinDate.textContent = `Joined: ${member.joinDate}`
          memberExtra.appendChild(memberJoinDate)
        }

        memberCard.appendChild(memberExtra)

        container.appendChild(memberCard)

        return container
      })

      memberListElem.append(...memberElems)


      // Initiate map replay
      initMapReplay('map-replay', 'assets/timeline/timeline-20250202.json', { lat: 24.0, lon: 116.7 }, 6, data);
    })

  fetch('assets/statistics.json')
    .then((resp) => resp.json())
    .then((data) => {
      new PureCounter({
        selector: "#purecounter-legs",
        start: 0,
        end: data.trackedLeg,
        duration: 1,
      })
      new PureCounter({
        selector: "#purecounter-time",
        start: 0,
        end: Math.floor(data.trackedTime / 60),
        duration: 1,
      })

      data.all.legs.forEach((row) => {
        const p = document.createElement('p')
        p.classList.add('fst-italic')
        p.textContent = `${row.name} - ${row.legs} 班次`
        document.getElementById('statistics-all-legs').appendChild(p)
      })
      data.all.time.forEach((row) => {
        const p = document.createElement('p')
        p.classList.add('fst-italic')
        p.textContent = `${row.name} - ${Math.round(row.duration)} 小時`
        document.getElementById('statistics-all-duration').appendChild(p)
      })
      data.year.legs.forEach((row) => {
        const p = document.createElement('p')
        p.classList.add('fst-italic')
        p.textContent = `${row.name} - ${row.legs} 班次`
        document.getElementById('statistics-year-legs').appendChild(p)
      })
      data.year.time.forEach((row) => {
        const p = document.createElement('p')
        p.classList.add('fst-italic')
        p.textContent = `${row.name} - ${Math.round(row.duration)} 小時`
        document.getElementById('statistics-year-duration').appendChild(p)
      })
      data.month.legs.forEach((row) => {
        const p = document.createElement('p')
        p.classList.add('fst-italic')
        p.textContent = `${row.name} - ${row.legs} 班次`
        document.getElementById('statistics-month-legs').appendChild(p)
      })
      data.month.time.forEach((row) => {
        const p = document.createElement('p')
        p.classList.add('fst-italic')
        p.textContent = `${row.name} - ${Math.round(row.duration)} 小時`
        document.getElementById('statistics-month-duration').appendChild(p)
      })
    })

  const map = initLiveMap('live-map', { lat: 25.07742848819059, lon: 121.23215698936468 }, 4)
  const markerMap = new Map()
  const updateFlipFlapBoard = await initFlipFlapBoard()
  async function updateLiveTraffic() {
    const pilotsPromises = getOnlinePilots()
    // update live map
    pilotsPromises.forEach((pilotsPromise) =>
      pilotsPromise.then((pilots) => {
        pilots.forEach((pilot) => {
          if (markerMap.has(pilot.id)) {
            markerMap.get(
              pilot.id,
            )(pilot)
          } else {
            markerMap.set(
              pilot.id,
              renderAircraftOnMap(pilot, map)
            )
          }
        })
      })
    )
    // update flip-flap board
    const pilots = (await Promise.all(pilotsPromises))
      .flat()
      .sort((a, b) => Number(a.departureTime) - Number(b.departureTime))
    const departurePilots = pilots.filter((pilot) => pilot.departure.startsWith('RC'))
    const arrivalPilots = pilots.filter((pilot) => pilot.arrival.startsWith('RC'))
    updateFlipFlapBoard(departurePilots)
    setTimeout(() => {
      updateFlipFlapBoard(arrivalPilots)
    }, 15000)
  }
  updateLiveTraffic()
  setInterval(updateLiveTraffic, 30000)
})()