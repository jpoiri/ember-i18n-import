# ember-i18n-import
This package imports [ember-i18n](https://github.com/jamesarosen/ember-i18n) translations into an ember project from a csv file. It is meant to be used along with [ember-i18n-export](https://github.com/jpoiri/ember-i18n-export) package as way to import back translations back into your project once they are translated.

## Installing
```code
npm install ember-i18n-import
```    
    
## Usage
Run the following command from the root of your ember project: 
```code
ember-i18n-import --inputFile translations.csv <options>
```

## Options

### inputFile
The csv file containing the translations.
```code
ember-i18n-import --inputFile translations.csv
```

### outputDir
By default the translation files are generated in the <b>app/locales</b> directory, you can override this by using the <code>outputDir</code> option:

```code
ember-i18n-import --inputFile translations.csv --outputDir app/translations
```

### outputFile
By default the translation file generated for each locale is <b>translations.js</b> , you can override this by using the <code>outputFile</code> option:

```code
ember-i18n-import --inputFile translations.csv --outputFile trans.js
```

### translationKeyColumnName

By default the translation key is taken from the <b>SYSTEM_KEY</b> column in the csv file, you can override this by using the <code>translationKeyColumnName</code>:

```code
ember-i18n-import --inputFile translations.csv --translationKeyColumnName TRANSLATION_KEY
```

### localeColumnNames

By default each locale values is taken from the matching capitalize locale column in the csv file, you can override this by using the <code>localeColumnNames</code> option:

```code
ember-i18n-import --inputFile translations.csv --localeColumnNames {\"en\":\"English\",\"fr\":\"French\"}
```
### excludedLocales

By default all locales are imported, you can override this by passing comma delimited string of locales to exclude.
```code
ember-i18n-import --inputFile translations.csv --excludedLocales en,fr
```
