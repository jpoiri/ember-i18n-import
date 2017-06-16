#!/usr/bin/env node
'use strict';
let program = require('commander');
let fs = require('fs');
let unflatten = require('flat').unflatten;
let chalk = require('chalk');
let csvParser = require('csv-parser');
let mkdirp = require('node-mkdirp');

const BINARY_ENCODING = 'binary';
const UTF_8_ENCODING = 'utf-8';
const CHARACTER_SPACING = 4;
const DEFAULT_TRANSLATION_KEY_COLUMN = 'SYSTEM_KEY';
const DEFAULT_OUTPUT_DIR = 'app/locale';
const DEFAULT_OUTPUT_FILE = 'translations.js';

let translationsMap = {};
let translationKeyColumnName = DEFAULT_TRANSLATION_KEY_COLUMN;
let localeColumnNames = {};
let outputDir = DEFAULT_OUTPUT_DIR;
let outputFile = DEFAULT_OUTPUT_FILE;

program
	.version('1.0.0')
	.option('--inputFile [inputFile]')
	.option('--outputDir [outputDir]','The output directory to create the locale translation files. Defaults to app/locales')
	.option('--outputFile [ouptutFile]', 'The output file generate for each locale. Defaults to translations.js')
	.option('--translationKeyColumnName [translationKeyColumnName]',
		'The column name for the translation key. Defaults to SYSTEM_KEY')
	.option('--localeColumnNames [localeColumnNames]', 'The column names for each locales. Use the locale name as the key. ' +
		'Defaults to {\\\"en\\\:\\\"EN\\\",\\\"fr\\\": \\\"FR\\\"}')
	.parse(process.argv);

if (!program.inputFile) {
	throw new Error(chalk.red('The input file must be specified.'));
}

if (!program.outputDir) {
	outputDir = program.outputDir;
}

if (!program.outputFile) {
	outputFile = program.outputFile;
}

if (!program.translationKeyColumnName) {
	translationKeyColumnName = program.translationKeyColumnName;
}

if (!program.localeColumnNames) {
	localeColumnNames = program.localeColumnNames;
}

importTranslations(program.inputFile, outputDir, outputFile, translationKeyColumnName, localeColumnNames);

function importTranslations(inputFile, outputDir, outputFile, translationKeyColumnName, localeColumnNames) {

	console.log(translationKeyColumnName);

	fs.createReadStream(inputFile, {
		encoding: BINARY_ENCODING
	}).pipe(csvParser())
		.on('headers', function (headers) {
			for (let i = 0, len = headers.length; i < len; i++) {
				if (headers[i] !== 'SYSTEM_KEY') {
					translationsMap[headers[i].toLowerCase()] = {};
				}
			}
			//console.log(translationsMap);
		})
		.on('data', function (data) {
			for (let locale in translationsMap) {
				if (translationsMap.hasOwnProperty(locale)) {
					if (data[translationKeyColumnName]) {
						translationsMap[locale][data[translationKeyColumnName]] = data[locale.toUpperCase()]
					}
				}
			}
		})
		.on('end', function () {

			// check if output directory exists, if not create it.
			if (!fs.existsSync(outputDir)) {
				mkdirp(outputDir);
			}

			for (let locale in translationsMap) {
				if (translationsMap.hasOwnProperty(locale)) {

					const localeDirectoryPath = `${outputDir}/${locale}`;

					// check if output directory exists, if not create it.
					if (!fs.existsSync(localeDirectoryPath)) {
						fs.mkdirSync(localeDirectoryPath);
					}

					const localeFilePath = `${outputDir}${locale}/${outputFile}`;

					if (fs.existsSync(localeFilePath)) {
						fs.unlinkSync(localeFilePath);
					}

					fs.writeFileSync(localeFilePath,
						'export default ' + JSON.stringify(
							unflatten(translationsMap[locale]), null, CHARACTER_SPACING), UTF_8_ENCODING);
				}
			}
		});

}



