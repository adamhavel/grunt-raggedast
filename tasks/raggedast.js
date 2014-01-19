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

   grunt.registerMultiTask('raggedast', 'The best Grunt plugin ever.', function() {

      var words = ['a', 'aboard', 'about', 'above', 'across', 'after', 'against', 'along', 'amid', 'among', 'an', 'and', 'anti', 'around', 'as', 'at', 'before', 'behind', 'below', 'beneath', 'beside', 'besides', 'between', 'beyond', 'but', 'by', 'concerning', 'considering', 'despite', 'down', 'during', 'except', 'excepting', 'excluding', 'following', 'for', 'from', 'if', 'in', 'inside', 'into', 'like', 'minus', 'near', 'nor', 'of', 'on', 'onto', 'opposite', 'or', 'outside', 'over', 'past', 'plus', 'regarding', 'round', 'save', 'since', 'than', 'that', 'the', 'this', 'through', 'to', 'toward', 'towards', 'under', 'underneath', 'unlike', 'until', 'upon', 'versus', 'with', 'within', 'without'];

      var units = ['mm', 'cm', 'm', 'km', 'in', 'ft', 'ml', 'l', 'kg', 'g', 's', 'A', 'F', 'V', 'J', 'W', 'N', 'T', 'H', 'Hz', '°C', '°F', '%', 'Ω', 'dpi', 'dpp', 'px'];

      var options = this.options({
         selector: 'p',
         space: '&#160;',
         words: true, 
         symbols: true,
         units: true,
         numbers: true,
         emphasis: true,
         quotes: true,
         shortWords: 2,
         limit: 0
      });

      /**
       * Regular expression for words that shouldn't end up last on the line, i.e. prepositions,
       * articles and conjunctions.
       * 1. Finds boundaries of words. Matches a whitespace, a beginning of line, an open parenthesis,
       *    an end of HTML tag or the specified hard space. We'd prefer to employ lookbehind,
       *    since we don't want the boundary to appear in the match, but JavaScript regex engine
       *    doesn't support it. Using '\b' (which has a length of zero) is a possibility, but it would
       *    make the pattern match words like 'right-on', which is not desirable.
       * 2. Matches an opening quote mark, in case there's one.
       * 3. List of words to match.
       * 4. Deals with the case where the word is immediatelly followed by one or several HTML tags.
       * 5. Matches a string of whitespaces. Makes sure the word is not yet processed or at the end
       *    of a sentence.
       * 6. Greedily repeats steps 3.–5. thus finding the longest continous string of words possible.
       */
      var regexWords = new RegExp(
         '(\\s|^|\\(|\\[|>|—|' + options.space + ')' /* 1. */
         + '["\'´`„“‚‘‛‟‹«]?' /* 2. */
         + '('
            + '(' + words.join('|') + ')' /* 3. */
            + '(<[^>]+>)*' /* 4. */
            + '(\\s)+' /* 5. */
         + ')+', /* 6. */
      'gi');

      /**
       * Regular expressions for mathematical expressions and spaced dashes.
       * 1. Matches a string of whitespaces and hard spaces, in case the surroundings
       *    have already been processed. 
       * 2. Matches common mathematical symbols and en or em dashes.
       */
      var regexSymbols = new RegExp(
         '(\\s|' + options.space + ')+' /* 1. */
         + '[-\\+:\\/\\=–—]' /* 2. */
         + '(\\s|' + options.space + ')+', /* 1. */
      'gi');

      /**
       * Regular expressions to find units preceded by a number.
       * 1. Finds a number.
       * 2. Fires a match if it's followed by whitespaces and one of the specified unit.
       */
      var regexUnits = new RegExp(
         '[\\d]' /* 1. */
         + '[\\s]+(' + units.join('|') + ')(?=\\W)', /* 2. */
      'gi');

      /**
       * Regular expressions to find numbers separated into groups of thousands.
       * 1. Finds the first group of numbers.
       * 2. Fires a match for whitespaces followed by a group of three numbers.
       *    Repeats greedily.
       */
      var regexNumbers = new RegExp(
         '[\\d]' /* 1. */
         + '([\\s]+[\\d]{3})+', /* 2. */
      'gi');
                                
      /**
       * Regular expression to find short emphasized phrases.
       * 1. Finds the opening and closing tags.
       * 2. Matches the first one or two words, depending on the phrase length.
       * 3. Matches the last emphasized word.
       */
      var regexEmphasis = new RegExp(
         '<(strong|em|b|i)>' /* 1. */
         + '([^\\s<]+[\\s]+){1,2}' /* 2. */
         + '([^\\s<]+[\\s]*)' /* 3. */
         + '<\\/(strong|em|b|i)>', /* 1. */
      'gi');

      /**
       * Regular expression to find short quotations.
       * 1. Finds the opening and closing quote marks.
       * 2. Matches the first one or two words, depending on the quote length.
       * 3. Matches the last quoted word.
       */
      var regexQuotes = new RegExp(
         '(\\s|^|\\(|\\[|>|—|' + options.space + ')'
         + '["\'´`„“‚‘‛‟‹«]' /* 1. */
         + '([^\\s]+[\\s]+){1,2}' /* 2. */
         + '([^\\s]+?[\\s]*)' /* 3. */
         + '["\'´`”’‛‟›»]', /* 1. */
      'gi');

      var regexSpace = new RegExp(options.space, 'gi');

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

            /**
             * It is better to take care of emphasis and quotes first, so we don't
             * have to tackle with hard spaces possibly inserted by other processing.
             */
            if (options.emphasis) {
               contents = contents.replace(regexEmphasis, function(content) {
                  return content.replace(/\s+/gi, options.space);
               });  
            }

            /**
             * We have to deal with the boundary character being part of the matched string,
             * in case it's a whitespace.
             */
            if (options.quotes) {
               contents = contents.replace(regexQuotes, function(content) {
                  return content.substr(0, 1) + content.substr(1).replace(/\s+/gi, options.space);
               });  
            }

            if (options.words) {
               contents = contents.replace(regexWords, function(content) {
                  return content.substr(0, 1) + content.substr(1).replace(/\s+/gi, options.space);
               });   
            }

            if (options.symbols) {
               contents = contents.replace(regexSymbols, function(content) {
                  return content.replace(/\s+/gi, options.space);
               });  
            }

            if (options.units) {
               contents = contents.replace(regexUnits, function(content) {
                  return content.replace(/\s+/gi, options.space);
               });  
            }

            if (options.numbers) {
               contents = contents.replace(regexNumbers, function(content) {
                  return content.replace(/\s+/gi, options.space);
               });  
            }

            if (options.shortWords != 0) {

               // Almost the same as the regex for predefined words.
               var regexShort = new RegExp(
                  '(\\s|^|\\(|\\[|>|' + options.space + ')'
                  + '["\'´`„“‚‘‛‟‹«]?'
                  + '('
                     + '([\\w-–’\']{1,' + options.shortWords + '})'
                     + '(<[^>]+>)*'
                     + '(\\s)+'
                  + ')+',
               'gi');
               
               contents = contents.replace(regexShort, function(content) {
                  return content.substr(0, 1) + content.substr(1).replace(/\s+/gi, options.space);
               });   
            }
            
            // We want to tame too many hard spaces in a row.
            if (options.limit != 0) {

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
                     '([\\w-–’\']+?' + options.space + ')' /* 1. */
                     + '{' + (options.limit - 1) + ',' + maxCount + '}', /* 2. */
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
