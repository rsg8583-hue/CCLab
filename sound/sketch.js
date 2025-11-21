let mySound;
let x = 0;
let speed = 1;
function preload() {
  mySound = loadSound("assets/sounds/song.mp3");
}

function setup() {
  let canvas = createCanvas(400, 400);
  canvas.parent("p5-canvas-container");
}

function draw() {
  background(220);
  circle(x, height / 2, 20);
  if (x < 0 || x > width) {
    speed *= -1;
  }

  x += speed;
}

function mousePressed() {
  if (mySound.isPlaying() == false) {
    mySound.play();
  } else {
    mySound.pause();
  }
}