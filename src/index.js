#! /usr/bin/env node

const { program } = require('commander')
const convert = require('./convert')

program
    .command('convert <svgFilePath>')
    .description('Convert svg file to Flutter path')
    .action(convert)

program.parse()
