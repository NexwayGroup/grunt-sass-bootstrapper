/**
 * grunt-sass-bootstrapper
 * https://github.com/NexwayGroup/grunt-sass-bootstrapper
 *
 * Copyright (c) 2014 Nexway Lab.
 * Licensed under the MIT license.
 *
 * @author Michał Katański <mkatanski@nexway.com>
 */

'use strict';

var Path = require('path');

module.exports = function(grunt) {

    var diList          = [],
        options         = null,
        pathSeparator   = '/',
        newLineSymbol   = grunt.util.linefeed;

    /**
     * Remove item by its index and place it to another position
     *
     * @param indexToReplace {number} current item position
     * @param indexToInsert {number} index where item should be placed
     */
    Array.prototype.replace = function(indexToReplace, indexToInsert) {
        var removedArray = this.splice(indexToReplace, 1);
        this.splice(indexToInsert, 0, removedArray[0]);
    }

    /**
     * Retrieve the root folder name from path.
     * If path is only a filename it will return '*root*' string
     * as a result.
     *
     * @returns {string} Parsed root folder
     */
    String.prototype.parseRootFolder = function() {
        var parts = this.split(pathSeparator);
        if (parts.length > 1) {
            return parts[0];
        }
        return '*root*';
    }

    /**
     * Convert file path into sass format
     *
     * @returns {string} sass formated path
     */
    String.prototype.toSassFormat = function() {
        var elements  = this.split(pathSeparator),
            fileIndex = elements.length - 1,
            fileName  = elements[fileIndex],
            extension = Path.extname(fileName);

        if (fileName.indexOf('_') === 0) {
            fileName = fileName.replace('_', '');
        }

        elements[fileIndex] = fileName.replace(extension, '');
        return elements.join(pathSeparator);
    }

    /**
     * Parses the given file for import keywords and DI keywords
     * if the DI keyword is found it pushes it to the global array (diList).
     * Import values are returned as an array.
     *
     * @param importKeyword {string} sass import keyword
     * @param requiresKeyword {string} dependency injection keyword
     * @param filePath {string} file to be parsed
     * @returns {Array} list of all founded import values
     */
    function getKeywordsValues(importKeyword, requiresKeyword, filePath) {
        var values  = [],
            lines   = grunt.file.read(filePath).split(newLineSymbol);

        // Search for keywords
        for (var i = lines.length - 1; i >= 0; i--) {
            var line = lines[i];

            if (line.indexOf(importKeyword) > -1) {
                // importKeyword found. Push its value to the values array
                values.push(line.match(/"(.*?)"/)[1]);
            }

            if (line.indexOf(requiresKeyword) > -1) {
                // requiresKeyword found !!
                // push it to global array. This way it will not be
                // required to parse the same file twice to look for 
                // DI keywords.

                // Create new dependency object
                var diObject = {
                    requires: line.match(/"(.*?)"/)[1],
                    fileName: filePath
                };

                // search for require loop
                // it happens when two files requires each other
                var loopFiles = findRequireLoop(diObject);
                if (loopFiles !== null) {
                    // throw a fatal error
                    grunt.fail.fatal('Require loop detected!!! \n' +
                                     'Files that have require loop: \n' +
                                     loopFiles.currentFile + '\n' +
                                     loopFiles.foundedFile);
                }

                // check if DI object exists. If not add new one
                if (searchObjectInDI(diObject) === -1) {
                    diList.push(diObject);
                }
            }
        }

        return values;
    }

    /**
     * Check if require loop exists for given diObject. If loop is found
     * return files that cause a problem as an object.
     *
     * @param diObject {object} Dependency Injection object
     * @returns {object} array with files that requires each other or null
     */
    function findRequireLoop(diObject) {
        var curFileName = diObject.fileName.toSassFormat(),
            curRequires = diObject.requires;

        for (var dIndex = diList.length - 1; dIndex >= 0; dIndex--) {
            var diFileName = diList[dIndex].fileName.toSassFormat(),
                diRequires = diList[dIndex].requires;

            if (diFileName.match(curRequires) !== null &&
                curFileName.match(diRequires) !== null) {
                return {
                    currentFile: diObject.fileName,
                    foundedFile: diList[dIndex].fileName
                };
            }
        }
        return null;
    }

    /**
     * Search for given path formatted as sass path in files list
     * and removes it form list if found
     *
     * @param fileList {array} list of paths to be search in
     * @param sassPath {string} sass path to search for
     * @returns {array} list of paths
     */
    function removeArrayItemByPath(fileList, sassPath) {
        var index = -1,
            seek  = true;

        while (seek) {
            index++;

            if (fileList[index].toSassFormat().match(sassPath) !== null) {
               fileList.splice(index, 1);
            }

            if (index >= fileList.length - 1) {
                seek = false;
            }
        }

        return fileList;
    }

    /**
     * Returns array of all dependencies for a given file.
     * If there is no DI for a given file, returns empty array.
     *
     * @param fileName {string} file name for which DIs must be returned
     * @returns {Array} list of all dependencies for a file
     */
    function getDIByFilename(fileName) {
        var returnArray     = [],
            length          = diList.length;

        for (var i = 0; i < length; i++) {
            if (diList[i]['fileName'] === fileName) {
                returnArray.push(diList[i]['requires']);
            }
        }
        return returnArray;
    }

    /**
     * Search for specific DI Object in DI List.
     * Method returns index position when DI object
     * exists in array or '-1' when its not found.
     *
     * @param DIObject {object} DI object to find
     * @returns {number} index of DI object in diList, -1 if not found
     */
    function searchObjectInDI(DIObject) {
        for (var i = diList.length - 1; i >= 0; i--) {
            if (diList[i].requires === DIObject.requires &&
                diList[i].fileName === DIObject.fileName)
                return i;
        }
        return -1;
    }

    /**
     * Search for path in list. Path should be sass formated.
     * Use toSassFormat prototyped method to format path.
     *
     * @param sassPath {string} sass formated path
     * @param fileList {array} list of files
     * @returns {number} index of file in given file list, -1 if not found
     */
    function searchInList(sassPath, fileList) {
        for (var i = fileList.length - 1; i >= 0; i--) {
            //grunt.log.writeln(fileList[i].toSassFormat().match(sassPath));
            if (fileList[i].toSassFormat().match(sassPath) !== null) {
                return i;
            }
        }
        return -1;
    }

    /**
     * Parses all the files in given file list.
     * It cleans file list from files which are already
     * being imported and stores DI list into global array (diList).
     *
     * @param fileList {array} list of files to be parsed
     * @returns {array} parsed file list
     */
    function parseFiles(fileList) {
        var doPass = true;

        while (doPass) {
            doPass = false;

            for (var fIndex = 0; fIndex < fileList.length; fIndex++) {
                // get import values from file as an array and add DI
                // values to the diList array.
                var curLength   = fileList.length,
                    kValues     = getKeywordsValues(options.importKeyword,
                                                    options.requireKeyword,
                                                    fileList[fIndex]);

                for (var kIndex = kValues.length - 1; kIndex >= 0; kIndex--) {
                    fileList = removeArrayItemByPath(fileList, kValues[kIndex]);
                    // Check if size of an array has changed
                    if (curLength > fileList.length) {
                        doPass = true;
                    }
                }

            } // end for
        } // end while

        return fileList;
    }

    /**
     * Reorders files in a given list by their dependencies.
     * Dependencies are taken from diList which has to be
     * generated first.
     *
     * @param fileList {array} list of files
     * @returns {array} list of files
     */
    function orderByDependency(fileList) {
        var doPass = true;

        // repeat sorting operation untill
        // there is no replacing procedure during
        // one pass (bubble sorting).
        while (doPass) {
            doPass = false;

            // Iterate through every file in the list and check its
            // dependency (requirements)
            for (var fIndex = fileList.length - 1; fIndex >= 0; fIndex--) {
                // Get all dependencies for current file
                var dependencies = getDIByFilename(fileList[fIndex]);

                if (dependencies.length > 0) {

                    // for each file that is required by current file
                    for (var diIndex = 0; diIndex < dependencies.length; diIndex++) {
                        var requires        = dependencies[diIndex],
                            reqFileindex    = searchInList(requires, fileList);

                        if (reqFileindex > -1 && reqFileindex < fIndex) {
                            // Remove file from current index and insert
                            // it before file that requires this file.
                            fileList.replace(reqFileindex, fIndex);
                            // Replacing procedure occured so do one more pass.
                            doPass = true;
                        }

                    } // end for

                } // end if
            } // end for
        } // end while

        // Return reordered file list
        return fileList;
    }

    /**
     * Generate content for bootstrap file
     *
     * @param fileList {array} list of files to import by bootstrap file
     * @param lineDelimiter {string} symbol at the end of the line
     * @returns {string} formatted file content
     */
    function generateBootstrapContent(fileList, lineDelimiter) {
        var bootstrapContent    = '',
            folderGroup         = '';

        for (var fIndex = fileList.length - 1; fIndex >= 0; fIndex--) {
            var filePath = fileList[fIndex];

            // remove root paths
            for (var rpIndex = 0; rpIndex < options.filterRootPaths.length; rpIndex++) {
                var rootPath = options.filterRootPaths[rpIndex];
                // check if path ends by path separator. If not append path separator to path.
                if(rootPath.substr(-1) != pathSeparator) {
                    rootPath += pathSeparator;
                }
                filePath = filePath.replace(rootPath, '');
            }

            // convert file path to sass format
            filePath        = filePath.toSassFormat();
            var currentRoot = filePath.parseRootFolder();

            // if current root folder has changed, write new root folder
            // as a comment and set new current folder
            if (folderGroup != currentRoot) {
                bootstrapContent   += newLineSymbol + '// ' + currentRoot + newLineSymbol;
                folderGroup         = currentRoot;
            }

            // append import line
            bootstrapContent += options.importKeyword + ' "' + filePath + '"' + lineDelimiter + newLineSymbol;
        }

        return bootstrapContent;
    }

    grunt.registerMultiTask('sass_bootstrapper', 'Resolves dependency for SASS files and creates bootstrap file', function() {
        // Merge task-specific and/or target-specific options with these defaults.
        options = this.options({
            filterRootPaths:    ['app/styles/', 'bower_components/'],
            bootstrapFile:      'app/styles/bootstrap.sass',
            requireKeyword:     '#requires'
        });

        var fileList            = [],
            lineDelimiter       = ';',
            bootstrapContent    = '// This file has been generated by grunt-sass-bootstrapper. \n' +
                                  '// A SASS/SCSS Dependency resolver module.\n';

        options.importKeyword = '@import';

        if (options.importKeyword === options.requireKeyword) {
            grunt.fail.fatal('Using "@import" as requireKeyword name is depracated');
        }

        // If output file is sass, clear line delimiter.
        if (Path.extname(options.bootstrapFile) === '.sass') {
            lineDelimiter = '';
        }

        // Iterate over all specified file groups.
        this.files.forEach(function(f) {

            if (grunt.file.exists(options.bootstrapFile)) {
                grunt.file.delete(options.bootstrapFile);
                grunt.log.writeln('File "' + options.bootstrapFile + '" deleted.');
            }

            // Insert all files into array.
            f.src.filter(function(filePath) {
                // Warn on and remove invalid source files (if nonull was set).
                if (!grunt.file.exists(filePath)) {
                    grunt.log.warn('Source file "' + filePath + '" not found.');
                    return false;
                } else {
                    return true;
                }
            }).map(function(filePath) {
                // Add file path to the list.
                fileList.unshift(filePath);
                return true;
            });

            // Parse imports and DIs and order file by their dependency
            fileList = orderByDependency(parseFiles(fileList));

            bootstrapContent += generateBootstrapContent(fileList, lineDelimiter);

            // Write the destination file.
            grunt.file.write(options.bootstrapFile, bootstrapContent);

            // Print a success message.
            grunt.log.writeln('File "' + options.bootstrapFile + '" created.');
        });
    });

};
