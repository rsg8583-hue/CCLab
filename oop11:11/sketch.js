let balls = [];
let song, beep; // <----
let interacted = false;  // <------

function preload() {
  song = loadSound("assets/sounds copy/song.mp3")
  beep = loadSound("assets/sounds copy/beat.mp3")
}

function setup() {
  let canvas = createCanvas(800, 500);
  canvas.parent("p5-canvas-container");
  balls[0] = new Ball(width / 2, height / 2)
}

function mousePressed() {
  if (!interacted) {
    song.play() // <------
    interacted = true;
  } // dfghjelse {
  //   balls.push(new Ball(mouseX, mouseY))
  // }
}

function keyPressed() {
  balls.push(new Ball(mouseX, mouseY));
}

function draw() {
  background(220);

  textSize(24);
  if (interacted) {
    for (let i = 0; i < balls.length; i++) {
      balls[i].update();
      balls[i].display();
    }

    for (let i = balls.length - 1; i >= 0; i--) {
      let b = balls[i]
      if (b.isDone) {
        balls.splice(i, 1);
      }
    }

    text("number of balls: " + balls.length, width / 2, 30)
  } else {
    textAlign(CENTER);
    text("click me to interact!", width / 2, height / 2);
  }

}

class Ball {
  constructor(startX, startY) {
    this.x = startX;
    this.y = startY;
    this.xSpeed = random(-3, 3);
    this.ySpeed = random(-2, 2);
    this.size = random(20, 50);

    this.myRate = map(this.size, 20, 50, 1, 0.2);
    this.col = color(0, 0, 0);
    this.isDone = false;
  }
  update() {
    this.x += this.xSpeed;
    this.y += this.ySpeed;
    this.checkEdges();
    this.checkMouse();
  }
  checkEdges() {
    if (this.x > width || this.x < 0) {
      // horizontal collide
      this.xSpeed = -this.xSpeed;
      beep.rate(this.myRate)
      beep.play()
    }
    if (this.y > height || this.y < 0) {
      this.ySpeed = -this.ySpeed
      beep.rate(this.myRate)
      beep.play()
    }
  }
  checkMouse() {
    let d = dist(mouseX, mouseY, this.x, this.y);
    if (d < this.size / 2) {
      // mouse is in ball
      if (mouseIsPressed) {
        this.isDone = true;
      }
      this.col = color(225, 225, 0);
    } else {
      this.col = color(0, 0, 0);
    }
  }
  display() {
    push();
    translate(this.x, this.y);
    fill(this.col);
    noStroke();
    circle(0, 0, this.size)
    pop();
  }
}