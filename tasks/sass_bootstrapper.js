/*
 * grunt-sass-bootstrapper
 * https://github.com/NexwayGroup/grunt-sass-bootstrapper
 *
 * Copyright (c) 2014 Nexway Lab.
 * Licensed under the MIT license.
 *
 * @author Michał Katański <mkatanski@nexway.com>
 */

'use strict';

var nodePath = require('path');

module.exports = function(grunt) {

    var DIList  = [];
    var options = null;

    /*
     * Returns sass or scss file path without its extension
     * and without first occurence of underscore character ('_')
     * in filename.
     *
     * @path string path to be cleaned
     */
    function cleanFilePath(path) {
        var elements = path.split("/");

        if (elements[elements.length - 1].indexOf('_') == 0) {
            elements[elements.length - 1] = elements[elements.length - 1].replace('_', '');
        }
        elements[elements.length - 1] = elements[elements.length - 1].replace('.sass', '');
        elements[elements.length - 1] = elements[elements.length - 1].replace('.scss', '');

        return elements.join("/");
    }

    /*
     * Parses the given file for import keywords and DI keywords
     * if the DI keyword is found it pushes it to the global array.
     * Import values are returned as an array.
     *
     * @importKeyword string sass import keyword
     * @requiresKeyword string dependency injection keyword
     * @file string file to be parsed
     */
    function getKeywordsValues(importKeyword, requiresKeyword, file) {
        var values = [];
        var lines = grunt.file.read(file).split("\n");

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
                var DIObject = {
                    requires: line.match(/"(.*?)"/)[1],
                    fileName: file
                };

                // check if DI object exists. If not add new one
                if (searchObjectInDI(DIObject) == -1) {
                    DIList.push(DIObject);
                }
            }
        }

        return values;
    }

    /*
     * Retrieve the root folder name from its path.
     * If path is only a filename it will return '*root*' string
     * as a result.
     *
     * @path string path to get its root folder
     */
    function getRootFolder(path) {
        var parts = path.split("/");
        if (parts.length > 1) {
            return parts[0];
        }
        return '*root*';
    }

    /*
     * Removes array of string items which contains
     * the given string.
     *
     * @fileList array an array to be cleaned
     * @cleanPath string path to find. must be cleaned first
     */
    function removeArrayItemByPath(fileList, cleanPath) {
        var i = -1;
        var seek = true;

        while (seek) {
            i++;

            if (cleanFilePath(fileList[i]).indexOf(cleanPath) != -1) {
               fileList.splice(i, 1);
            }

            if (i >= fileList.length - 1) {
                seek = false;
            }
        }

        return fileList;
    }

    /*
     * Method which parses all the files.
     * It cleans list from files which are already
     * being imported and stores DI list into global array (DIList).
     *
     * @fileList array list of files to be parsed
     */
    function parseFiles(fileList) {
        var pass = true;

        while (pass) {
            pass = false;

            for (var index = 0; index < fileList.length; index++) {
                // get import values from file as an array and add DI values to the DIList array.
                var kValues = getKeywordsValues(options.importKeyword, options.requireKeyword, fileList[index]);
                var curLength = fileList.length;

                for (var i = kValues.length - 1; i >= 0; i--) {
                    fileList = removeArrayItemByPath(fileList, kValues[i]);
                    // Check if size of an array has changed
                    if (curLength > fileList.length) {
                        pass = true;
                    }
                }
            }
        }

        return fileList;
    }

    /*
     * Returns array of all dependencies for a given file.
     * If there is no DI for a given file, returns empty array.
     *
     * @fileName string file name for which DIs must be returned
     */
    function getDIByFilename(fileName) {
        var returnArray = [];
        var length = DIList.length;

        for (var i = 0; i < length; i++) {
            if (DIList[i]['fileName'] == fileName) {
                returnArray.push(DIList[i]['requires']);
            }
        }

        return returnArray;
    }

    /*
     * Search for specific DI Object in DI List.
     * Method returns index position when DI object
     * exists in array or '-1' when its not found.
     *
     * @DIObject object DI object to find
     */
    function searchObjectInDI(DIObject) {
        for (var i = DIList.length - 1; i >= 0; i--) {
            if (DIList[i].requires == DIObject.requires &&
                DIList[i].fileName == DIObject.fileName)
                return i;
        }

        return -1;
    }

    /*
     * Search for path in list. Path should be clean.
     * Use cleanFilePath method to clean path.
     *
     * @cleanPath string clean path
     * @list array list of files
     */
    function searchInList(cleanPath, list) {
        for (var i = list.length - 1; i >= 0; i--) {
            if (cleanFilePath(list[i]).indexOf(cleanPath) > -1) {
                return i;
            }
        }
        return -1;
    }

    /*
     * Get item in array by its index and move it before
     * another item.
     *
     * @fileList array list of files
     * @indexToReplace int index of item to be moved
     * @indexToInsert int index where item should be placed
     */
    function replaceInArray(fileList, indexToReplace, indexToInsert) {
        var removedArr = fileList.splice(indexToReplace, 1);
        fileList.splice(indexToInsert, 0, removedArr[0]);

        return fileList;
    }

    /*
     * Reorders files in a given list by their dependencies.
     * Dependencies are taken from DIList which has to be
     * generated first.
     *
     * @fileList array list of files to be reordered
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
            for (var i = fileList.length - 1; i >= 0; i--) {
                // Get all dependencies for current file
                var DIs = getDIByFilename(fileList[i]);

                if (DIs.length > 0) {
                    // for each file that is required by current file
                    for (var DIIndex = 0; DIIndex < DIs.length; DIIndex++) {
                        var requires = DIs[DIIndex];
                        // Index of file that is required by current file
                        var reqFileindex = searchInList(requires, fileList);

                        if (reqFileindex < i) {
                            // Remove file from current index and insert
                            // it before file that requires this file.
                            fileList = replaceInArray(fileList, reqFileindex, i);
                            // Replacing procedure occured so do one more pass.
                            doPass = true;
                        }
                    }
                }
            }
        }

        // Return reordered file list
        return fileList;
    }

    grunt.registerMultiTask('sass_bootstrapper', 'Resolves dependency for SASS files and creates bootstrap file', function() {
        // Merge task-specific and/or target-specific options with these defaults.
        options = this.options({
            filterRootPaths: ['app/styles/', 'bower_components/'],
            bootstrapFile: 'app/styles/bootstrap.sass',
            importKeyword: '@import',
            requireKeyword: '#requires'
        });

        // Iterate over all specified file groups.
        this.files.forEach(function(f) {

            if (grunt.file.exists(options.bootstrapFile)) {
                grunt.file.delete(options.bootstrapFile);
                grunt.log.writeln('File "' + options.bootstrapFile + '" deleted.');
            }

            var fileList = [];

            // Concat specified files.
            f.src.filter(function(filepath) {
                // Warn on and remove invalid source files (if nonull was set).
                if (!grunt.file.exists(filepath)) {
                    grunt.log.warn('Source file "' + filepath + '" not found.');
                    return false;
                } else {
                    return true;
                }
            }).map(function(filepath) {
                // Read file source.
                fileList.unshift(filepath);
                return true;
            });

            // Parse imports and DIs and order file by their dependency
            fileList = orderByDependency(parseFiles(fileList));

            var bootstrapContent = '// This file has been generated by grunt-sass-bootstrapper. \n// A SASS/SCSS Dependency resolver module.\n';
            var folderGroup = '';

            for (var i = fileList.length - 1; i >= 0; i--) {
                var filePath = fileList[i];

                // remove root paths
                for (var rpIndex = 0; rpIndex < options.filterRootPaths.length; rpIndex++) {
                    var normalizedPath = nodePath.normalize(options.filterRootPaths[rpIndex]);
                    if(normalizedPath.substr(-1) != '/') {
                        normalizedPath += '/';
                    }
                    filePath = filePath.replace(normalizedPath, '');
                }
                // clean path
                filePath = cleanFilePath(filePath);

                var curRoot = getRootFolder(filePath);

                if (folderGroup != curRoot) {
                    bootstrapContent += '\n' + '// ' + curRoot + '\n';
                    folderGroup = curRoot;
                }

                bootstrapContent += options.importKeyword + ' "' + filePath + '"\n';
            };

            // Write the destination file.
            grunt.file.write(options.bootstrapFile, bootstrapContent);

            // Print a success message.
            grunt.log.writeln('File "' + options.bootstrapFile + '" created.');
        });
    });

};
