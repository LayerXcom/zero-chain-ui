# Zerochain UI
This repository is a monorepo for Zerochain UI.
Zerochain is a privacy oriented blockchain on substarte.

See here:
https://github.com/LayerXcom/zero-chain

<div align="center">
<img src="https://user-images.githubusercontent.com/20852667/54670894-04113880-4b38-11e9-9c75-13ad5b1b0ff5.png" width="1000px">
</div>


## Setup
- To install using brew:
```
brew install yarn
```
- Then install dependencies
```
yarn install
```
- Run the app
```
yarn run dev
```
- Open the app in your browser(**only supported for Firefox**) at http://localhost:8000
```
open -a "Firefox" http://localhost:8000
```

## Usage
You can send a confidential transaction to the zerochain and update the encrypted balance. For now, the proccess of generating transaction needs to be executed by CLI (including the zero knowledge proving and encryption). Fill out the UI form based on the CLI printout.


