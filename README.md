# svg-to-flutter-path-converter

Convert your SVG file directly to Flutter paths and prevent all the messing with bezier curves.

![https://www.flutterclutter.dev/images/tools/svg-to-flutter-path-converter.png](https://www.flutterclutter.dev/images/tools/svg-to-flutter-path-converter.png)

# Flutter Clutter

The tool was made in the context of [my blog](https://www.flutterclutter.dev).   
Find a demo [here](https://www.flutterclutter.dev/tools/svg-to-flutter-path-converter/).  
Also, a _how to_ can be found [here](https://www.flutterclutter.dev/flutter/tutorials/svg-to-flutter-path/2020/678/).


# CLI Tool

To use tool as a CLI:
- clone this repository
- in cloned directory use 
```
npm install
npm i -g
```
- you are good to go `Usage: svg-to-flutter [options] [command]`
```
Commands:
  convert <filePath>  Convert svg file to Flutter path
  help [command]      display help for command
```
- save result to a file using `>` operator (eg: `svg-to-flutter convert ~/path.svg > path.dart`)

- npm integration comming soon!
