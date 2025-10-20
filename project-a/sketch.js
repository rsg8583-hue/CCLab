let cenX = 400;
let cenY = 250;
let xVel = 0;
let yVel = 0;
let numLimbs;

function setup() {
  createCanvas(800, 500);
  numLimbs = random(5, 10);
}

function draw() {
  drawBackground();
  drawBacteria(cenX, cenY, 50, numLimbs);
  
  if (mouseIsPressed === true)
    frameRate(100);
  else 
    frameRate(5);
  
  // Calculate direction away from mouse
  let dx = cenX - mouseX;
  let dy = cenY - mouseY;
  let distance = dist(mouseX, mouseY, cenX, cenY);
  
  // Only move away if mouse is within 300 pixels
  if (distance < 300) {
    dx /= distance;
    dy /= distance;
    
    // Add velocity away from mouse
    let force = map(distance, 0, 200, 15, 5); // Stronger when closer
    xVel += dx * force;
    yVel += dy * force;
  }
  
  // Update position
  cenX += xVel;
  cenY += yVel;
  
  // Bounce off borders with proper boundary checking
  let bacteriaRadius = 80;
  if (cenX - bacteriaRadius < 0) {
    cenX = bacteriaRadius;
    xVel = -xVel * 0.8;
  } else if (cenX + bacteriaRadius > width) {
    cenX = width - bacteriaRadius;
    xVel = -xVel * 0.8;
  }
  if (cenY - bacteriaRadius < 0) {
    cenY = bacteriaRadius;
    yVel = -yVel * 0.8;
  } else if (cenY + bacteriaRadius > height) {
    cenY = height - bacteriaRadius;
    yVel = -yVel * 0.8;
  }
}


function drawBackground() {
  background(0);
  fill(198, 255, 255);
  circle(400, 250, 700);

  // color
  for (let dia = 0; dia < 700; dia += random(10, 100)) {
    noStroke();
    fill(random(0, 255), random(0, 255), 255, 20);
    circle(400, 250, dia);
  }

  // Bubbles
  for (let i = 0; i <= random(15, 50); i++) {
    stroke(random(0, 255), random(0, 255), 255);
    fill(random(0, 255), random(0, 255), 255, 20);
    circle(random(150, 650), random(0, 500), random(10, 50));
  }

  // small particles
  for (let dia = 0; dia <= 600; dia += random(10, 100)) {
    for (let i = 0; i <= 2 * PI; i += random(0.01, 0.1)) {
      stroke(random(0, 255), random(0, 255), 255);

      let offset = map(noise(i), 0, 1, -50, 50);

      fill(random(0, 255), random(0, 255), 255, 20);
      circle(
        width / 2 + (dia / 2) * sin(i) + offset,
        height / 2 + (dia / 2) * cos(i) + offset,
        random(1, 10)
      );
    }
  }
}

function drawBacteria(x, y, r, numLimbs) {
  push();
  translate(x, y);
  drawLimbs(numLimbs);
  drawBody(x, y, r);
  pop();
}

function drawBody(x, y, r) {
  beginShape();
  for (let i = 0; i < TWO_PI; i += TWO_PI / 8) {
    let offset = random(-10, 10);
    curveVertex(cos(i) * (r + offset), sin(i) * (r + offset));
  }
  endShape(CLOSE);
}

function drawLimbs(numLimbs) {
  stroke(0, 0, 139);

  for (let i = 0; i < numLimbs; i++) {
    let baseAngle = (TWO_PI / numLimbs) * i + PI / numLimbs;
    let length = random(100, 140);
    let wiggle1 = random(-0.3, 0.3);
    let wiggle2 = random(-0.3, 0.3);
    let thickness = random(12, 18);

    // control points
    let controlX1 = cos(baseAngle + wiggle1) * random(40, 60);
    let controlY1 = sin(baseAngle + wiggle1) * random(40, 60);
    let controlX2 = cos(baseAngle + wiggle2) * random(70, 100);
    let controlY2 = sin(baseAngle + wiggle2) * random(70, 100);
    
    // end points
    let endX = cos(baseAngle) * length;
    let endY = sin(baseAngle) * length;

    // limbs
    strokeWeight(thickness);
    bezier(0, 0, controlX1, controlY1, controlX2, controlY2, endX, endY);

    // rounded tip
    fill(0, 0, 139);
    ellipse(endX, endY, random(18, 22));
  }
}