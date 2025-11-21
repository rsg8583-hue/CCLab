// let cloudX = [20, 100, 750];
// let cloudY = [200, 150, 400];
// let scale = [];

let clouds = [];

function setup() {
  let canvas = createCanvas(800, 500);
  canvas.parent("p5-canvas-container");
  // cloudX = width / 2;
  // cloudY = height / 2;
  // for (let i = 0; i < cloudX.length; i++) {
  //   scale.push(random(80, 120));
  // }
  for (let i = 0; i < 10; i++) {
    clouds.push(new Cloud(random(50, 750), random(50, 450), random(50, 100)));
  }
}

function draw() {
  background(150, 125, 255);

  for (let i = 0; i < clouds.length; i++) {
    clouds[i].display();
  }
}

function mousePressed() {
  clouds.push(new Cloud(mouseX, mouseY, random(50, 100)));
}

// function drawCloud(x, y, s) {
//   push()
//   translate(x, y)
//   // rotate(frameCount * 0.05)
//   noStroke()
//   fill(200, 220, 150)
//   circle(0, 0, s)

//   for (let a = 0; a < 2 * PI; a += PI / 4) {
//     push();
//     rotate(a);
//     circle(s * 0.4, s * 0.1, s * 0.5);
//     pop();
//   }

//   // blushes
//   noStroke()
//   fill(255, 10, 255, 100)
//   ellipse(0 - s / 4, 0 + s / 20, s / 8, s / 10)
//   ellipse(0 + s / 4, 0 + s / 20, s / 8, s / 10)

//   // eyes
//   noStroke();
//   fill(0);
//   circle(0 - s / 5, 0, s / 10);
//   circle(0 + s / 5, 0, s / 10);

//   stroke(0)
//   noFill()
//   strokeWeight(s / 20)
//   arc(0, 0 + s / 10, s / 5, s / 10, 0, PI)
//   pop()
// }

class Cloud {
  constructor(x, y, s) {
    this.x = x;
    this.y = y;
    this.s = s;
    this.xSpeed = random(-2, 2);
    this.ySpeed = random(-2, 2);
    this.spin = 0;
  }

  move() {
    this.x += this.xSpeed;
    this.y += this.ySpeed;

    if (this.x < 0 || this.x > width) {
      this.xSpeed *= -1;
    }

    if (this.y < 0 || this.y > height)
      this.ySpeed *= -1;
  }

  display() {
    push()
    translate(this.x, this.y)
    rotate(frameCount * this.spin)
    noStroke()
    fill(200, 220, 150)
    circle(0, 0, this.s)

    for (let a = 0; a < 2 * PI; a += PI / 4) {
      push();
      rotate(a);
      circle(this.s * 0.4, this.s * 0.1, this.s * 0.5);
      pop();
    }

    // blushes
    noStroke()
    fill(255, 10, 255, 100)
    ellipse(0 - this.s / 4, 0 + this.s / 20, this.s / 8, this.s / 10)
    ellipse(0 + this.s / 4, 0 + this.s / 20, this.s / 8, this.s / 10)

    // eyes
    noStroke();
    fill(0);
    circle(0 - this.s / 5, 0, this.s / 10);
    circle(0 + this.s / 5, 0, this.s / 10);

    stroke(0)
    noFill()
    strokeWeight(this.s / 20)
    arc(0, 0 + this.s / 10, this.s / 5, this.s / 10, 0, PI)
    pop()

    this.move();
  }
}