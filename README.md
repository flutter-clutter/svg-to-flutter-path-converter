# svg-to-flutter-path-converter

Convert your SVG file directly to Flutter paths and prevent all the messing with bezier curves.

![https://www.flutterclutter.dev/images/tools/svg-to-flutter-path-converter.png](https://www.flutterclutter.dev/images/tools/svg-to-flutter-path-converter.png)

# Flutter Clutter

The tool was made in the context of [my blog](https://www.flutterclutter.dev).   
Find a demo [here](https://www.flutterclutter.dev/tools/svg-to-flutter-path-converter/).  
Also, a _how to_ can be found [here](https://www.flutterclutter.dev/flutter/tutorials/svg-to-flutter-path/2020/678/).

# Usage as CLI Tool

To use this tool via CLI:  

* Clone this repository
* `cd` into cloned directory

## Use locally

If you want to install it locally to prevent pollution of your global node namespace, do this:

```
npm i
```

Then you can run the conversion using 

```
npm start convert <svgFilePath>
```

## Use globally

If you want use it outside of the repository directory as well, use this:

```
npm i -g
```

The syntax to call the conversion via CLI is as follows:

```
svg-to-flutter convert <svgFilePath>
```

The general usage looks like this:

```
Usage: svg-to-flutter [options] [command]

Commands:
  convert <filePath>  Convert svg file to Flutter path
  help [command]      display help for command
```

## Store the result on the file system

In order to store the result on the file system, use the redirection operator (`>`):

```
svg-to-flutter convert input.svg > output.dart
```

# Collaborators

* [Wojciech Warwas](https://github.com/obiwanzenobi) - Thankfully converted the JS+HTML tool into a separate node module

`npm` integration coming soon!