import express from 'express';
express.static.mime.define({ 'application/wasm': ['wasm'] })

const port = 8000;
let app = express();
app.use(express.static('dist'));

app.listen(port, () => {
  console.log('Listening on port 8000');
});
