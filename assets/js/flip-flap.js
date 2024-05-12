function createFlipFlapBoard(stringRows) {
  let cycle = {};

  cycle['A'] = 'B';
  cycle['B'] = 'C';
  cycle['C'] = 'D';
  cycle['D'] = 'E';
  cycle['E'] = 'F';
  cycle['F'] = 'G';
  cycle['G'] = 'H';
  cycle['H'] = 'I';
  cycle['I'] = 'J';
  cycle['J'] = 'K';
  cycle['K'] = 'L';
  cycle['L'] = 'M';
  cycle['M'] = 'N';
  cycle['N'] = 'O';
  cycle['O'] = 'P';
  cycle['P'] = 'Q';
  cycle['Q'] = 'R';
  cycle['R'] = 'S';
  cycle['S'] = 'T';
  cycle['T'] = 'U';
  cycle['U'] = 'V';
  cycle['V'] = 'W';
  cycle['W'] = 'X';
  cycle['X'] = 'Y';
  cycle['Y'] = 'Z';
  cycle['Z'] = '0';
  cycle['0'] = '1';
  cycle['1'] = '2';
  cycle['2'] = '3';
  cycle['3'] = '4';
  cycle['4'] = '5';
  cycle['5'] = '6';
  cycle['6'] = '7';
  cycle['7'] = '8';
  cycle['8'] = '9';
  cycle['9'] = 'A';
  cycle[' '] = 'A';

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
    .style('left', (d, i) => i * 16 + 'px');

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

  function flip(stringRows) {
    let q = d3.queue();
    rows.each(function () {
      d3.select(this)
        .selectAll('.flap')
        .each(function (fromLetter, i) {
          let toLetter = stringRows[0][i],
            flap = d3.select(this);
          if (fromLetter !== toLetter) {
            q.defer(flipLetter, flap.datum(toLetter), fromLetter, toLetter);
          }
        });
      stringRows.push(stringRows.shift());
    });
  }

  function flipLetter(flap, fromLetter, toLetter, cb) {
    let current = fromLetter,
      next = cycle[fromLetter],
      prevFlaps = flap.selectAll('.prev span, .front span'),
      nextFlaps = flap.selectAll('.back span, .next span'),
      fast;

    flap.select('.front').on('animationiteration', function () {
      if (next === toLetter) {
        flap.classed('animated fast', false)
          .selectAll('span')
          .text(toLetter);
        return cb();
      }

      if (!fast) {
        fast = flap.classed('fast', true);
      }

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

  return function updateFlipFlapBoard(newStringRows) {
    stringRows = newStringRows
    console.log(stringRows)
    flip(stringRows)
  }
}