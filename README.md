# grunt-sass-bootstrapper

This module create file (so-called bootstrap file) containing references to all files of type SASS/SCSS found in the project.

Also, it takes into account the dependencies that exist between them. Whether the SASS style requires a different file to work, you can use the keyword "#requires" and pass required dependency to properly prepare the output file.

Files that are already imported will be skipped. 

So for example if You have 3 files:
```
styles/main.scss
styles/partials/_variables.scss
styles/partials/_mixins.scss
```
and `_variables.scss` is being imported by `_mixins.scss`, the output file (bootstrap) will consists of:
```
@import "main"
@import "partials/mixins"
```

However if we add a `// #requires "partials/mixins"` to the `main.scss` file the order of imports will change to the:
```
@import "partials/mixins"
@import "main"
```

## Getting Started
This plugin requires Grunt `~0.4.5`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-sass-bootstrapper --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-sass-bootstrapper');
```

## The "sass_bootstrapper" task

### Overview
In your project's Gruntfile, add a section named `sass_bootstrapper` to the data object passed into `grunt.initConfig()`.

```js
grunt.initConfig({
  sass_bootstrapper: {
    options: {
      // Task-specific options go here.
    },
    your_target: {
      // Target-specific file lists and/or options go here.
    },
  },
});
```

### Options

#### options.filterRootPaths
Type: `array`
Default value: ['app/styles', 'bower_components']

Removes parts of the paths in @import values in final bootstrap file.

#### options.bootstrapFile
Type: `String`
Default value: `app/styles/bootstrap.sass`

Output file (bootstrap file) which will contains all `@imports` for collected files. Files that are already imported by SASS/SCSS will be ignored.

#### options.requireKeyword
Type: `String`
Default value: `#requires`

Module will look for this keyword in sass/scss files to create dependency. Pass the name of required file in quotes after keyword. For example: `// #requires "variables/fonts"`
Value should have same format as value of sass/scss `@import`. Place require keyword as a comment otherwise SASS compiler will throw an error.

#### options.exclude
Type: `Array`
Default value: `[]`

List of files that will be excluded from output file. You can use globbing pattern to match more than one file in path.
For example you can setup `exclude: ['app/styles/excluded/**/*.sass']` to ignore all sass files in `app/styles/excluded` folder and its sub-folders.

**Note that partials that are being imported by excluded files can be used in bootstrap file.**

#### options.useRelativePaths
Type: `bool`
Default value: `false`

By default paths to SASS/SCSS partials inside bootstrap file are relative to project root folder (without parts that are removed by `options.filterRootPaths`).
If this value is set to true, those paths will be relative to bootstrap file and `options.filterRootPaths` is not used by plugin.



### Usage Examples

#### Default Options


```js
grunt.initConfig({
  sass_bootstrapper: {
          my_task: {
            options: {
              filterRootPaths: ['app/styles', 'bower_components'],
              bootstrapFile: 'app/styles/bootstrap.sass'
            },
            files: {
              src: ['app/styles/**/*.sass', 'bower_components/**/*.scss']
            }
    },
  },
});
```


## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [Grunt](http://gruntjs.com/).


