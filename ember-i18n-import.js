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
const DEFAULT_OUTPUT_DIR = 'app/locales';
const DEFAULT_OUTPUT_FILE = 'translations.js';

let translationsMap = {};
let translationKeyColumnName = DEFAULT_TRANSLATION_KEY_COLUMN;
let localeColumnNames = {};
let outputDir = DEFAULT_OUTPUT_DIR;
let outputFile = DEFAULT_OUTPUT_FILE;

program
	.version('1.0.0')
	.option('--inputFile [inputFile]', 'The csv file containing the translations.')
	.option('--outputDir [outputDir]', 'The output directory to create the locale translation files. Defaults to app/locales')
	.option('--outputFile [ouptutFile]', 'The output file generate for each locale. Defaults to translations.js')
	.option('--translationKeyColumnName [translationKeyColumnName]',
		'The column name for the translation key. Defaults to SYSTEM_KEY')
	.option('--localeColumnNames [localeColumnNames]', 'The column names for each locales. Use the locale name as the key. ' +
		'Defaults to {\\\"en\\\:\\\"EN\\\",\\\"fr\\\": \\\"FR\\\"}')
	.parse(process.argv);

if (!program.inputFile) {
	throw new Error(chalk.red('The input file must be specified.'));
}

if (program.outputDir) {
	outputDir = program.outputDir;
}

if (program.outputFile) {
	outputFile = program.outputFile;
}

if (program.translationKeyColumnName) {
	translationKeyColumnName = program.translationKeyColumnName;
}

if (program.localeColumnNames) {
	localeColumnNames = JSON.parse(program.localeColumnNames);
}

importTranslations(program.inputFile, outputDir, outputFile, translationKeyColumnName, localeColumnNames);

/**
 * Import translations
 * @param inputFile The input file
 * @param outputDir The output directory
 * @param outputFile The output file
 * @param translationKeyColumnName the translation key column name
 */
function importTranslations(inputFile, outputDir, outputFile, translationKeyColumnName, localeColumnNames) {

	console.log(chalk.blue('Importing translations using the following options:'));
	console.log();
	console.log(chalk.blue(`inputFile: ${inputFile}`));
	console.log(chalk.blue(`outputDir: ${outputDir}`));
	console.log(chalk.blue(`outputFile: ${outputFile}`));
	console.log(chalk.blue(`translationKeyColumnName: ${translationKeyColumnName}`));
	console.log(chalk.blue(`localeColumnNames: ${JSON.stringify(localeColumnNames)}`));
	console.log();

	console.log(`Importing translations from: ${inputFile}`);

	fs.createReadStream(inputFile, {
		encoding: BINARY_ENCODING
	}).pipe(csvParser())
		.on('headers', (headers) => {
			let hasTranslationKey = false;
			for (let i = 0, len = headers.length; i < len; i++) {
				if (headers[i] !== translationKeyColumnName) {
					translationsMap[getLocaleFromColumnName(headers[i], localeColumnNames)] = {};
				} else {
					hasTranslationKey = true;
				}
			}
			if (!hasTranslationKey) {
				throw new Error(chalk.red('There is no translation key column defined.'));
			}
		})
		.on('data', (data) => {
			for (let locale in translationsMap) {
				if (translationsMap.hasOwnProperty(locale)) {
					if (data[translationKeyColumnName]) {
						translationsMap[locale][data[translationKeyColumnName]] =
							data[getColumnNameFromLocale(locale, localeColumnNames)]
					}
				}
			}
		})
		.on('end', () => {
			generateTranslationFiles(translationsMap, outputDir, outputFile);
			console.log();
			console.log(chalk.green('Successfully imported translations.'));
		});

}

/**
 * Returns the locale from the column name.
 * @param columnName The column name.
 * @param localeColumnNames The map of locale column names mapping.
 */
function getLocaleFromColumnName(columnName, localeColumnNames) {
	if (localeColumnNames) {
		for (let locale in localeColumnNames) {
			if (localeColumnNames.hasOwnProperty(locale) && columnName === localeColumnNames[locale]) {
				return locale;
			}
		}
	}
	return columnName.toLowerCase();
}

/**
 * Returns the column name for a locale.
 * @param locale The locale
 * @param localeColumnNames The map of locale column names passed by the command line.
 * @returns {string}
 */
function getColumnNameFromLocale(locale, localeColumnNames) {
	let columnName = localeColumnNames[locale];
	if (!columnName) {
		columnName = locale;
	}
	return columnName.toUpperCase();
}

/**
 * Generate translation files from translation map.
 * @param translationsMap The translation map.
 * @param outputDir The output directory.
 * @param outputFile The output file.
 */
function generateTranslationFiles(translationsMap, outputDir, outputFile) {

	// check if output directory exists, if not create it.
	if (!fs.existsSync(outputDir)) {
		mkdirp(outputDir);
	}

	// loop each locale in translation map
	for (let locale in translationsMap) {
		if (translationsMap.hasOwnProperty(locale)) {

			const localeDirectoryPath = `${outputDir}/${locale}`;

			// check if output directory exists, if not create it.
			if (!fs.existsSync(localeDirectoryPath)) {
				fs.mkdirSync(localeDirectoryPath);
			}

			const localeFilePath = `${outputDir}/${locale}/${outputFile}`;

			console.log(`Generating translations file: ${outputDir}/${locale}/${outputFile}`);

			if (fs.existsSync(localeFilePath)) {
				fs.unlinkSync(localeFilePath);
			}

			fs.writeFileSync(localeFilePath, '/* eslint quotes: 0 */\n', UTF_8_ENCODING);
			fs.appendFileSync(localeFilePath, '/* eslint max-len: 0 */\n', UTF_8_ENCODING);
			fs.appendFileSync(localeFilePath, '/* eslint quote-props: 0 */\n', UTF_8_ENCODING);
			fs.appendFileSync(localeFilePath, '', UTF_8_ENCODING);

			fs.appendFileSync(localeFilePath,
				`export default ${JSON.stringify(
					unflatten(translationsMap[locale]), null, CHARACTER_SPACING)};`, UTF_8_ENCODING);
		}
	}
}



