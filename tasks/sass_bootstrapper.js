/**
 * grunt-sass-bootstrapper
 * https://github.com/NexwayGroup/grunt-sass-bootstrapper
 *
 * Copyright (c) 2014 Nexway Lab.
 * Licensed under the MIT license.
 *
 * @author Michał Katański <mkatanski@nexway.com>
 */

var Path    = require('path'),
    Fs      = require('fs');

module.exports = function (grunt) {
    'use strict';

    var options         = null,
        PATH_SEP        = '/',
        NEW_LINE        = '\n',
        MODULE_NAME     = 'sass_bootstrapper',
        MODULE_DESC     = 'Resolves dependency for SASS files and creates bootstrap file',
        mainPartialList = {};

    /**
     * Convert file path into sass format
     *
     * @returns {string} sass formated path
     */
    String.prototype.toSassFormat = function () {
        var _dir = Path.dirname(this),
            _fileName = Path.basename(this);

        if (_fileName.indexOf('_') === 0) {
            _fileName = _fileName.replace('_', '');
        }

        return _dir + PATH_SEP + _fileName;
    };

    /**
     * Convert sass path to regular path
     *
     * @returns {string} sass formated path
     */
    String.prototype.sassToPath = function () {
        var _index = this.lastIndexOf(PATH_SEP) + 1;
        return [this.slice(0, _index), '_', this.slice(_index)].join('');
    };

    /**
     * Retrieve the root folder name from path.
     * If path is only a filename it will return '*root*' string
     * as a result.
     *
     * @returns {string} Parsed root folder
     */
    String.prototype.parseRootFolder = function () {
        var _parts = this.split(PATH_SEP);
        if (_parts.length > 1) {
            return _parts[0];
        }
        return '*root*';
    };

    /**
     * Remove given root folders from file path.
     *
     * @rootFolders {array} Root folders to remove from path
     * @returns {string} Cleared path
     */
    String.prototype.removeRootFolders = function (rootFolders) {
        var _this   = this,
            _return = '';

        rootFolders.forEach(function (rootFolder) {
            if (rootFolder.substr(-1) != PATH_SEP) {
                rootFolder += PATH_SEP;
            }
            var cleared = _this.replace(rootFolder, '');
            if (cleared !== _this) {
                _return = cleared;
            }
        });
        return _return;
    };

    /**
     * Find position of an array element when callback function
     * return true.
     *
     * @param array {array} Array to seek
     * @param callback {function} Callback function to test element
     * @returns {number} Index of eleement or -1 if not found
     */
    function findIndexInArray(array, callback) {
        var _length = array.length;
        for (var i = 0; i < _length; i++) {
            if (callback(array[i])) return i;
        }
        return -1;
    }

    /**
     * Remove item by its index and place it to another position
     *
     * @param indexToReplace {number} current item position
     * @param indexToInsert {number} index where item should be placed
     */
    function replaceInArray(array, indexToReplace, indexToInsert) {
        var _removedArray = array.splice(indexToReplace, 1);
        array.splice(indexToInsert, 0, _removedArray[0]);
        return array;
    }

    /**
     * Remove partials that are imported by another sass/scss files
     *
     * @param partials {object} copy of mainPartialList
     */
    function clearImports(partials) {
        for (var partialName in partials) {
            var _imports = partials[partialName].imports;

            for (var index in _imports) {
                var _partialToRemove = _imports[index];
                var i = 0;
                // remove file from list
                delete mainPartialList[_partialToRemove];
            } // end in imports
        }// end in files
    }

    /**
     * Get array of partial names from mainPartialList
     *
     * @returns {Array} Array of partials
     */
    function getArrayOfPartials() {
        var _partialsArr = [];
        for (var file in mainPartialList) {
            if (mainPartialList.hasOwnProperty(file)) {
                _partialsArr.push(file);
            }
        }
        return _partialsArr;
    }

    /**
     * Parses the given file for import keywords and DI keywords
     *
     * @param importKeyword {string} sass import keyword
     * @param requiresKeyword {string} dependency injection keyword
     * @param filePath {string} file to be parsed
     * @returns {Object} list of all founded import values
     */
    function parseFile(importKeyword, requiresKeyword, filePath) {
        var _lines  = grunt.file.read(filePath).split(NEW_LINE),
            _values = {
                imports: {},
                requires: {}
            };

        // Search for keywords in file
        for (var i = _lines.length - 1; i >= 0; i--) {
            var line = _lines[i];

            if (line.indexOf(importKeyword) !== -1) {
                // get import value
                var _importValue = line.match(/("|')(.*?)("|')/)[2];

                // Create full path to help looking for file and minimalize
                // errors if there are duplicated filenames
                _importValue = Path.join(Path.dirname(filePath), _importValue.sassToPath());
                // Windows support. Replace backslashes into slashes.
                _importValue = _importValue.replace(/\\/g, "/");
                // Append new import value to list
                _values.imports['import' + i] = _importValue;
            }

            if (line.indexOf(requiresKeyword) !== -1) {
                // get require value
                var _requireValue = line.match(/("|')(.*?)("|')/)[2];

                // Create new dependency object
                var _requireObject = {
                    requires: _requireValue.sassToPath(),
                    fileName: filePath
                };
                // Append new require value to list
                _values.requires['require' + i] = _requireObject;
            }
        }
        return _values;
    }

    /**
     * Reorders partials in a given list by their dependencies.
     * Dependencies are taken from mainPartialList which has to be
     * generated first.
     *
     * @param partialsArray {array} array of sass/scss partials
     * @returns {array} reordered array of partials
     */
    function orderByDependency(partialsArray) {
        var _doPass     = true,
            _reqCache   = {};
        // repeat sorting operation until
        // there is no replacing procedure during
        // one pass (bubble sorting).
        while (_doPass) {
            _doPass = false;

            // Iterate through every partial in the list and check its
            // dependency (requirements)
            partialsArray.forEach(function (partialName, partialIndex) {
                // Get require list for current partial
                var _requireList = mainPartialList[partialName].requires;

                // for each requirement in require object do...
                for (var rKey in _requireList) {

                    // Check if current key is _requireList property
                    if (!_requireList.hasOwnProperty(rKey)) {
                        // if not go to next iteration
                        continue;
                    }

                        // Current partial filename without root folder
                    var _fileName = mainPartialList[partialName].removedRoot,
                        // Index of current partial in partialsArray, -1 if not found.
                        _requireIndex = findIndexInArray(partialsArray, function (partialName) {
                            return (partialName.match(_requireList[rKey].requires) !== null);
                        }),
                        _requireObject = _requireList[rKey];

                    // Check require cache for dependency loop
                    if (_reqCache[_requireObject.requires + _fileName]) {
                        // dependency loop detected, throw an error and break program
                        grunt.fail.fatal(
                            'Dependency loop detected!!! \nFiles that have dependency loop: \n' +
                            mainPartialList[partialsArray[_requireIndex]].fileName + '\n' +
                            _requireObject.fileName
                        );
                    }

                    // If requirement is found and its position is incorrect
                    if (_requireIndex > -1 && _requireIndex > partialIndex) {
                        // Remove partial from current index and insert
                        // it before partial that requires it.
                        partialsArray = replaceInArray(partialsArray, _requireIndex, partialIndex);
                        // Replacing procedure occured so do one more pass.
                        _doPass = true;
                        // add requirement to require cache for dependency loop handling
                        _reqCache[_fileName + _requireObject.requires] = true;

                    } else if (_requireIndex === -1) {
                        // invalid requirement, throw a warning
                        grunt.log.warn(
                            'File: ' + mainPartialList[partialName].fileName +
                            ' is depending on non existing partial "' +
                            _requireObject.requires + '"'
                        );
                    }

                } // end for
            }); // end for each

        } // end while
        // Return reordered file list
        return partialsArray;
    }

    /**
     * Generate content for bootstrap file
     *
     * @param partialsArray {array} list of partials to import by bootstrap file
     * @param lineDelimiter {string} symbol at the end of the line
     * @returns {string} formatted file content
     */
    function generateBootstrapContent(partialsArray, lineDelimiter) {
        var _bootstrapContent   = '',
            _folderGroup        = '';

        partialsArray.forEach(function (partialName) {
            var _sassPath = mainPartialList[partialName].removedRoot,
                _currentRoot = _sassPath.parseRootFolder();

            if (options.useRelativePaths) {
                // if useRelativePaths option is set to true the result file will use paths relative to bootstrap file
                // in this case filterRootPaths option is not used
                _sassPath = Path.relative(Path.dirname(options.bootstrapFile),
                                            mainPartialList[partialName].fileName.toSassFormat());
                // remove file extension
                _sassPath = _sassPath.replace(Path.extname(_sassPath), '');
                // Windows support. Replace backslashes into slashes.
                _sassPath = _sassPath.replace(/\\/g, "/");
            } else {
                _sassPath = _sassPath.toSassFormat();
            }

            // if current root folder has changed, write new root folder
            // as a comment and set new current folder
            if (_folderGroup != _currentRoot) {
                _bootstrapContent += NEW_LINE + '// ' + _currentRoot + NEW_LINE;
                _folderGroup = _currentRoot;
            }
            // append import line
            _bootstrapContent += options.importKeyword + ' "' + _sassPath + '"' + lineDelimiter + NEW_LINE;
        });

        return _bootstrapContent;
    }

    /**
     * Grunt task main function
     */
    grunt.registerMultiTask(MODULE_NAME, MODULE_DESC, function () {

        // Merge task-specific and/or target-specific options with these defaults.
        options = this.options({
            filterRootPaths:    ['app/styles/', 'bower_components/'],
            bootstrapFile:      'app/styles/bootstrap.sass',
            requireKeyword:     '#requires',
            useRelativePaths:   false,
            exclude:            []
        });

        var _lineDelimiter      =   ';',
            _bootstrapContent   =   '// This file has been generated by grunt-sass-bootstrapper. \n' +
                                    '// A SASS/SCSS Dependency resolver module.\n\n' +
                                    '// Please do not edit this file!\n',
            _cachedPartialList  =   {},
            _parsingCount       =   0;

        options.importKeyword   =   '@import';
        options.cacheFile       =   '.cache/' + MODULE_NAME + '/cache.json';

        if (options.importKeyword === options.requireKeyword) {
            grunt.fail.fatal('Using "@import" as requireKeyword name is depracated');
        }

        // If output file is sass, clear line delimiter.
        if (Path.extname(options.bootstrapFile) === '.sass') {
            _lineDelimiter = '';
        }

        // Try to read cache file
        if (grunt.file.exists(options.cacheFile)) {
            _cachedPartialList = grunt.file.readJSON(options.cacheFile);
        }

        if (grunt.file.exists(options.bootstrapFile)) {
            grunt.file.delete(options.bootstrapFile);
            grunt.log.writeln('File "' + options.bootstrapFile + '" deleted.');
        }

        // Expand list of excluded files
        options.exclude = grunt.file.expand(options.exclude);

        // Iterate over all specified file groups.
        this.files.forEach(function (fGroup) {

            // Insert all files into array.
            fGroup.src.filter(function (filePath) {
                // Warn on and remove invalid source files (if nonull was set).
                if (!grunt.file.exists(filePath)) {
                    grunt.log.warn('Source file "' + filePath + '" not found.');
                    return false;
                } else {
                    var _noExtension    = filePath.replace(Path.extname(filePath), ''),
                        _cachedPartial  = _cachedPartialList[_noExtension],
                        _doParse        = true,
                        _partialObject  = {
                            lastModified:   new Date(Fs.lstatSync(filePath).mtime).getTime(),
                            fileName:       filePath,
                            imports:        {},
                            requires:       {}
                        };

                    // check if cached data for current file exists
                    if (typeof _cachedPartial !== 'undefined') {
                        // current file is cached
                        // compare last modification date
                        if (_cachedPartial.lastModified === _partialObject.lastModified) {
                            // file hasn't been modified since last build
                            // load file data from cache
                            _partialObject.imports      = _cachedPartial.imports;
                            _partialObject.requires     = _cachedPartial.requires;
                            _partialObject.removedRoot  = _cachedPartial.removedRoot;
                            // disable parsing for current file
                            _doParse = false;
                        }
                    }

                    if (_doParse) {
                        // Parse file
                        var _parsedData = parseFile(options.importKeyword, options.requireKeyword, filePath);
                        // collect imports and requirements
                        _partialObject.imports = _parsedData.imports;
                        _partialObject.requires = _parsedData.requires;
                        _parsingCount++;
                        // Remove root paths
                        _partialObject.removedRoot = _noExtension.removeRootFolders(options.filterRootPaths);
                    }

                    // Append new element to main partials list if its not listed in exclude array
                    if (options.exclude.indexOf(_partialObject.fileName) === -1) {
                        mainPartialList[_noExtension] = _partialObject;
                    }

                    return true;
                }
            });

        });

        if (_parsingCount !== 0) {
            grunt.file.write(options.cacheFile, JSON.stringify(mainPartialList, null, 4));
        }

        clearImports(JSON.parse(JSON.stringify(mainPartialList)));
        var _orderedPartialsArray = orderByDependency(getArrayOfPartials());

        _bootstrapContent += generateBootstrapContent(_orderedPartialsArray, _lineDelimiter);

        // Write the destination file.
        grunt.file.write(options.bootstrapFile, _bootstrapContent);

        // Print a success message.
        grunt.log.writeln('File "' + options.bootstrapFile + '" created.');

    });
};
