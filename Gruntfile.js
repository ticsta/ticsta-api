module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    
    browserify: {
      standalone: {
        files: {
          'dist/ticsta.js': ['lib/browser/client.js'],
        },
        options: {
          standalone: 'Ticsta'
        }
      },
      angular: {
        files: {
          'dist/ticsta.angular.js': ['lib/browser/ticsta_angular.js'],
        },
        options: {
          ignore: ['promise', 'request']
        }
      }
    },
    
    uglify: {
      standalone: {
        src: 'dist/ticsta.js',
        dest: 'dist/ticsta.min.js'
      },
      angular: {
        src: 'dist/ticsta.angular.js',
        dest: 'dist/ticsta.angular.min.js'
      }
    },
    
    watch: {
      build: {
        files: 'lib/**/*.js',
        tasks: ['build']
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-browserify');

  grunt.registerTask('build', ['browserify', 'uglify']);
};