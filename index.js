const express = require('express');
const fs = require('fs');
const ffprobePath = require('@ffprobe-installer/ffprobe').path;
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');


ffmpeg.setFfprobePath(ffprobePath);
ffmpeg.setFfmpegPath(ffmpegPath);


const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use('/socket.io', express.static(path.join(__dirname, 'node_modules', 'socket.io', 'client-dist')));
// Serve the Socket.IO client library
// app.use('/socket.io', express.static(path.join(__dirname, 'node_modules', 'socket.io-client', 'dist')));




const videosPath = 'videos/';
const outputFilePath = 'public/concatenated.mp4';
const outputFilePath1 = 'public/concatenated11.mp4';

// Предварительно объединяем видео файлы при старте сервера
ffmpeg('videos/CalmDed1.mp4')
  .input('videos/CalmDed2.mp4')
  .input('videos/CalmDed3.mp4')
  .input('videos/CalmDed4.mp4')
  .input('videos/CalmDed5.mp4')
  .on('end', () => {
    console.log('Merging complete!');
  })
  .on('error', (err) => {
    console.error('Error:', err);
  })
  .mergeToFile(outputFilePath);


app.get('/', (req, res) => {
  const videoPath = 'concatenated.mp4'; // Путь к объединенному видео файлу
  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(videoPath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
    };

    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    };
    res.writeHead(200, head);
    fs.createReadStream(videoPath).pipe(res);
  }
});

// WebSocket обработчик
io.on('connection', (socket) => {
  console.log('Новое соединение');

  // Обработчик события отправки сообщения от клиента
  socket.on('sendMessage', (message) => {
    console.log('Получено сообщение от клиента:', message);
    io.emit('receivedMessage', message);
    if(message) {
      ffmpeg('videos/calm_WhatDo.mp4').
      on('end', () => {
        console.log('Merging complete!');
      })
        .on('error', (err) => {
          console.error('Error:', err);
        })
        .mergeToFile(outputFilePath1);

      io.emit('receivedMessage', { message, newVideoFileName: 'concatenated11.mp4' });

    }
    // Добавьте здесь ваш код обработки сообщения, сохранения в базе данных, отправки другим клиентам и т. д.
  });
});

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
