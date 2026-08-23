function makeCycle(str) {
  const arr = str.split('');
  return arr.reduce((cycle, letter, i) => {
    cycle[letter] = arr[(i + 1) % arr.length];
    return cycle;
  }, {});
}

const CHAR_SET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 '
const NUMERIC_SET = '0123456789 '

const charCycle = makeCycle(CHAR_SET)
const numericCycle = makeCycle(NUMERIC_SET)

// Longest roll we allow for a single flap. Anything further away is snapped to
// `MAX_FLIPS` steps before the target so one board update cannot schedule tens
// of thousands of animation callbacks.
const MAX_FLIPS = 12

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

function createFlipFlapBoard(
  rowAmount,
  width
) {
  let stringRows = [...Array(rowAmount).keys()].map(() => ''.padEnd(width))
  let rows = d3.select('#flip-flap')
    .selectAll('.flip-flap-row')
    .data(stringRows)
    .enter()
    .append('div')
    .attr('class', 'flip-flap-row')
    .style('top', (d, i) => i * 18 + 'px');

  let flaps = rows.selectAll('div')
    .data(city => city.split(''))
    .enter()
    .append('div')
    .attr('class', 'flap')
    .style('left', (d, i) => {
      let offset = (i >= (width - 16)) ? 8 : 0
      offset += (i >= (width - 14)) ? 3 : 0
      offset += (i >= (width - 12)) ? 8 : 0
      offset += (i >= (width - 10)) ? 3 : 0
      offset += (i >= (width - 8)) ? 8 : 0
      return i * 12 + offset + 'px'
    });

  ['next', 'prev', 'back', 'front'].forEach(d => {
    if (d === 'front') {
      flaps.append('div')
        .attr('class', 'divider');
    }

    flaps.append('div')
      .attr('class', 'half ' + d)
      .append('span')
      .text(letter => letter);
  });

  stringRows.push(...rows.data());
  flip(stringRows);

  // create blinking dots
  const dotsList = []
  const rowsDom = document.getElementsByClassName('flip-flap-row')
  for (let i = 0; i < rowAmount; i++) {
    const row = rowsDom[i]
    const dot = document.createElement('div')
    dot.classList.add('dot')
    const dot2 = dot.cloneNode(true)
    dot2.classList.add('dot-2')
    row.appendChild(dot)
    row.appendChild(dot2)
    dotsList.push([dot, dot2])
  }

  function flip(stringRows, isFast = false) {
    rows.each(function () {
      d3.select(this)
        .selectAll('.flap')
        .each(function (fromLetter, i) {
          let toLetter = stringRows[0][i],
            flap = d3.select(this);
          const isNumericOnly = i >= 40 && i < 48;
          if (fromLetter !== toLetter) {
            flipLetter(
              flap.datum(toLetter), fromLetter, toLetter, isNumericOnly, isFast
            );
          }
        });
      stringRows.push(stringRows.shift());
    });
  }

  function flipLetter(flap, fromLetter, toLetter, isNumericOnly, isFast) {
    const set = (isNumericOnly) ? NUMERIC_SET : CHAR_SET;
    const cycle = (isNumericOnly) ? numericCycle : charCycle;
    const prevFlaps = flap.selectAll('.prev span, .front span'),
      nextFlaps = flap.selectAll('.back span, .next span');

    function settle() {
      flap.select('.front').on('animationiteration', null);
      flap.classed('animated fast', false)
        .selectAll('span')
        .text(toLetter);
    }

    // A target that is not part of this flap's cycle can never be reached, so
    // rolling towards it would spin forever. Snap to it instead.
    const toIndex = set.indexOf(toLetter);
    if (toIndex === -1 || prefersReducedMotion.matches) {
      settle();
      return;
    }

    // Start close enough to the target that the roll stays bounded.
    let startIndex = set.indexOf(fromLetter);
    if (startIndex === -1 || (toIndex - startIndex + set.length) % set.length > MAX_FLIPS) {
      startIndex = (toIndex - MAX_FLIPS + set.length) % set.length;
      prevFlaps.text(set[startIndex]);
    }

    let next = cycle[set[startIndex]];
    let steps = 0;

    flap.select('.front').on('animationiteration', function () {
      if (next === toLetter || ++steps > MAX_FLIPS + 1) {
        return settle();
      }

      flap.classed('fast', isFast);

      prevFlaps.text(next);

      next = cycle[next];

      setTimeout(function () {
        nextFlaps.text(next);
      }, 30);
    });

    flap.classed('animated', true);

    nextFlaps.text(next);
  }

  return function updateFlipFlapBoard(newStringRows, newBlinkRows, isFast = false) {
    for (let i = 0; i < rowAmount; i++) {
      stringRows[i] = newStringRows[i] ?? ''.padEnd(width)
      dotsList[i][0].classList.toggle('blink-1', newBlinkRows[i] ?? false)
      dotsList[i][1].classList.toggle('blink-2', newBlinkRows[i] ?? false)
    }
    flip(stringRows, isFast)
  }
}