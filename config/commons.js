export default {
  messages: {
    'sun': 'Sun',
    'mon': 'Mon',
    'tue': 'Tue',
    'wed': 'Wed',
    'thu': 'Thu',
    'fri': 'Fri',
    'sat': 'Sat',
    'sunday': 'Sunday',
    'monday': 'Monday',
    'tuesday': 'Tuesday',
    'wednesday': 'Wednesday',
    'thursday': 'Thursday',
    'friday': 'Friday',
    'saturday': 'Saturday',
    'jan': 'Jan',
    'feb': 'Feb',
    'mar': 'Mar',
    'apr': 'Apr',
    'may': 'May',
    'jun': 'Jun',
    'jul': 'Jul',
    'aug': 'Aug',
    'sep': 'Sep',
    'oct': 'Oct',
    'nov': 'Nov',
    'dec': 'Dec',
    'january': 'January',
    'february': 'February',
    'march': 'March',
    'april': 'April',
    'may_long': 'May',
    'june': 'June',
    'july': 'July',
    'august': 'August',
    'september': 'September',
    'october': 'October',
    'november': 'November',
    'december': 'December',
    'january-gen': 'January',
    'february-gen': 'February',
    'march-gen': 'March',
    'april-gen': 'April',
    'may-gen': 'May',
    'june-gen': 'June',
    'july-gen': 'July',
    'august-gen': 'August',
    'september-gen': 'September',
    'october-gen': 'October',
    'november-gen': 'November',
    'december-gen': 'December',
    'timezone-utc': 'UTC',
    'parentheses': '($1)',
    'parentheses-start': '(',
    'parentheses-end': ')',
    'word-separator': ' ',
    'comma-separator': ', ',
    'colon-separator': ': ',
    'nextdiff': 'Newer edit →',
  },
  contribsPage: 'Special:Contributions',
  timezone: 'UTC',
  useGlobalPreferences: true,
  archivePaths: [/\/Archive/],
  signatureEndingRegexp: / \(talk\)$/,
  tagName: 'convenient-discussions',
  unsignedTemplates: [
    'Unsigned',
    'Non firmato',
    'Non signé',
    'Sig',
    'Not signed',
    'Nun firmatu',
    'Unsigned2',
    'UnsignedIP',
    'Unsigned IP',
    'UnsignedIP2',
    'Unsignedip2',
  ],
  paragraphTemplates: [
    'pb',
    'Paragraph break',
  ],
  outdentTemplates: [
    'outdent',
    'Od',
    'Unindent',
    'Out',
    'Quito sangría',
    'Quitar sangría',
    'OD',
  ],
  clearTemplates: [
    'Clear',
    'Clr',
    '-',
  ],
  quoteFormatting: ["{{tq|1=", "}}<br>"],
  elementsToExcludeClasses: [
    'collapsibleheader',
  ],
  foreignElementInHeadlineClasses: [
    'adminMark',
  ],
  closedDiscussionTemplates: [
    [
      'Closed',
      'Closedh',
      'Discussion top',
      'Discussion-top',
      'Discussion top',
      'Archive top',
      'Atop',
      'Hidden begin',
      'DeletionHeader',
      'Delh',
      'Rfdh',
    ],
    [
      'End closed',
      'Closedf',
      'Ecs',
      'Discussion bottom',
      'Discussion-bottom',
      'Archive bottom',
      'Abot',
      'Hidden end',
      'DeletionFooter',
    ],
  ],
  closedDiscussionClasses: [
    'boilerplate',
    'collapsibletemplate',
    'delh',
  ],
  beforeAuthorLinkParse: function (authorLink) {
    // https://commons.wikimedia.org/wiki/MediaWiki:Gadget-markAdmins.js
    return authorLink.lastElementChild;
  },
  afterAuthorLinkParse: function (authorLink, adminMarkCandidate) {
    if (adminMarkCandidate?.classList.contains('adminMark')) {
      authorLink.appendChild(adminMarkCandidate);
    }
  }
};
