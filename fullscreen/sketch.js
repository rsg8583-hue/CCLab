// open the side view and see index.html and style.css files.

function setup() {
  // keep these 3 lines as they are
  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.id("p5-canvas");
  canvas.parent("p5-canvas-container");
}

function draw() {
  noStroke();
  fill(random(255), random(255), random(255), 30);
  circle(random(width), random(height), random(10, 200));
}