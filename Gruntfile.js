'use strict';

module.exports = function(grunt)
{
    require('load-grunt-tasks')(grunt);
    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-mocha-istanbul');
    grunt.loadNpmTasks('grunt-contrib-clean');

    grunt.initConfig(
        {
            clean: ['coverage/'],

            eslint:
            {
                options: { maxWarnings: 0 },
                lint: ['.'],
            },

            mocha_istanbul:
            {
                coverage:
                {
                    src: 'test',
                    options:
                    {
                        reportFormats: ['html'],
                        coverageFolder: 'coverage',
                        mask: '**/*.js',
                        quiet: false,
                        clearRequireCache: true,
                        reporter: 'spec',
                    },
                },
            },
        });

    grunt.registerTask('todo', () =>
    {
        grunt.config.merge(
        {
            eslint:
            {
                options:
                {
                    rules:
                    {
                        'no-warning-comments': [1, { terms: ['todo', 'fixme', 'xxx'], location: 'anywhere' }],
                    },
                },
            },
        });
        grunt.task.run('eslint');
    });
    grunt.registerTask('lint', ['eslint']);
    grunt.registerTask('coverage', ['mocha_istanbul:coverage']);
    grunt.registerTask('test', ['lint', 'coverage']);
    grunt.registerTask('default', ['test']);
};
