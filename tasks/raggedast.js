/*
 * grunt-raggedast
 * https://github.com/rizzenvrinn/grunt-raggedast
 *
 * Copyright (c) 2014 Adam Havel
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

   var cheerio = require('cheerio');

   grunt.registerMultiTask('raggedast', 'Adjust the text rag of your documents for better readability.', function() {

      var words = ['a', 'aboard', 'about', 'above', 'across', 'after', 'against', 'along', 'amid', 'among', 'an', 'and', 'anti', 'around', 'as', 'at', 'before', 'behind', 'below', 'beneath', 'beside', 'besides', 'between', 'beyond', 'but', 'by', 'concerning', 'considering', 'despite', 'down', 'during', 'except', 'excepting', 'excluding', 'following', 'for', 'from', 'if', 'in', 'inside', 'into', 'like', 'minus', 'near', 'nor', 'of', 'on', 'onto', 'opposite', 'or', 'outside', 'over', 'past', 'plus', 'regarding', 'round', 'save', 'since', 'than', 'that', 'the', 'this', 'through', 'to', 'toward', 'towards', 'under', 'underneath', 'unlike', 'until', 'upon', 'versus', 'with', 'within', 'without'];

      var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

      function shortMonths(months) {
         return months.map(function (month) {
            return month.substr(0, 3);
         });
      }

      var units = ['mm', 'cm', 'm', 'km', 'in', 'ft', 'ml', 'l', 'kg', 'g', 's', 'A', 'F', 'V', 'J', 'W', 'N', 'T', 'H', 'Hz', '°C', '°F', '%', 'Ω', 'dpi', 'dpp', 'px'];

      var options = this.options({
         selector: 'p',
         space: '&#160;',
         thinSpace: '&#8239;',
         words: true, 
         symbols: true,
         units: true,
         numbers: true,
         emphasis: true,
         quotes: true,
         months: true,
         orphans: 2,
         shortWords: 2,
         limit: 0
      });

      var openingQuotes = '["\'´`„“‚‘‛‟‹«]',
          closingQuotes = '["\'´`”’‛‟›»]',
          gap = '(<[^>]+>|\\s|' + options.space + ')',
          boundary = '(\\s|^|\\(|\\[|>|' + options.space + ')',
          outsideTag = '(?![^<>]+>)';

      var regexSpace = new RegExp(options.space, 'gi');

      /**
       * Regular expression that matches only whitespaces that are not inside a tag.
       */
      var regexWhitespace = new RegExp(
         '\\s+' + outsideTag,
      'gi')

      // Iterate over all specified file groups.
      this.files.forEach(function(f) {
         var src = f.src.filter(function(filepath) {
            // Warn on and remove invalid source files (if nonull was set).
            if (!grunt.file.exists(filepath)) {
               grunt.log.warn('Source file "' + filepath + '" not found.');
               return false;
            } else {
               return true;
            }
         }).map(function(filepath) {
           // Read file source.
           return grunt.file.read(filepath);
         });   

         var $ = cheerio.load(src);

         $(options.selector).map(function() {
            var contents = $(this).html();

            if (options.emphasis) {

               /**
                * Regular expression that searches for short emphasized phrases.
                * 1. Finds boundaries of words. Matches a whitespace, a beginning of line, an open parenthesis,
                *    an end of HTML tag or the specified hard space. We'd prefer to employ lookbehind,
                *    since we don't want the boundary to appear in the match, but JavaScript regex engine
                *    doesn't support it. Using '\b' (which has a length of zero) is possible, but it would
                *    match words like 'on' in 'right-on', which is not desirable.
                * 2. Finds the opening and closing tags.
                * 3. Matches the first one or two words, depending on the phrase length.
                * 4. Matches the last emphasized word.
                */
               var regexEmphasis = new RegExp(
                  boundary /* 1. */
                  + '<(strong|em|b|i)[^>]+>' /* 2. */
                  + '([^\\s<]+' + gap + '+){1,2}' /* 3. */
                  + '([^\\s<]+' + gap + '*)' /* 4. */
                  + '<\\/(strong|em|b|i)>(?=\\W)', /* 2. */
               'gi');

               /**
                * We have to deal with the boundary character being part of the matched string,
                * in case it's a whitespace.
                */
               contents = contents.replace(regexEmphasis, function(content) {
                  return content.substr(0, 1) + content.substr(1).replace(regexWhitespace, options.space);
               });  
            }

            if (options.quotes) {

               /**
                * Regular expression for catching short quotations.
                * 1. Finds the opening and closing quote marks.
                * 2. Matches the first one or two words, depending on the quote length.
                * 3. Matches the last quoted word.
                */
               var regexQuotes = new RegExp(
                  boundary
                  + openingQuotes /* 1. */
                  + '([^\\s<]+' + gap + '+){1,2}' /* 2. */
                  + '([^\\s<]+?' + gap + '*)' /* 3. */
                  + closingQuotes, /* 1. */
               'gi');

               contents = contents.replace(regexQuotes, function(content) {
                  return content.substr(0, 1) + content.substr(1).replace(regexWhitespace, options.space);
               });  
            }

            if (options.words) {

               /**
                * Regular expression that looks for words that shouldn't end up last on the line, i.e. prepositions,
                * articles and conjunctions.
                * 1. Matches an opening quote mark, in case there's one.
                * 2. List of words to match. 
                * 3. Matches a gap between words. That could consist of any combination of whitespaces, tags
                *    or hard spaces.
                * 4. Greedily repeats steps 2. and 3., thus finding the longest continous string of matching
                *    words possible.
                */
               var regexWords = new RegExp(
                  boundary
                  + openingQuotes + '?' /* 1. */
                  + '('
                     + '(' + words.join('|') + ')' /* 2. */
                     + gap + '+' /* 3. */
                     + outsideTag
                  + ')+', /* 4. */
               'gi');

               contents = contents.replace(regexWords, function(content) {
                  return content.substr(0, 1) + content.substr(1).replace(regexWhitespace, options.space);
               });   
            }

            if (options.symbols) {

               /**
                * Regular expressions for mathematical expressions and spaced dashes.
                * 1. Matches common mathematical symbols and en or em dashes, NOT hyphens.
                *    Should support Unicode numerical references in the future.
                */
               var regexSymbols = new RegExp(
                  gap + '*'
                  + '([×\\+\\/\\=−–—])' /* 1. */
                  + gap + '*',
               'gi');

               contents = contents.replace(regexSymbols, function(content) {
                  return content.replace(regexWhitespace, options.space);
               });  
            }

            if (options.units) {

               /**
                * Regular expression that looks for SI units preceded by a number.
                * 1. Finds a number.
                * 2. Fires a match if it's followed by whitespaces and one of the specified unit.
                */
               var regexUnits = new RegExp(
                  '[\\d]' /* 1. */
                  + gap + '+'
                  + '(' + units.join('|') + ')(?=\\W)', /* 2. */
               'gi');

               contents = contents.replace(regexUnits, function(content) {
                  return content.replace(regexWhitespace, options.space);
               });  
            }

            if (options.numbers) {

               /**
                * Regular expression that matches numbers separated into groups of thousands.
                * 1. Finds the first group of numbers.
                * 2. Fires a match for whitespaces followed by a group of three numbers.
                *    Repeats greedily.
                */
               var regexNumbers = new RegExp(
                  '[\\d]' /* 1. */
                  + '(' + gap + '+[\\d]{3})+', /* 2. */
               'gi');

               contents = contents.replace(regexNumbers, function(content) {
                  return content.replace(regexWhitespace, options.thinSpace);
               });  
            }

            if (options.months) {

               /**
                * Regular expressions for catching dates with full or short month names.
                * A date can follow either the format '12 Dec[ember] 2013' or 'Dec[ember] 12, 2013',
                * the year part being optional.
                * 1. Finds a number corresponding to a day.
                * 2. Matches a month name, either full, e.g. 'January', or a short one like 'Jan'.
                *    It must not be followed by another letter, since the next part is optional and we
                *    don't want to include words like 'Jane'.
                * 3. The month can be followed by a number representing a year.
                * 4. The pattern either matches 1.–3. or tries to find the other format, beginning
                *    with a month name instead.
                * 5. The month must be followed by a number.
                * 6. The string can optionally end with a year, separated by a comma.
                */
               var regexMonths = new RegExp(
                  '([\\d]{1,2}' /* 1. */
                  + gap + '+(' + months.join('|') + '|' + shortMonths(months).join('|') + ')(?=\\W)' /* 2. */
                  + '(' + gap + '+[\\d]{1,4})?' /* 3. */
                  + '|(' + months.join('|') + '|' + shortMonths(months).join('|') + ')' /* 4. */
                  + gap + '+[\\d]{1,2}' /* 5. */
                  + '(,' + gap + '+[\\d]{1,4})?)', /* 6. */
               'gi');

               contents = contents.replace(regexMonths, function(content) {
                  return content.replace(regexWhitespace, options.space);
               });  
            }

            if (options.orphans > 1) {

               /**
                * Regular expressions that searches for "orphans" at the end of paragraphs,
                * headlines or any other block of text.
                * 1. Matches a specified number of words.
                * 2. The text might or not end with a dot or similar character. Punctuations
                *    with more than one character, e.g. ellipsis, are not yet supported.
                * 3. The whole sequence must be at the very end of the processed text.
                */
               var regexOrphans = new RegExp(
                  '(' + gap + '+'
                  + '[^\\s<]+'
                  + '){1,' + (options.orphans - 1) + '}' /* 1. */
                  + '[^\\s]?' /* 2. */
                  + '$', /* 3. */
               'gi');

               contents = contents.replace(regexOrphans, function(content) {
                  return content.replace(regexWhitespace, options.space);
               });  
            }

            if (options.shortWords > 0) {

               /**
                * Regular expression for short words.
                * 1. Matches words that fall within the specified length.
                */
               var regexShort = new RegExp(
                  boundary
                  + openingQuotes + '?'
                  + '('
                     + '([\\w-–’\']{1,' + options.shortWords + '})' /* 1. */
                     + gap
                     + outsideTag
                  + ')+',
               'gi');
               
               contents = contents.replace(regexShort, function(content) {
                  return content.substr(0, 1) + content.substr(1).replace(regexWhitespace, options.space);
               });   
            }
            
            // We want to tame too many hard spaces in a row.
            if (options.limit > 0) {

               // Get count of all hard spaces in given context.
               var maxCount = contents.match(regexSpace).length;

               // No reason to continue if the limit is way too high.
               if (options.limit < maxCount) {
               
                  /**
                   * Regular expression for strings that have more hard spaces in a row than allowed.
                   * 1. Matches words separated by the specified hard space.
                   * 2. Sets the range for words count that should fire as match.
                   */
                  var regexLimit = new RegExp(
                     '(([^\\s]|<[^>]+>)+?' + options.space + ')' /* 1. */
                     + '{' + (options.limit) + ',' + maxCount + '}', /* 2. */
                  'gi');

                  // Recursive goodness.
                  var reduce = function(streak) {
                     var count;
                     // If there is no hard space to remove or the count is within limits, do nothing.
                     if (!regexSpace.test(streak) || (count = streak.match(regexSpace).length) < options.limit) {
                        return streak;
                     }
                     var spaceLength = options.space.length;
                     // Find the hard space (more or less) in middle.
                     for (var i = Math.round(count / 2), splitIndex = 0; i--;) {
                        splitIndex = streak.indexOf(options.space, splitIndex) + spaceLength;
                     }
                     /**
                      *  Divide and conquer the strings that remained after splitting the original one in two
                      *  and replace the hard space in middle with a simple whitespace.
                      */
                     return reduce(streak.substr(0, splitIndex - spaceLength)) + ' ' + reduce(streak.substr(splitIndex));
                  };

                  contents = contents.replace(regexLimit, function(streak) {
                     // Crush the strings that broke the limit.
                     return reduce(streak);
                  });

               }
                  
            }
            $(this).html(contents);
         });

         var output = $.html();
         var count = 0;

         if (regexSpace.test(output)) {
            count = output.match(regexSpace).length;
         }

         grunt.log.writeln(count + ' hard spaces added to file "' + f.dest + '".');

         // Write the destination file.
         grunt.file.write(f.dest, output);

         // Print a success message.
         grunt.log.writeln('File "' + f.dest + '" created.');
      });

   });

};
