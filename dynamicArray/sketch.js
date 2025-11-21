let fireWorks = [];

function setup() {
  let canvas = createCanvas(800, 500);
  canvas.parent("p5-canvas-container");
  for (let i = 0; i < 50; i++) {
    fireWorks.push(new Firework(width / 2, height / 2));
  }
}

function draw() {
  background(220);
  for (let i = 0; i < fireWorks.length; i++) {
    fireWorks[i].display();
  }

  // add new fireworks
  if (mouseIsPressed) {
    for (let i = 0; i < 3; i++) {
      fireWorks.push(new Firework(mouseX, mouseY));
    }
  }

  // if (fireWorks.length > 100) {
  //   fireWorks.splice(0, 1);
  // }

  for (let i = fireWorks.length - 1; i >= 0; i--) {
    if (fireWorks[i].isOutOfFrame) {
      fireWorks.splice(i, 1);
    }
  }

}

class Firework {
  constructor(startX, startY) {
    this.x = startX;
    this.y = startY;
    this.size = random(2, 10);
    this.hue = random(0, 360);

    this.speedX = random(-3, 3);
    this.speedY = random(-1, -3);

    this.isOutOfFrame = false;
  }
  update() {

    this.x += this.speedX;
    this.y += this.speedY;

    this.speedY += 0.1;
    this.speedX *= 0.99
    this.edgeDetection();
  }

  edgeDetection() {
    if (this.x < 0 || this.x > width || this.y < 0 || this.y > height) {
      this.isOutOfFrame = true;
    }
  }


  display() {

    push();
    translate(this.x, this.y);

    colorMode(HSB)
    fill(this.hue, 80, 100)
    noStroke();
    circle(0, 0, this.size);

    pop();
    this.update();
  }
}