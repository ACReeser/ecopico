ecopico
=======

A teeny tiny evolutionary genetic simulator

##Setup
ecopico is written in Typescript. Index.html uses the Javascript that is output by a Typescript transpiler.
###Windows

####VS
Visual Studio has a Typescript compiler plugin

####CLI

```
npm install typescript

node node_modules/typescript/bin/tsc.js ecopico.ts -target es6
```

###Unix

```
npm install typescript

node built/local/tsc.js ecopico.ts -target es6
```

##Documentation
ecopico uses citare-scriptum to generate docs

```
npm install citare-scriptum
```

install it locally so you can change .\node_modules\citare-scriptum\lib\languages.coffee . Add this block:

```
Typescript:

    nameMatchers: ['.ts']

    lexer: 'actionscript'

    singleLineComment: ['//']
```

then, when you've made a change, run

```    
citare
```

this will use .citare.json to generate the docs
then use

```
citare --github
```

to push the changes to the github pages branch

if you're running Windows, you may need to use Git Bash to run the script manually instead of using the --github flag
