let ball1;
let balls = [];

function setup() {
  let canvas = createCanvas(800, 500);
  canvas.parent("p5-canvas-container");
  ball1 = new Ball(0, height / 2);
  balls.push(ball1);
}

function draw() {
  background(220);
  balls[0].update();
  balls[0].display();

  textSize(24);
  text("number of balls", 20, 30);
}

class Ball {
  constructor(startX, startY) {
    this.x = startX;
    this.y = startY;
    this.xSpeed = random(1, 3);
    this.ySpeed = random(-1, 1);
    this.size = random(20, 50)
  }
  update() {
    this.x += this.xSpeed;
    // this.y += this.ySpeed;
    if (this.x >= width)
      this.x = 0;
  }
  display() {
    push();
    translate(this.x, this.y);
    fill(255, 200);
    noStroke();
    circle(0, 0, this.size)
    pop();
  }
}