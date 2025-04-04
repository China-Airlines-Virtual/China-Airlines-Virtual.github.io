function makeCycle(str) {
  const arr = str.split('');
  return arr.reduce((cycle, letter, i) => {
    cycle[letter] = arr[(i + 1) % arr.length];
    return cycle;
  }, {});
}

const charCycle = makeCycle('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ')
const numericCycle = makeCycle('0123456789 ')

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
    let q = d3.queue();
    rows.each(function () {
      d3.select(this)
        .selectAll('.flap')
        .each(function (fromLetter, i) {
          let toLetter = stringRows[0][i],
            flap = d3.select(this);
          const isNumericOnly = i >= 40 && i < 48;
          if (fromLetter !== toLetter) {
            q.defer(
              flipLetter,
              flap.datum(toLetter), fromLetter, toLetter, isNumericOnly, isFast
            );
          }
        });
      stringRows.push(stringRows.shift());
    });
  }

  function flipLetter(flap, fromLetter, toLetter, isNumericOnly, isFast, cb) {
    const cycle = (isNumericOnly) ? numericCycle : charCycle;
    let current = fromLetter,
      next = cycle[fromLetter],
      prevFlaps = flap.selectAll('.prev span, .front span'),
      nextFlaps = flap.selectAll('.back span, .next span');

    flap.select('.front').on('animationiteration', function () {
      if (next === toLetter) {
        flap.classed('animated fast', false)
          .selectAll('span')
          .text(toLetter);
        return cb();
      }

      flap.classed('fast', isFast);

      prevFlaps.text(next);

      current = next;
      next = cycle[next];

      setTimeout(function () {
        nextFlaps.text(next);
      }, 30);
    });

    flap.classed('animated', true);

    nextFlaps.text(next);
  }

  return function updateFlipFlapBoard(newStringRows, newBlinkRows, isFast = false) {
    for (i in [...Array(rowAmount).keys()]) {
      stringRows[i] = newStringRows[i] ?? ''.padEnd(width)
      dotsList[i][0].classList.toggle('blink-1', newBlinkRows[i] ?? false)
      dotsList[i][1].classList.toggle('blink-2', newBlinkRows[i] ?? false)
    }
    flip(stringRows, isFast)
  }
}