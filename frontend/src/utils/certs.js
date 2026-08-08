/* ============================================================================
   certs — the certificate specimen pages. Each SVG page is built from the
   document's own row so every document produces a different, deterministic
   certificate. Ported verbatim from js/certs.js. Structure here; every colour,
   face and weight is decided by organisms.css from tokens. Every page carries
   the SPECIMEN watermark. Exports certPage / certFacts / seeded.
   ========================================================================== */
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

export function seeded(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; };
}
const pick = (rnd, arr) => arr[Math.floor(rnd() * arr.length) % arr.length];
const int = (rnd, a, b) => a + Math.floor(rnd() * (b - a + 1));
const ordinal = (n) => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th'
  : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');

const GIVEN = {
  Egypt: ['Mariam', 'Youssef', 'Nourhan', 'Karim', 'Salma', 'Omar'],
  Jordan: ['Rand', 'Tareq', 'Layan', 'Hamza'], Iraq: ['Zainab', 'Mustafa', 'Noor'],
  Sudan: ['Amna', 'Elsadig', 'Rania'], India: ['Ananya', 'Rohit', 'Meera', 'Aditya', 'Priya'],
  Pakistan: ['Ayesha', 'Bilal', 'Fatima', 'Usman'], Bangladesh: ['Tahmina', 'Rafid', 'Sumaiya'],
  'Sri Lanka': ['Dilini', 'Nuwan', 'Ishara'], Nepal: ['Sabina', 'Prakash'],
  Nigeria: ['Chiamaka', 'Emeka', 'Adaeze', 'Tunde'], Kenya: ['Wanjiru', 'Otieno', 'Amani'],
  Ghana: ['Akosua', 'Kwabena', 'Efua'], Uganda: ['Nakato', 'Musoke'],
  Ethiopia: ['Hanan', 'Dawit', 'Selam'], Philippines: ['Maria Clara', 'Joel', 'Andrea'],
  Indonesia: ['Siti', 'Bagus', 'Ayu'], Thailand: ['Napat', 'Kanya'], Myanmar: ['Thida', 'Aung'],
  Mongolia: ['Bolormaa', 'Batbayar'], Uzbekistan: ['Nilufar', 'Jasur'],
};
const FAMILY = {
  Egypt: ['Hassan', 'El-Sayed', 'Abdelrahman', 'Farouk'], Jordan: ['Al-Masri', 'Haddad'],
  Iraq: ['Al-Jubouri', 'Kadhim'], Sudan: ['Osman', 'Ibrahim'],
  India: ['Sharma', 'Iyer', 'Deshmukh', 'Nair'], Pakistan: ['Khan', 'Siddiqui', 'Raza'],
  Bangladesh: ['Rahman', 'Chowdhury'], 'Sri Lanka': ['Fernando', 'Wickramasinghe'],
  Nepal: ['Shrestha', 'Gurung'], Nigeria: ['Okafor', 'Adeyemi', 'Balogun'],
  Kenya: ['Kamau', 'Ochieng'], Ghana: ['Mensah', 'Boateng'], Uganda: ['Nakalema', 'Ssentongo'],
  Ethiopia: ['Tesfaye', 'Bekele'], Philippines: ['Santos', 'Reyes', 'Dela Cruz'],
  Indonesia: ['Wijaya', 'Putri'], Thailand: ['Sombat', 'Chaiwat'], Myanmar: ['Win', 'Htun'],
  Mongolia: ['Erdene', 'Ganbold'], Uzbekistan: ['Karimov', 'Yusupova'],
};
const MIXED_GIVEN = ['Amira', 'Daniel', 'Leila', 'Samuel', 'Hana', 'Ibrahim'];
const MIXED_FAMILY = ['Haddad', 'Mensah', 'Silva', 'Ahmed', 'Costa', 'Nkemelu'];

const DEGREES = [
  ['Bachelor of Science', 'Nursing'], ['Bachelor of Science', 'Civil Engineering'],
  ['Bachelor of Arts', 'Economics'], ['Bachelor of Science', 'Computer Science'],
  ['Bachelor of Commerce', 'Accounting'], ['Bachelor of Science', 'Pharmacy'],
  ['Bachelor of Engineering', 'Electrical Engineering'],
  ['Bachelor of Science', 'Medical Laboratory Science'],
  ['Master of Science', 'Public Health'], ['Bachelor of Education', 'Mathematics'],
];
const HONOURS = ['First Class', 'Second Class (Upper Division)',
  'Second Class (Lower Division)', 'with Distinction', 'with Merit'];
const COURSES = [
  ['Research Methods', 3], ['Applied Statistics', 4], ['Professional Ethics', 2],
  ['Human Physiology', 4], ['Organic Chemistry', 4], ['Public Health Policy', 3],
  ['Clinical Practice I', 6], ['Clinical Practice II', 6], ['Pharmacology', 4],
  ['Community Health', 3], ['Microbiology', 4], ['Health Informatics', 3],
  ['Engineering Mathematics', 4], ['Structural Analysis', 4], ['Thermodynamics', 3],
  ['Database Systems', 3], ['Operating Systems', 3], ['Software Engineering', 4],
  ['Financial Accounting', 3], ['Macroeconomics', 3], ['Business Law', 2],
];
const GRADES = ['A', 'A−', 'B+', 'B', 'B−', 'C+', 'A', 'B+'];
const CRESTS = 5;

export function certFacts(doc) {
  const rnd = seeded(doc.id + doc.name);
  const c = doc.country;
  const given = pick(rnd, GIVEN[c] || MIXED_GIVEN);
  const family = pick(rnd, FAMILY[c] || MIXED_FAMILY);
  const [award, field] = pick(rnd, DEGREES);
  const year = (doc.name.match(/(19|20)\d{2}/) || [null, null])[0]
    || String(int(rnd, 2012, 2022));
  return {
    name: `${given} ${family}`,
    award, field,
    honours: pick(rnd, HONOURS),
    year,
    day: int(rnd, 1, 28),
    month: pick(rnd, ['January', 'March', 'June', 'July', 'September', 'November']),
    studentId: `${year}/${int(rnd, 10000, 99999)}`,
    serial: `${(doc.country || 'XX').slice(0, 2).toUpperCase()}-${int(rnd, 100000, 999999)}`,
    gpa: (int(rnd, 280, 395) / 100).toFixed(2),
    crest: int(rnd, 1, CRESTS),
    rnd,
  };
}

const W = 595; const H = 842;

function sheet(inner, f, opts = {}) {
  return `
    <svg class="cert cert--crest${f.crest}" viewBox="0 0 ${W} ${H}"
         role="img" aria-label="${esc(opts.label || 'Certificate page')}"
         preserveAspectRatio="xMidYMid meet">
      <rect class="c-paper" x="0" y="0" width="${W}" height="${H}"/>
      ${opts.plain ? '' : `
        <rect class="c-frame"      x="26" y="26" width="${W - 52}" height="${H - 52}"/>
        <rect class="c-frame-thin" x="34" y="34" width="${W - 68}" height="${H - 68}"/>`}
      ${inner}
      <text class="c-watermark" x="${W / 2}" y="${H / 2}"
            transform="rotate(-32 ${W / 2} ${H / 2})">SPECIMEN</text>
    </svg>`;
}

function crest(x, y, s) {
  return `
    <g class="c-crest" transform="translate(${x} ${y}) scale(${s})">
      <path class="c-crest-body" d="M0 -26 L22 -18 V4 C22 18 12 27 0 32 C-12 27 -22 18 -22 4 V-18 Z"/>
      <path class="c-crest-mark" d="M-14 2 L0 -10 L14 2 L14 9 L0 -3 L-14 9 Z"/>
      <circle class="c-crest-mark" cx="-10" cy="16" r="3"/>
      <circle class="c-crest-mark" cx="0"   cy="19" r="3"/>
      <circle class="c-crest-mark" cx="10"  cy="16" r="3"/>
    </g>`;
}

function seal(x, y) {
  return `
    <g class="c-seal" transform="translate(${x} ${y})">
      <circle class="c-seal-ring" r="34"/>
      <circle class="c-seal-ring c-seal-ring--in" r="27"/>
      <text class="c-seal-t" y="-6">OFFICIAL</text>
      <text class="c-seal-t" y="6">SEAL</text>
      <text class="c-seal-t c-seal-t--sm" y="17">REGISTRY</text>
    </g>`;
}

const line = (x1, x2, y, cls) => `<line class="${cls || 'c-rule'}" x1="${x1}" y1="${y}" x2="${x2}" y2="${y}"/>`;

function sigs(y, left, right) {
  return `
      ${line(88, 248, y, 'c-sigline')}
      ${line(347, 507, y, 'c-sigline')}
      <text class="c-sigrole" x="168" y="${y + 15}">${esc(left)}</text>
      <text class="c-sigrole" x="427" y="${y + 15}">${esc(right)}</text>`;
}

function award(doc, f) {
  const inst = doc.institution || 'Institution not shown on this page';
  return sheet(`
      ${crest(W / 2, 108, 1)}
      <text class="c-inst"    x="${W / 2}" y="176">${esc(inst.toUpperCase())}</text>
      ${doc.country ? `<text class="c-place" x="${W / 2}" y="196">${esc(doc.country.toUpperCase())}</text>` : ''}
      ${line(180, 415, 214)}
      <text class="c-lead"  x="${W / 2}" y="262">This is to certify that</text>
      <text class="c-name"  x="${W / 2}" y="308">${esc(f.name)}</text>
      <text class="c-body"  x="${W / 2}" y="346">having satisfied the requirements prescribed by the Senate</text>
      <text class="c-body"  x="${W / 2}" y="366">has this day been admitted to the degree of</text>
      <text class="c-award" x="${W / 2}" y="412">${esc(f.award)}</text>
      <text class="c-field" x="${W / 2}" y="438">in ${esc(f.field)}</text>
      <text class="c-body"  x="${W / 2}" y="470">${esc(f.honours)}</text>
      <text class="c-body"  x="${W / 2}" y="516">Given under the seal of the University</text>
      <text class="c-body"  x="${W / 2}" y="536">this ${ordinal(f.day)} day of ${esc(f.month)}, ${esc(f.year)}</text>
      ${seal(W / 2, 622)}
      ${sigs(712, 'Registrar', 'Vice-Chancellor')}
      <text class="c-serial" x="${W / 2}" y="780">Certificate No. ${esc(f.serial)}</text>
    `, f, { label: `Degree certificate: ${doc.name}` });
}

function transcript(doc, f, page, total) {
  const rows = [];
  const first = (page - 1) * 14;
  for (let i = 0; i < 14; i++) {
    const [title, credits] = COURSES[(first + i) % COURSES.length];
    const y = 330 + i * 27;
    const sem = 1 + Math.floor((first + i) / 6);
    rows.push(`
        <text class="c-cell c-cell--mono" x="66"  y="${y}">${esc(f.field.slice(0, 3).toUpperCase())}${300 + first + i}</text>
        <text class="c-cell"              x="150" y="${y}">${esc(title)}</text>
        <text class="c-cell c-cell--num"  x="424" y="${y}">${sem}</text>
        <text class="c-cell c-cell--num"  x="470" y="${y}">${credits}</text>
        <text class="c-cell c-cell--num"  x="528" y="${y}">${esc(GRADES[(first + i) % GRADES.length])}</text>
        ${line(60, 535, y + 9, 'c-rule-faint')}`);
  }
  return sheet(`
      ${crest(72, 76, 0.62)}
      <text class="c-inst c-inst--sm" x="112" y="66">${esc((doc.institution || 'Institution not shown').toUpperCase())}</text>
      <text class="c-place c-place--l" x="112" y="84">${esc(doc.country || 'country not shown')}</text>
      <text class="c-doctype" x="112" y="110">OFFICIAL ACADEMIC TRANSCRIPT</text>
      ${line(60, 535, 132)}

      <text class="c-lbl" x="60"  y="160">STUDENT</text>
      <text class="c-val" x="60"  y="180">${esc(f.name)}</text>
      <text class="c-lbl" x="330" y="160">STUDENT NUMBER</text>
      <text class="c-val c-val--mono" x="330" y="180">${esc(f.studentId)}</text>
      <text class="c-lbl" x="60"  y="212">PROGRAMME</text>
      <text class="c-val" x="60"  y="232">${esc(f.award)} in ${esc(f.field)}</text>
      <text class="c-lbl" x="330" y="212">AWARDED</text>
      <text class="c-val" x="330" y="232">${esc(f.month)} ${esc(f.year)}</text>
      ${line(60, 535, 258)}

      <text class="c-lbl" x="66"  y="300">CODE</text>
      <text class="c-lbl" x="150" y="300">COURSE</text>
      <text class="c-lbl c-cell--num" x="424" y="300">SEM</text>
      <text class="c-lbl c-cell--num" x="470" y="300">CR</text>
      <text class="c-lbl c-cell--num" x="528" y="300">GRADE</text>
      ${line(60, 535, 308)}
      ${rows.join('')}

      ${page === total ? `
        ${line(60, 535, 716)}
        <text class="c-lbl" x="60"  y="742">CUMULATIVE GPA</text>
        <text class="c-val c-val--mono" x="60" y="762">${esc(f.gpa)} / 4.00</text>
        ${seal(478, 748)}` : ''}
      <text class="c-foot" x="60"  y="${H - 34}">${esc(doc.name)}</text>
      <text class="c-foot c-foot--r" x="535" y="${H - 34}">Page ${page} of ${total}</text>
    `, f, { plain: true, label: `Transcript page ${page}: ${doc.name}` });
}

function supporting(doc, f, page, total) {
  const kind = page === 2 ? 'STATEMENT OF RESULT' : 'CERTIFIED TRANSLATION';
  const para = page === 2
    ? ['This is to confirm that the candidate named below completed the programme of',
      'study set out in the accompanying certificate and was awarded the degree',
      'stated, having been examined in accordance with the regulations of the',
      'University in force at the time of the award.']
    : ['The foregoing is a true and complete translation of the original document',
      'presented to this office, made from the language of issue into English by a',
      'translator sworn before the competent authority. No responsibility is',
      'accepted for the authenticity of the original document itself.'];
  return sheet(`
      ${crest(72, 76, 0.62)}
      <text class="c-inst c-inst--sm" x="112" y="66">${esc((doc.institution || 'Institution not shown').toUpperCase())}</text>
      <text class="c-place c-place--l" x="112" y="84">${esc(doc.country || 'country not shown')}</text>
      <text class="c-doctype" x="112" y="110">${kind}</text>
      ${line(60, 535, 132)}
      ${para.map((t, i) => `<text class="c-para" x="60" y="${180 + i * 26}">${esc(t)}</text>`).join('')}
      <text class="c-lbl" x="60"  y="312">NAME</text>
      <text class="c-val" x="60"  y="332">${esc(f.name)}</text>
      <text class="c-lbl" x="330" y="312">STUDENT NUMBER</text>
      <text class="c-val c-val--mono" x="330" y="332">${esc(f.studentId)}</text>
      <text class="c-lbl" x="60"  y="366">AWARD</text>
      <text class="c-val" x="60"  y="386">${esc(f.award)} in ${esc(f.field)}, ${esc(f.honours)}</text>
      ${line(60, 535, 420)}
      ${[0, 1, 2, 3, 4].map((i) => line(60, 535, 470 + i * 34, 'c-rule-faint')).join('')}
      ${seal(120, 690)}
      ${sigs(700, 'Deputy Registrar', 'Authorised Officer')}
      <text class="c-foot" x="60" y="${H - 34}">${esc(doc.name)}</text>
      <text class="c-foot c-foot--r" x="535" y="${H - 34}">Page ${page} of ${total}</text>
    `, f, { plain: true, label: `${kind.toLowerCase()}: ${doc.name}` });
}

function badScan(doc, f, page, total) {
  return sheet(`
      <g class="c-skew" transform="rotate(-2.4 ${W / 2} ${H / 2}) translate(-14 8)">
        ${crest(W / 2, 150, 0.9)}
        <text class="c-inst c-blur"  x="${W / 2}" y="218">${esc((doc.institution || 'UNIVERSITY OF ————').toUpperCase())}</text>
        ${line(190, 405, 250, 'c-rule-faint')}
        <text class="c-lead c-blur" x="${W / 2}" y="300">This is to certify that</text>
        <text class="c-name c-blur" x="${W / 2}" y="348">${esc(f.name)}</text>
        ${[0, 1, 2, 3].map((i) => line(120, 475, 400 + i * 30, 'c-rule-faint')).join('')}
        ${seal(W / 2, 620)}
      </g>
      <rect class="c-glare" x="0" y="0" width="${W}" height="${H}"/>
      <rect class="c-edge"  x="0" y="0" width="46" height="${H}"/>
      <text class="c-foot" x="60" y="${H - 34}">${esc(doc.name)}</text>
      <text class="c-foot c-foot--r" x="535" y="${H - 34}">Page ${page} of ${total}</text>
    `, f, { plain: true, label: `Poor scan: ${doc.name}` });
}

export function certPage(doc, page) {
  const f = certFacts(doc);
  const total = doc.pages;
  if (doc.type === 'unknown') return badScan(doc, f, page, total);
  if (doc.type === 'transcript') return transcript(doc, f, page, total);
  return page === 1 ? award(doc, f) : supporting(doc, f, page, total);
}
