const express = require('express');

const app = express();
app.use(express.static('src'));

app.get('/', function (request, response) {
    response.sendFile(__dirname + '/src/pages/index/index.html');
});

app.get('/project', function (request, response) {
    response.sendFile(__dirname + '/src/pages/project/index.html');
});

app.listen(8080);
