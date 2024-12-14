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
    'nextdiff': 'Next edit →',
    'pagetitle': '$1 - Wikipedia',
    'discussiontools-topicsubscription-button-subscribe': 'subscribe',
    'discussiontools-topicsubscription-button-subscribe-tooltip': '{{GENDER:|Subscribe}} to receive notifications about new comments.',
    'discussiontools-topicsubscription-button-unsubscribe': 'unsubscribe',
    'discussiontools-topicsubscription-button-unsubscribe-tooltip': '{{GENDER:|Unsubscribe}} to stop receiving notifications about new comments.',
    'discussiontools-topicsubscription-notify-subscribed-title': '{{GENDER:|You}} have subscribed!',
    'discussiontools-topicsubscription-notify-subscribed-body': '{{GENDER:|You}} will receive notifications about new comments in this topic.',
    'discussiontools-topicsubscription-notify-unsubscribed-title': '{{GENDER:|You}} have unsubscribed.',
    'discussiontools-topicsubscription-notify-unsubscribed-body': '{{GENDER:|You}} will no longer receive notifications about new comments in this topic.',
    'discussiontools-newtopicssubscription-button-subscribe-label': 'Subscribe',
    'discussiontools-newtopicssubscription-button-subscribe-tooltip': 'Subscribe to receive notifications when new topics are started on this page.',
    'discussiontools-newtopicssubscription-button-unsubscribe-label': 'Unsubscribe',
    'discussiontools-newtopicssubscription-button-unsubscribe-tooltip': 'Unsubscribe to stop receiving notifications when new topics are started on this page.',
    'discussiontools-newtopicssubscription-notify-subscribed-title': '{{GENDER:|You}} have subscribed!',
    'discussiontools-newtopicssubscription-notify-subscribed-body': '{{GENDER:|You}} will receive notifications when new topics are started on this page.',
    'discussiontools-newtopicssubscription-notify-unsubscribed-title': '{{GENDER:|You}} have unsubscribed.',
    'discussiontools-newtopicssubscription-notify-unsubscribed-body': '{{GENDER:|You}} will no longer receive notifications when new topics are started on this page.',
    'visualeditor-educationpopup-dismiss': 'Okay, got it',
  },

  specialPageAliases: {
    'Contributions': 'Contributions',
    'Diff': 'Diff',
    'PermanentLink': 'PermanentLink',
  },

  timezone: 'UTC',

  archivePaths: [
    {
      source: "Wikipedia:Administrators' noticeboard/Incidents",
      archive: "Wikipedia:Administrators' noticeboard/IncidentArchive",
    },
    {
      source: "Wikipedia:Administrators' noticeboard/Edit warring",
      archive: "Wikipedia:Administrators' noticeboard/3RRArchive",
    },

    // Exclude paths "User talk:Σ/Testing facility/Archiver"
    /\/Archive(?![a-rt-z])/,
  ],

  archivingConfig: {
    templates: [
      {
        name: 'User:MiszaBot/config',
        pathParam: 'archive',
        counterParam: 'counter',
        replacements: new Map([
          [/%\(counter\)(0\d)?d/, ({ counter }, match) => {
            if (counter === null) {
              return match[0];
            }
            const padding = match[1] ? match[1].slice(1) : '';
            return padding ? String(counter).padStart(Number(padding), '0') : String(counter);
          }],

          [/%\(year\)(0\d)?d/, ({ date }, match) => {
            if (date === null) {
              return match[0];
            }
            const padding = match[1] ? match[1].slice(1) : '';
            const year = date.getFullYear();
            return padding ? String(year).padStart(Number(padding), '0') : String(year);
          }],

          [/%\(month\)(0\d)?d/, ({ date }, match) => {
            if (date === null) {
              return match[0];
            }
            const padding = match[1] ? match[1].slice(1) : '';
            const month = date.getMonth() + 1;
            return padding ? String(month).padStart(Number(padding), '0') : String(month);
          }],

          [/%\(monthname\)s/, ({ date }, match) => {
            if (date === null) {
              return match[0];
            }
            const monthNames = [
              'January', 'February', 'March', 'April', 'May', 'June',
              'July', 'August', 'September', 'October', 'November', 'December'
            ];
            return monthNames[date.getMonth()];
          }],

          [/%\(monthnameshort\)s/, ({ date }, match) => {
            if (date === null) {
              return match[0];
            }
            const monthNamesShort = [
              'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
              'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
            ];
            return monthNamesShort[date.getMonth()];
          }]
        ]),
      },
    ],
  },

  /*pageWhitelist: [
    /^Wikipedia:/,
    /^Help:/,
    /^Template:Did you know nominations\//,
  ],*/

  spaceAfterIndentationChars: false,

  pageBlacklist: [
    'Wikipedia:Wikipedia Signpost',
    /Wikipedia:WikiProject [^/]+$/,
    /Wikipedia:WikiProject [^/]+\/(Members|Participants)/,
  ],

  signatureEndingRegexp: / \(talk\)$/,

  tagName: 'convenient-discussions',

  smallDivTemplates: [
    'smalldiv',
    'Div-small',
  ],

  unsignedTemplates: [
		'Unsigned',
		'Unsigned3',
		'Unsig',
		'Unsinged',
		'Signed',
		'Unsign',
		'UNSIGNED',
		'Uns',
		'Tidle',
		'Nosign',
		'Forgot to sign',
		'Without signature',
		'USU',
		'Unsigned comment',
		'Preceding unsigned comment',
		'Unisgned',
		'Unsigned2',
		'Unsigned2Tz',
		'Unsigned 2',
		'Unsigned IP',
		'Unsignedip',
		'Ipunsigned',
		'IPsign',
		'UnsignedIP',
		'USIP',
		'Unsigned ip',
		'Unsigned-ip',
		'Unsigned-Ip',
		'Unsigned-IP',
		'Uip',
		'IP unsigned',
		'UnsignedIP2',
		'Unsignedip2',
		'Unsigned2ip',
		'Unsigned2IP',
		'Unsigned IP2',
		'Unsigned ip2'
  ],

  paragraphTemplates: [
    'pb',
    'Paragraph break',
    'Break!',
    'Paragraph',
    'Parabr',
    'Paragr',
    'Paragraphbreak',
    'Par break',
    'Parabreak',
    'Para break',
  ],

  outdentTemplates: [
    'outdent',
    'Noindent',
    'Unindent',
    'Outdentarrow',
    'Oda',
    'Od',
    'Out',
    'De-indent',
    'Deindent',
    'Outindent',
    'OD',
    'Reduceindent',
    'Dedent',
    'Break indent',
    'Rethread',
  ],

  clearTemplates: [
    'Clear',
    'Clr',
    '-',
    'CleanBr',
    'BrClear',
    'Breakafterimages',
    'Br',
    'Sectionbreak',
    'BR',
    'Clear all',
    'Clear both',
    'Clearboth',
    'CLEAR',
    'Absatz',
  ],

  reflistTalkTemplates: [
    'Reflist-talk',
    'Reflist talk',
    'Talk-reflist',
    'Reftalk',
    'Talk reflist',
    'Talk ref',
    'Ref talk',
    'Reference talk',
    'Talk reference',
    'Talkref',
    'Tref',
    'TREF',
    'Talk page reference',
    'Ref-talk',
    'Reflisttalk',
    'Inlineref',
    'Reflist-quote',
    'Section references',
    'Talk page reflist',
    'REftalk',
    'Talk page-reflist',
    'Talk refs',
    'Talk references',
    'Talk page ref',
    'Talk-refs',
    'Realist-talk',
    'Rlt',
    'Talk-ref',
    'Reflist-section',
    'Talkreflist',
    'Reflist-talkpage',
    'Talkpageref',
    'Section reflist',
    'Talkrefs',
    'Notelist-talk',
    'Tnote',
    'Talk notelist',
    'Notelist talk',
    'Talknote',
    'Nlt',
  ],

  reflistTalkClasses: ['reflist-talk'],

  quoteFormatting: function (useBlockFormatting, author, timestamp, dtId) {
    var pre = '';
    var post = '';
    if (useBlockFormatting) {
      pre = '{{tqb|text=';
      if (author) {
        post += '|by=' + author;
      }
      if (timestamp) {
        post += '|ts=' + timestamp;
      }
      if (dtId) {
        post += '|id=' + dtId;
      }
      post += '}}';
    } else {
      pre = '{{tq|1='
      post += '}}<br>';
    }
    return [pre, post];
  },

  noSignatureClasses: [
    'unresolved',
    'resolved',
    'ambox',

    // {{GA nominee|timestamp}}
    'tmbox',

    'NavFrame',
  ],

  noSignatureTemplates: [
    'Moved discussion from',
    'Discussion moved from',
    'Dmf',
    'Moved from',
    'Moved conversation from',
    'Movedfrom',
    'Mdf',
    'Moved discussion to',
    'Discussion at',
    'Discussion moved',
    'Discussion moved to',
    'Dmt',
    'Moved to',
    'Moved conversation',
    'Moved discussion',
    'Mdt',
    'Moved',
    'Discussion-moved',
    'DiscussionMoved',
    'Movedto',
    'Move to',
  ],

  closedDiscussionTemplates: [
    [
      'Closed',
      'Discussion closed',
      'Discussion top',
      'Discussion-top',
      'Discussiontop',
      'Dtop',
      'Dit',
      'Close topic',
      'Archive top',
      'Debate top',
      'Archive-begin',
      'Consensus top',
      'COI top',
      'Coit',
      'Archive t',
      'Archivetop',
      'Archive-top',
      'Arct',
      'Closed-top',
      'Atop',
      'Archive top blue',
      'Archived top',
      'Hattop',
      'Hat top',
      'Htop',
      'Close top',
      'Closed top',
      'Hidden archive top',
      'Hat',
      'Archive hidden top',
      'HAT',
      'Afd top',
      'Vt',
      'Vfd top',
      'Afdtop',
      'AfD top',
      'Afd t',
      'Afdt',
      'Afd-top',
      'AFD top',
      'DAT',
      'Collapsed top',
      'Collapsetop',
      'Coltop',
      'Collapse begin',
      'Cot',
      'Collapse-top',
      'Ctop',
      'Spoilertop',
      'Collapose top',
      'Collapsoe top',
      'Extended content top',
    ],
    [
      'Archive bottom',
      'Ab',
      'Debate bottom',
      'Archive-end',
      'Consensus bottom',
      'Sfp bottom',
      'Report bottom',
      'COI bottom',
      'Rfc bottom',
      'Rfcbot',
      'Discussion bottom',
      'Coib',
      'Cem bottom',
      'Archive b',
      'Rfc b',
      'Discussion-bottom',
      'Discussionbottom',
      'Archivebottom',
      'Archive-bottom',
      'Dbot',
      'Arcb',
      'RM bottom',
      'Rmb',
      'Rm bottom',
      'Rfcbottom',
      'Archived WikiProject Proposal bottom',
      'Closed-bottom',
      'RMB',
      'Dib',
      'ACR bottom',
      'Archive bot',
      'Abot',
      'RMbottom',
      'Dbottom',
      'Closed rfc bottom',
      'Abottom',
      'Archived bottom',
      'Rmbottom',
      'Hat bottom',
      'Hatbottom',
      'Hbot',
      'Abtm',
      'Close bottom',
      'Rm b',
      'Closed bottom',
      'Rmbot',
      'A bottom',
      'Hidden archive bottom',
      'Hab',
      'Hatb',
      'Archive hidden bottom',
      'HAB',
      'Afd bottom',
      'Vf',
      'Vfd bottom',
      'Afdbottom',
      'AfD bottom',
      'Afd b',
      'Afdb',
      'Afd-bottom',
      'AFD bottom',
      'Afdbot',
      'Afd bot',
      'Collapsed bottom',
      'Collapsebottom',
      'Colbot',
      'Cob',
      'Collapse end',
      'Collapse bot',
      'Collapse-bottom',
      'Cbot',
      'Spoilerbottom',
      'Collapsoe bottom',
      'Collapose bottom',
      'Extended content bottom',
      'Cbottom',
    ],
  ],

  closedDiscussionClasses: [
    'archived',
    'boilerplate',
  ],

  noHighlightClasses: [
    'infobox',
    'unresolved',
    'resolved',
  ],

  undoTexts: [
    'Undid revision',
    'Reverted edits',
  ],

  rejectNode: function (node) {
    return ['boilerplate-header', 'side-box-right'].some((name) => node.classList.contains(name));
  },

  getMoveSourcePageCode: function (targetPageWikilink, signature) {
    return '{{Moved discussion to|' + targetPageWikilink + '|' + signature + '}}\n';
  },

  getMoveTargetPageCode: function (targetPageWikilink, signature) {
    return '{{Moved discussion from|' + targetPageWikilink + '|' + signature + '}}\n';
  },
};

mw.hook('convenientDiscussions.pageReadyFirstTime').add(function () {
  if ($('.localcomments[style="font-size: 95%; white-space: nowrap;"]').length) {
    const $text = convenientDiscussions.api.wrapHtml('User script <a href="//en.wikipedia.org/wiki/User:Gary/comments_in_local_time.js">comments_in_local_time.js</a> is executed earlier than Convenient Discussions, which prevents the latter from working correctly. Follow the instructions <a href="' + mw.util.getUrl(convenientDiscussions.config.scriptPageWikilink) + '#Compatibility">here</a> to make them compatible.');
    mw.notify($text, {
      type: 'warn',
      autoHide: false,
    });
  }
});

mw.loader.using('mediawiki.util').then(function () {
  mw.util.addCSS('\
    .cd-comment-timestamp .localcomments {\
      font-size: unset !important;\
    }\
    \
    .mw-parser-output .cd-commentLayersContainer-parent-relative.folda-collapsed {\
      overflow: hidden !important;\
    }\
    \
    .hat-content > .cd-commentLevel:not(ol) {\
      margin-left: -12px;\
    }\
  ');
});
