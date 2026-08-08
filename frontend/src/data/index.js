/* ============================================================================
   MOHESR — DATA (ES-module port of the original js/data.js)
   Everything the screen renders from, shaped the way the API returns it. The
   backend seeds its database from these same fixtures, so the app looks
   identical on first run and the UI can be re-pointed at the real endpoint
   without touching a component.
   ========================================================================== */

export const BRAND = { name: 'MOHESR', tagline: 'Certificate checks', mark: 'M' };

export const USER = {
  name: 'Fatima Al Zaabi',
  email: 'fatima.alzaabi@mohesr.gov.ae',
  initials: 'FA',
  firstName: 'Fatima',
};

export const NAV = [
  { id: 'tasks', label: 'My tasks', icon: 'calendar-check', count: 3, href: '/', active: true },
  { id: 'signoff', label: 'Sent for sign-off', icon: 'check-square', count: 2 },
  { id: 'watchlist', label: 'Watchlist', icon: 'bookmark' },
  { id: 'reports', label: 'Reports', icon: 'file-text' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

export const SUMMARY = {
  items: [
    { text: '71 decisions waiting', tone: 'accent' },
    { text: '1 task is late' },
    { text: '110 certificates not verified yet' },
  ],
  health: { label: 'Everything running normally', tone: 'success' },
};

export const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'late', label: 'Late' },
  { id: 'pending', label: 'Pending' },
  { id: 'progress', label: 'In progress' },
  { id: 'new', label: 'Not verified' },
  { id: 'done', label: 'Done' },
];

export const STATUS_META = {
  late: { label: 'Late', variant: 'late' },
  pending: { label: 'Pending', variant: 'pending' },
  progress: { label: 'In progress', variant: 'progress' },
  new: { label: 'Not verified', variant: 'new' },
  done: { label: 'Done', variant: 'done' },
  partial: { label: 'Partly verified', variant: 'pending' },
};

export const TASKS = [
  { id: 't-appeals-jul', status: 'late', title: 'Appeals, July',
    meta: 'reopened cases • 2 days ago', stat: '2 of 9 to decide',
    action: 'View', href: '/task/t-appeals-jul' },
  { id: 't-almarzooqi', status: 'pending', title: 'Al Marzooqi hand-over',
    meta: 'you uploaded it • yesterday 16:04', stat: '6 of 18 to decide',
    action: 'View', href: '/task/t-almarzooqi' },
  { id: 't-dataflow-3aug', status: 'pending', title: 'DataFlow, 3 Aug 2026',
    meta: 'sent to you • today 09:12', stat: '9 to decide · 33 not verified',
    notVerified: 33, action: 'View', href: '/task/t-dataflow-3aug' },
  { id: 't-usdp-88', status: 'progress', title: 'USDP referrals, batch 88',
    meta: 'sent to you • today 09:31', stat: '58 still checking, 331 done',
    action: 'View', href: '/task/t-usdp-88' },
  { id: 't-ministry-q3', status: 'new', title: 'Ministry referral, Q3',
    meta: 'sent to you • yesterday 17:40', stat: '74 to check',
    action: 'Start', href: '/task/t-ministry-q3' },
  { id: 't-dataflow-2aug', status: 'new', title: 'DataFlow, 2 Aug top-up',
    meta: 'sent to you • today 08:40', stat: '36 to check',
    action: 'Start', href: '/task/t-dataflow-2aug' },
];

export const FILTER_COUNTS = { all: 12, late: 1, pending: 2, progress: 1, new: 2, done: 6 };

export const GREETING = { date: 'Monday 3 August 2026', time: '09:41' };

export const LANGUAGES = [
  { id: 'en', label: 'English' },
  { id: 'ar', label: 'العربية' },
];

export const CARD_MENU = [
  { id: 'manage', label: 'Manage', icon: 'sliders' },
  { id: 'delete', label: 'Delete', icon: 'trash', tone: 'danger' },
];

export const DOC_COLUMNS = [
  { id: 'name', label: 'Certificate', grow: true },
  { id: 'type', label: 'Type', w: '128px', align: 'center' },
  { id: 'institution', label: 'Institution on the page', w: 'minmax(160px,1fr)' },
  { id: 'country', label: 'Country', w: '120px' },
  { id: 'pages', label: 'Pages', w: '72px', align: 'end', numeric: true },
];

export const DOC_TYPES = [
  { id: 'all', label: 'All types', count: 74 },
  { id: 'transcript', label: 'Academic transcript', count: 9 },
  { id: 'degree', label: 'Degree', count: 41 },
  { id: 'diploma', label: 'Diploma', count: 18 },
  { id: 'unknown', label: 'Could not tell', count: 6 },
];

export const DOC_TYPE_META = {
  degree: { label: 'Degree', chip: 'Degree', tone: 'violet' },
  diploma: { label: 'Diploma', chip: 'Diploma', tone: 'green' },
  transcript: { label: 'Transcript', chip: 'Academic transcript', tone: 'sky' },
  unknown: { label: 'Could not tell', chip: 'Could not tell', tone: 'muted', variant: 'unknown', absent: true },
};

export const DOCUMENTS = [
  { id: 'd1', name: 'Degree_AinShams_2013.pdf', type: 'degree', institution: 'Ain Shams University', country: 'Egypt', pages: 2 },
  { id: 'd2', name: 'Degree_Colombo_2014.pdf', type: 'degree', institution: 'University of Colombo', country: 'Sri Lanka', pages: 3 },
  { id: 'd3', name: 'Degree_Dhaka_2015.pdf', type: 'degree', institution: 'University of Dhaka', country: 'Bangladesh', pages: 4 },
  { id: 'd4', name: 'Degree_Karachi_2016.pdf', type: 'degree', institution: 'University of Karachi', country: 'Pakistan', pages: 1 },
  { id: 'd5', name: 'Degree_Tashkent_2017.pdf', type: 'degree', institution: 'Tashkent State University', country: 'Uzbekistan', pages: 2 },
  { id: 'd6', name: 'Degree_Ulaanbaatar_2018.pdf', type: 'degree', institution: 'National Univ. of Mongolia', country: 'Mongolia', pages: 3 },
  { id: 'd7', name: 'Degree_Lagos_2019.pdf', type: 'degree', institution: 'University of Lagos', country: 'Nigeria', pages: 4 },
  { id: 'd8', name: 'Degree_Nairobi_2020.pdf', type: 'degree', institution: 'University of Nairobi', country: 'Kenya', pages: 1 },
  { id: 'd9', name: 'Degree_Accra_2021.pdf', type: 'degree', institution: 'University of Ghana', country: 'Ghana', pages: 2 },
  { id: 'd10', name: 'Degree_Amman_2022.pdf', type: 'degree', institution: 'University of Jordan', country: 'Jordan', pages: 3 },
  { id: 'd11', name: 'Degree_Cairo_2012.pdf', type: 'degree', institution: 'Cairo University', country: 'Egypt', pages: 4 },
  { id: 'd12', name: 'Degree_Pune_2013.pdf', type: 'degree', institution: 'Savitribai Phule Pune University', country: 'India', pages: 1 },
  { id: 'd13', name: 'Degree_Chennai_2014.pdf', type: 'degree', institution: 'Anna University', country: 'India', pages: 2 },
  { id: 'd14', name: 'Degree_Delhi_2015.pdf', type: 'degree', institution: 'University of Delhi', country: 'India', pages: 3 },
  { id: 'd15', name: 'Degree_Kathmandu_2016.pdf', type: 'degree', institution: 'Kathmandu University', country: 'Nepal', pages: 4 },
  { id: 'd16', name: 'Degree_Kandy_2017.pdf', type: 'degree', institution: 'University of Peradeniya', country: 'Sri Lanka', pages: 1 },
  { id: 'd17', name: 'Degree_Damascus_2018.pdf', type: 'degree', institution: null, country: null, pages: 3 },
  { id: 'd18', name: 'Degree_Baghdad_2019.pdf', type: 'degree', institution: 'University of Baghdad', country: 'Iraq', pages: 3 },
  { id: 'd19', name: 'Degree_Khartoum_2020.pdf', type: 'degree', institution: 'Sudan University of Sci. & Tech.', country: 'Sudan', pages: 4 },
  { id: 'd20', name: 'Degree_AddisAbaba_2021.pdf', type: 'degree', institution: 'Addis Ababa University', country: 'Ethiopia', pages: 1 },
  { id: 'd21', name: 'Degree_Kampala_2022.pdf', type: 'degree', institution: 'Makerere University', country: 'Uganda', pages: 2 },
  { id: 'd22', name: 'Degree_Multan_2012.pdf', type: 'degree', institution: 'University of Khartoum', country: 'Sudan', pages: 3 },
  { id: 'd23', name: 'Degree_Jakarta_2013.pdf', type: 'degree', institution: 'Bahauddin Zakariya University', country: 'Pakistan', pages: 4 },
  { id: 'd24', name: 'Degree_Bangkok_2014.pdf', type: 'degree', institution: 'Universitas Indonesia', country: 'Indonesia', pages: 1 },
  { id: 'd25', name: 'Degree_Manila2_2015.pdf', type: 'degree', institution: 'Chulalongkorn University', country: 'Thailand', pages: 2 },
  { id: 'd26', name: 'Degree_Yangon_2016.pdf', type: 'degree', institution: 'De La Salle University', country: 'Philippines', pages: 3 },
  { id: 'd27', name: 'Degree_Alex_2017.pdf', type: 'degree', institution: 'Yangon University', country: 'Myanmar', pages: 4 },
  { id: 'd28', name: 'Degree_Manila_2018.pdf', type: 'degree', institution: 'Al-Azhar University', country: 'Egypt', pages: 1 },
  { id: 'd29', name: 'Degree_AinShams_2019.pdf', type: 'degree', institution: 'Alexandria University', country: 'Egypt', pages: 2 },
  { id: 'd30', name: 'Degree_Colombo_2020.pdf', type: 'degree', institution: 'University of Santo Tomas', country: 'Philippines', pages: 3 },
  { id: 'd31', name: 'Degree_Dhaka_2021.pdf', type: 'degree', institution: 'Ain Shams University', country: 'Egypt', pages: 4 },
  { id: 'd32', name: 'Degree_Karachi_2022.pdf', type: 'degree', institution: 'University of Colombo', country: 'Sri Lanka', pages: 1 },
  { id: 'd33', name: 'Degree_Tashkent_2012.pdf', type: 'degree', institution: 'University of Dhaka', country: 'Bangladesh', pages: 2 },
  { id: 'd34', name: 'Degree_Ulaanbaatar_2013.pdf', type: 'degree', institution: null, country: null, pages: 5 },
  { id: 'd35', name: 'Degree_Lagos_2014.pdf', type: 'degree', institution: 'Tashkent State University', country: 'Uzbekistan', pages: 4 },
  { id: 'd36', name: 'Degree_Nairobi_2015.pdf', type: 'degree', institution: 'National Univ. of Mongolia', country: 'Mongolia', pages: 1 },
  { id: 'd37', name: 'Degree_Accra_2016.pdf', type: 'degree', institution: 'University of Lagos', country: 'Nigeria', pages: 2 },
  { id: 'd38', name: 'Degree_Amman_2017.pdf', type: 'degree', institution: 'University of Nairobi', country: 'Kenya', pages: 3 },
  { id: 'd39', name: 'Degree_Cairo_2018.pdf', type: 'degree', institution: 'University of Ghana', country: 'Ghana', pages: 4 },
  { id: 'd40', name: 'Degree_Pune_2019.pdf', type: 'degree', institution: 'University of Jordan', country: 'Jordan', pages: 1 },
  { id: 'd41', name: 'Degree_Chennai_2020.pdf', type: 'degree', institution: 'Cairo University', country: 'Egypt', pages: 2 },
  { id: 'd42', name: 'Transcript_Delhi_2021.pdf', type: 'transcript', institution: 'Savitribai Phule Pune University', country: 'India', pages: 3 },
  { id: 'd43', name: 'Transcript_Kathmandu_2022.pdf', type: 'transcript', institution: 'Anna University', country: 'India', pages: 4 },
  { id: 'd44', name: 'Transcript_Kandy_2012.pdf', type: 'transcript', institution: 'University of Delhi', country: 'India', pages: 1 },
  { id: 'd45', name: 'Transcript_Damascus_2013.pdf', type: 'transcript', institution: 'Kathmandu University', country: 'Nepal', pages: 2 },
  { id: 'd46', name: 'Transcript_Baghdad_2014.pdf', type: 'transcript', institution: 'University of Peradeniya', country: 'Sri Lanka', pages: 3 },
  { id: 'd47', name: 'Transcript_Khartoum_2015.pdf', type: 'transcript', institution: 'Damascus University', country: 'Syria', pages: 4 },
  { id: 'd48', name: 'Transcript_AddisAbaba_2016.pdf', type: 'transcript', institution: 'University of Baghdad', country: 'Iraq', pages: 1 },
  { id: 'd49', name: 'Transcript_Kampala_2017.pdf', type: 'transcript', institution: 'Sudan University of Sci. & Tech.', country: 'Sudan', pages: 2 },
  { id: 'd50', name: 'Transcript_Multan_2018.pdf', type: 'transcript', institution: 'Addis Ababa University', country: 'Ethiopia', pages: 3 },
  { id: 'd51', name: 'Diploma_Jakarta_2019.pdf', type: 'diploma', institution: null, country: null, pages: 2 },
  { id: 'd52', name: 'Diploma_Bangkok_2020.pdf', type: 'diploma', institution: 'University of Khartoum', country: 'Sudan', pages: 1 },
  { id: 'd53', name: 'Diploma_Manila2_2021.pdf', type: 'diploma', institution: 'Bahauddin Zakariya University', country: 'Pakistan', pages: 2 },
  { id: 'd54', name: 'Diploma_Yangon_2022.pdf', type: 'diploma', institution: 'Universitas Indonesia', country: 'Indonesia', pages: 3 },
  { id: 'd55', name: 'Diploma_Alex_2012.pdf', type: 'diploma', institution: 'Chulalongkorn University', country: 'Thailand', pages: 4 },
  { id: 'd56', name: 'Diploma_Manila_2013.pdf', type: 'diploma', institution: 'De La Salle University', country: 'Philippines', pages: 1 },
  { id: 'd57', name: 'Diploma_AinShams_2014.pdf', type: 'diploma', institution: 'Yangon University', country: 'Myanmar', pages: 2 },
  { id: 'd58', name: 'Diploma_Colombo_2015.pdf', type: 'diploma', institution: 'Al-Azhar University', country: 'Egypt', pages: 3 },
  { id: 'd59', name: 'Diploma_Dhaka_2016.pdf', type: 'diploma', institution: 'Alexandria University', country: 'Egypt', pages: 4 },
  { id: 'd60', name: 'Diploma_Karachi_2017.pdf', type: 'diploma', institution: 'University of Santo Tomas', country: 'Philippines', pages: 1 },
  { id: 'd61', name: 'Diploma_Tashkent_2018.pdf', type: 'diploma', institution: 'Ain Shams University', country: 'Egypt', pages: 2 },
  { id: 'd62', name: 'Diploma_Ulaanbaatar_2019.pdf', type: 'diploma', institution: 'University of Colombo', country: 'Sri Lanka', pages: 3 },
  { id: 'd63', name: 'Diploma_Lagos_2020.pdf', type: 'diploma', institution: 'University of Dhaka', country: 'Bangladesh', pages: 4 },
  { id: 'd64', name: 'Diploma_Nairobi_2021.pdf', type: 'diploma', institution: 'University of Karachi', country: 'Pakistan', pages: 1 },
  { id: 'd65', name: 'Diploma_Accra_2022.pdf', type: 'diploma', institution: 'Tashkent State University', country: 'Uzbekistan', pages: 2 },
  { id: 'd66', name: 'Diploma_Amman_2012.pdf', type: 'diploma', institution: 'National Univ. of Mongolia', country: 'Mongolia', pages: 3 },
  { id: 'd67', name: 'Diploma_Cairo_2013.pdf', type: 'diploma', institution: 'University of Lagos', country: 'Nigeria', pages: 4 },
  { id: 'd68', name: 'Diploma_Pune_2014.pdf', type: 'diploma', institution: null, country: null, pages: 4 },
  { id: 'd69', name: 'scan_2483.pdf', type: 'unknown', institution: null, country: null, pages: 1 },
  { id: 'd70', name: 'scan_2490.pdf', type: 'unknown', institution: null, country: null, pages: 2 },
  { id: 'd71', name: 'scan_2497.pdf', type: 'unknown', institution: null, country: null, pages: 3 },
  { id: 'd72', name: 'scan_2504.pdf', type: 'unknown', institution: null, country: null, pages: 1 },
  { id: 'd73', name: 'scan_2511.pdf', type: 'unknown', institution: null, country: null, pages: 2 },
  { id: 'd74', name: 'scan_2518.pdf', type: 'unknown', institution: null, country: null, pages: 3 },
];

export const TASK_DETAIL = {
  id: 't-ministry-q3',
  title: 'Ministry referral, Q3',
  status: 'new',
  total: 74,
  meta: '74 certificates · sent to you yesterday 17:40 · nothing examined yet',
  pageSize: 24,
  listNote: 'institution and country are read off the cover page only, neither is verified',
  notifyTitle: 'Notify me when',
  notify: [
    { id: 'each', label: 'Each check finishes', hint: 'five messages per certificate', on: true },
    { id: 'done', label: 'The whole task is done', on: true },
  ],
  createdToast: (n) => `Task created — ${n} ${n === 1 ? 'certificate' : 'certificates'} added`,
};

export const SELECTION_ACTIONS = [
  { id: 'split', label: 'Split into a new task', icon: 'git-branch' },
  { id: 'remove', label: 'Remove', icon: 'trash-2', danger: true },
];

export const CHECKAGAIN_ACTION = { id: 'checkagain', label: 'Check again', icon: 'refresh-cw' };

export const TASK_STATE = {
  tabNeeds: (n) => `Needs you (${n})`,
  tabAll: (n) => `All certificates (${n})`,
  tabNotVerified: (n) => `Not verified (${n})`,
  notVerifiedFiltered: 'You filtered it out of the run',
  notVerifiedAdded: 'Added after the run',
  verifyRest: (n) => `Verify the other ${n}`,
  needsCaption: 'Verification is done, so this list is final.',
  checkAgain: 'Check again',
  checkAgainBlocked: (signoff) => `With ${signoff.split(' ')[0]} for sign-off.`,
  checkedTwice: 'Checked twice',
  conflict: (priorLabel, priorDate, curLabel) =>
    `You recorded ${priorLabel} on ${priorDate} · the recheck says ${curLabel}`,
  recheckToast: (name) => `${name}: checked again`,
  genuineLabel: 'Genuine',
};

export const RUN_STAGES = [
  { id: 'scan', label: 'Scan check', note: 'Is the file legible enough to judge at all?' },
  { id: 'read', label: 'Reading', note: 'Pulling the name, institution, award and dates off the page.' },
  { id: 'tamper', label: 'Tampering', note: 'Looking for edits: pasted seals, retyped names, patched grades.' },
  { id: 'cross', label: 'Cross-check', note: 'Matching what was read against the institution’s own records.' },
  { id: 'answer', label: 'Answer', note: 'Cleared, or flagged for a person to look at.' },
];

export const SEVERITY = {
  forged: { label: 'Forged', pill: 'late', rank: 1, note: 'Certain enough to act on.' },
  suspicious: { label: 'Suspicious', pill: 'pending', rank: 2, note: 'Something is wrong; a person has to decide what.' },
  minor: { label: 'Minor issue', pill: 'unknown', rank: 3, note: 'Worth a look, probably explainable.' },
};

export const RUN_PROBLEMS = [
  { doc: 'd1', severity: 'forged', why: 'Edited in Photoshop; seal copied from another file',
    confidence: 92,
    findings: [
      { stage: 'tamper', region: 'institution', evidence: 'File history', summary: 'Edited after it was created', detail: 'Three edits are recorded in the file; the last one in Adobe Photoshop.' },
      { stage: 'read', region: 'name', evidence: 'Fonts', summary: 'Name is in a different typeface', detail: 'The rest of the page uses one font; the name uses another.' },
      { stage: 'cross', region: 'seal', evidence: 'Cross-check', summary: 'Seal copied from another file', detail: 'Pixel-identical to a certificate already confirmed forged.' },
    ] },
  { doc: 'd2', severity: 'suspicious', why: 'Student name set in a different typeface' },
  { doc: 'd5', severity: 'suspicious', why: 'Award date does not fit the year of entry' },
  { doc: 'd42', severity: 'minor', why: 'Layout matches two already confirmed forged' },
  { doc: 'd51', severity: 'minor', why: 'Compression differs around the grade' },
  { doc: 'd3', severity: 'minor', why: 'Institution does not appear in any record' },
  { doc: 'd7', severity: 'minor', why: 'Seal sits 4mm off where the registry prints it' },
  { doc: 'd11', severity: 'minor', why: 'Two fonts inside the same line of the award' },
  { doc: 'd14', severity: 'minor', why: 'Signature matches a specimen filed under another name' },
  { doc: 'd18', severity: 'minor', why: 'Page 2 scanned at a different resolution' },
  { doc: 'd21', severity: 'minor', why: 'Serial number falls outside the issued range' },
];

export const REVIEW = {
  queueTitle: 'To review', queueHide: 'Hide', queueShow: 'Show',
  queueNote: 'Worst first. Nothing leaves this list until you decide it.',
  caseTab: 'The case', historyTab: 'History',
  whyTitle: 'Why it was flagged',
  aiTitle: 'The system also noted',
  aiNote: 'These did not change the verdict and are not evidence on their own.',
  checkTitle: 'How this was checked',
  notePlaceholder: 'Add a note. Required if you change the verdict.',
  agree: 'Agree with this', changeVerdict: 'Change the verdict',
  saveChange: 'Save the change', cancelChange: 'Cancel',
  skip: 'Skip',
  backToTask: 'Back to the task', myTasks: 'My tasks',
  refuseNoteRequired: 'A note is required before you can refuse this certificate',
  refuseTitle: 'Refuse this certificate?',
  refuseBody: (signoff) => `The applicant's certificate will be refused. This goes to ${signoff} `
    + 'for sign-off before it takes effect.',
  refuseConfirm: 'Refuse it', refuseCancel: 'Cancel',
  doneTitle: (s) => `${s.decided} decided · ${s.agreed} agreed · ${s.changed} changed`
    + (s.signoff ? ` · ${s.signoff} sent for sign-off` : ''),
  doneEmpty: 'Nothing was decided this run.',
};

export const SIGNOFF = { name: 'Hessa Al Nuaimi' };

export const RUN_SET_ASIDE = [
  { doc: 'd71', reason: 'scan-failed', why: 'Scan too poor to judge fairly',
    action: 'Ask for a new scan', sentNote: 'Requested. You’ll see this here again once a new scan arrives.' },
  { doc: 'd72', reason: 'scan-failed', why: 'Scan too poor to judge fairly',
    action: 'Ask for a new scan', sentNote: 'Requested. You’ll see this here again once a new scan arrives.' },
  { doc: 'd73', reason: 'errored', why: 'The check itself failed, not the certificate',
    action: 'Try again', sentNote: 'Queued. This will run again shortly.' },
];

export const RUN = {
  stageNote: 'Five checks run on each certificate, the scan first. Anything that fails one is set aside, never given a verdict.',
  liveTitle: 'more found since you opened this page',
  liveAction: 'Add them to the list',
  liveNote: 'The list will not move on its own.',
  problemsEyebrow: 'Problems found',
  everythingEyebrow: 'Everything that needs a person',
  problemsLead: 'you can start on these now, the rest are still being checked',
  doneListNote: 'Verification is done, so this list is final.',
  listNote: 'Worst first, so the top of this list is where to start.',
  leaveNote: 'You can leave. Verification carries on, and your task list will show this as decision pending when it finishes.',
  clearedNote: 'you will never see these',
  asideNote: 'never judged, still need dealing with',
  startReviewing: 'Start reviewing',
  finishedAnnounce: 'Verification finished. Decisions are waiting.',
};

export const NEW_TASK = {
  title: 'New verification',
  subtitle: 'Add certificates that did not arrive through a connected source.',
  kinds: {
    pdf: 'file-text',
    jpg: 'image', jpeg: 'image', png: 'image', tif: 'image', tiff: 'image',
    zip: 'archive',
  },
  maxBytes: 10 * 1024 * 1024,
  reject: {
    size: 'Too large',
    kind: 'File type not supported',
    dupe: 'Already in the system',
  },
  addedLabel: 'Added',
  dropTitle: 'Drag and drop your files here',
  dropSub: 'Upload certificate files, folders, or ZIP archives',
  orLabel: 'or',
  dropBrowse: 'Browse from your computer',
  dropCap: 'Up to 10 MB per file',
  formats: [
    { ext: 'pdf', label: 'PDF', icon: 'file-text' },
    { ext: 'jpg', label: 'JPG', icon: 'image' },
    { ext: 'png', label: 'PNG', icon: 'image' },
    { ext: 'tiff', label: 'TIFF', icon: 'image' },
    { ext: 'zip', label: 'ZIP', icon: 'archive' },
    { ext: 'folder', label: 'Folder', icon: 'folder' },
  ],
  dropTip: 'Folders and ZIP archives are scanned automatically: every certificate inside is counted.',
  scanningZip: (name) => `Reading ${name}…`,
  foundInZip: (n, name) => `${n} ${n === 1 ? 'certificate' : 'certificates'} found in ${name}`,
  foundInFolder: (n, name) => `${n} ${n === 1 ? 'certificate' : 'certificates'} found in "${name}"`,
  zipEmpty: (name) => `${name} has nothing this screen can use`,
  nameLabel: 'Name',
  nameHint: 'Filled in for you. Only a label.',
  nameFallback: 'Certificates',
  addMore: 'Add more files',
  previewRows: 6,
  showAll: (n) => `Show all ${n}`,
  showLess: 'Show less',
  moreCount: (n) => `…and ${n} more`,
  warnLead: (n) => `${n} ${n === 1 ? 'file' : 'files'} will not be added.`,
  warnBody: 'They stay in the list so you can see what happened, and can be removed.',
  warnRemove: (n) => `Remove all ${n}`,
  colFile: 'File', colSize: 'Size', colStatus: 'Status',
  readyLead: (n) => `${n} ${n === 1 ? 'certificate' : 'certificates'} ready`,
  readySubClean: 'Opens as a task. You can sort and remove before anything runs.',
  readySubBad: (n) => `The ${n} above will not be included.`,
  noneLead: 'Nothing to create yet',
  noneSubBad: 'Every file you added was refused.',
  noneSubEmpty: 'Add at least one certificate.',
  metaClean: (n, size) => `${n} ${n === 1 ? 'certificate' : 'certificates'} · ${size}`,
  metaBad: (total, good) => `${total} files · ${good} will be added`,
  ctaStart: 'Create task',
  startSubClean: 'Opens as a task. You can sort and remove before anything runs.',
  startSubBad: (n) => `The ${n} above will not be included.`,
};

export const LIVE_RUN = {
  baseMs: 3000,
  perItemMs: 900,
  maxMs: 10000,
  durationFor: (total) => Math.min(LIVE_RUN.maxMs, LIVE_RUN.baseMs + total * LIVE_RUN.perItemMs),
  checking: (done, total) => `${done} of ${total} checked`,
  startingLabel: 'Starting…',
  leftLabel: (ms) => {
    if (ms < 60000) {
      const secs = Math.max(1, Math.round(ms / 1000));
      return `${secs} second${secs === 1 ? '' : 's'} left`;
    }
    const mins = Math.round(ms / 60000);
    return `about ${mins} minute${mins === 1 ? '' : 's'} left`;
  },
  estimateLabel: (ms) => (ms < 60000
    ? `${Math.max(1, Math.round(ms / 1000))} seconds`
    : `${Math.round(ms / 60000)} ${Math.round(ms / 60000) === 1 ? 'minute' : 'minutes'}`),
  doneLead: 'Verification complete',
  doneSub: (n) => `${n} ${n === 1 ? 'certificate' : 'certificates'} checked`,
  expandLabel: 'Expand',
  minimizeLabel: 'Minimize',
  dismissLabel: 'Dismiss',
  viewDetails: 'View',
  finished: (title, need) => `${title} has finished · ${need} need you`,
};
