/* Copyright 2019 Schibsted */

/***
 *
 * Can parse:
 * Byradet Oslo
 *
 */
module.exports = {
  /***
   * The parse method for "Byradet" (Oslo) will extract data from the raw text generated by DocumentCloud
   * for a PDF.
   * To determine if the parser was able to parse the file, check the returnValue.parsed field
   * (true|false).
   */
  parse: function(raw) {
    var helper = require('./../helpers/documentParserHelper');

    var items = [];
    var globalParsed = false;

    var cases = raw.split(/(\d{3,4}\/\d{3,6}-\d{1,4})/);

    //loop on two by two, grab id into resulting item post parse
    for (var i = 1; i < cases.length; i += 2) {
      var itemId = cases[i];
      var result = parseSingle(cases[i + 1], this.options);

      if (result) {
        //clean up data for DB, resolve ambiguity...
        globalParsed = true;

        var item = result;
        item.caseNumber = itemId;

        // * add expected fields (sender, receiver) based on meta hits on labeling
        // /(Fra:\nTil:)/,  /(Til:)/, /(Fra:)/, /(Andre opplysninger er avskjermet)/
        item.receiver = item.sender = '';

        if (item.senderOrReceiverLabel == 'Andre opplysninger er avskjermet') {
          item.receiver = item.sender = item.senderOrReceiverLabel;
        } else if (item.senderOrReceiverLabel == 'Til:') {
          item.receiver = item.senderOrReceiver;
        } else {
          item.sender = item.senderOrReceiver;
        }

        if (item.documentType == 'Andre opplysninger er avskjermet') {
          item.documentType = 'Avskj';
        }

        //adjust date format to date format
        item.documentDate = getDateFromString(item.documentDate);
        item.recordedDate = getDateFromString(item.recordedDate);

        items.push(item);
      } else {
        // console.log("failed" + i);
        // if(i == 87 ) console.log(cases[i+1]);
      }
    }

    // console.log("total:" + cases.length + " expected cases: " + ((cases.length-1)/2) );
    // console.log("parsed: " + items.length);

    //return the array of parsed items and status or default error message
    if (globalParsed) {
      return { parsed: true, items: items };
    }
    return {
      parsed: false,
      items: items,
      error: { message: 'No items found in source' },
    };

    /***
     * Uses the documentParserHelper method directly
     * todo: consider exposing this also as a helper function, since duplicated with UniBlue
     */
    function parseSingle(raw, options) {
      var result = {};
      options.fields.forEach(function(field) {
        var rawResult = helper.getValueFromString(raw, field.regexList);
        result[field.name] = field.allowNewLines
          ? rawResult
          : helper.removeNewLines(rawResult);
      });

      return result;
    }

    /***
     * Converts a string with the format Dok.dato: 24102012  to a date object.
     */
    function getDateFromString(dateString) {
      try {
        if (dateString.length === 8) {
          var year = dateString.substring(4, 8);
          var month = dateString.substring(2, 4);
          var day = dateString.substring(0, 2);
        } else {
          return '';
        }
        /*
         Parse the date as a string to avoid one day offset
         http://stackoverflow.com/questions/7556591/javascript-date-object-always-one-day-off)
         */
        return new Date('"' + year + '/' + month + '/' + day + '"');
      } catch (e) {
        return '';
      }
    }
  },

  options: {
    fields: [
      // {
      //   name: "caseNumber",
      //   regexList: [
      //     /(\d{3,4}\/\d{3,6}-\d{1,4})/
      //   ]
      // },
      {
        name: 'documentTitle',
        regexList: [
          /Sak:\nDok:[\s\S]*?Arkivdel:.*([\s\S]*?)(?:Saksansv)/,
          /Dok:([\s\S]*?)(?:Saksansv)/,
          /(Par.: § 13)/,
        ],
      },
      {
        name: 'caseTitle',
        regexList: [/Sek.kode:\nArkivdel:.*\n.*\n(.*)/, /Sek.kode:\n.*\n(.*)/],
      },
      {
        name: 'senderOrReceiver',
        regexList: [/Sek.kode:\nArkivdel:.*\n(.*)/, /Sek.kode:\n(.*)/],
      },
      {
        name: 'senderOrReceiverLabel',
        regexList: [
          /(Fra:\nTil:)/,
          /(Til:)/,
          /(Fra:)/,
          /(Andre opplysninger er avskjermet)/,
        ],
      },
      {
        name: 'documentType',
        regexList: [/\n(U|N|I|X)\n/, /(Andre opplysninger er avskjermet)/],
      },
      {
        name: 'documentDate',
        regexList: [/Dok.dato:([\s\S]*?)Arkivkode:/],
      },
      {
        name: 'recordedDate',
        regexList: [/Jour.dato:([\s\S]*?)Sek.kode:/],
      },
      {
        name: 'caseOfficer',
        regexList: [/Saksbeh:(.*)/, /(Andre opplysninger er avskjermet)/],
      },
      {
        name: 'caseResponsible',
        regexList: [/Saksansv:(.*)/, /(Andre opplysninger er avskjermet)/],
      },
      {
        name: 'classification',
        regexList: [/Grad:([\s\S]*?)(?:Jour.dato|Par.)/],
      },
      {
        name: 'legalParagraph',
        regexList: [/Par.:(.*)/],
      },
    ],

    noise: [/Offentlig journal/g, /Side\d*/g],
  },
};