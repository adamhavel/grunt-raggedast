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

      var preps = /([^a-zA-Z-–\.]|^)(a|aboard|about|above|across|after|against|along|amid|among|an|and|anti|around|at|before|behind|below|beneath|beside|besides|between|beyond|by|concerning|considering|despite|down|during|except|excepting|excluding|following|for|from|if|in|inside|into|like|minus|near|of|on|onto|opposite|or|outside|over|past|plus|regarding|round|save|since|than|that|the|this|through|to|toward|towards|under|underneath|unlike|until|upon|versus|with|within|without)(<.*>)*(?=\s)/gi;

      var smallwords = /(\s|^)(([a-zA-Z-_(]{1,2}('|’)*[a-zA-Z-_,;]{0,1}?\s)+)/gi;
                                
      var symbols = /\s[-–—\+:\/=]\s/gi;
                                
      var emphasis = /(<(strong|em|b|i)>)(([^\s]+\s*){2,3})?(<\/(strong|em|b|i)>)/gi;

      var options = this.options({
         selector: 'p',
         space: '&#160;',
         method: 'all',
         limit: 0
      });

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
            var contents = $(this).html(), word;
            while (preps.exec(contents) !== null) {
               contents = contents.substr(0, preps.lastIndex) + options.space + contents.substr(preps.lastIndex + 1);
               preps.lastIndex += options.space.length - 1;
            }
            contents = contents.replace(symbols, function(content) {
               return content.replace(/\s/gi, options.space);
            });
            /*contents = contents.replace(dashes, function(content) {
               return content.replace(/\s/gi, '&#160;');
            });*/
            contents = contents.replace(/([\S]+&#160;){4,10}/gi, function(content) {
               var separator = /&#160;/g;
               var count = content.match(separator).length;
               for (var i = Math.round(count / 2); i--;) {
                  separator.exec(content);   
               }
               return content.substr(0, separator.lastIndex - options.space.length) + ' ' + content.substr(separator.lastIndex);
            });
            $(this).html(contents);
         });

         // Write the destination file.
         grunt.file.write(f.dest, $.html());

         // Print a success message.
         grunt.log.writeln('File "' + f.dest + '" created.');
      });

   });

};
