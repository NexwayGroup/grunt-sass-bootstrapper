# grunt-sass-bootstrapper

> Resolves dependency for SASS files and creates bootstrap file

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

## The "sassdepress" task

### Overview
In your project's Gruntfile, add a section named `sassdepress` to the data object passed into `grunt.initConfig()`.

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

Remove paths from importing values in final bootstrap file.

#### options.bootstrapFile
Type: `String`
Default value: `app/styles/bootstrap.sass`

Ouput file (bootstrap file)

#### options.requireKeyword
Type: `String`
Default value: `#requires`

Look for this keyword in sass/scss files to create dependency. Pass name of dependent file in quotes after keyword. For example: // #requires "variables/fonts"
Value should have same format as value of sass/scss @import. Place require keyword within comment.

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

## Release History
_(Nothing yet)_
